---
title: "ID Mapping in a Migration — Keep the Old ID, or Keep a Mapping Table"
date: 2026-10-16T11:00:00
summary: "The first mapping decision in a migration isn't column correspondence, it's what happens to IDs. When to reuse old IDs as-is versus re-issue them and keep a mapping table, where to put that table and how to read it, what breaks when the mapping stops being one-to-one, and how enum mapping differs — in Go."
tags: ["データベース", "設計", "Go"]
level: intermediate
lang: en
translationKey: id-mapping-in-migration
---

[Inside a Migration Tool](/en/posts/migration-tool-internals/) covered the skeleton that reads and
loads per domain. This post is about the part that goes wrong most often — **how old IDs become
new IDs**.

## Decide the IDs before the columns

That old `name` maps to new `full_name` is fixable later. IDs are not. **Changing an ID changes the
transformation rule for every table that references it.**

There are only two options.

| Approach | What it is | When it fits |
| --- | --- | --- |
| **Keep the value** | Load the old primary key as the new primary key | Old is UUID, new is UUID, granularity unchanged |
| **Re-issue** | Mint a new ID in the new system (UUID v7, etc.) | Old is a sequence or composite key, or two old rows become one new row |

**Default to keeping the value.** No mapping table is needed, so child tables just write the old
foreign-key value through. And when a strange row turns up in production later, you can look up the
same ID in the old database.

Re-issue only where keeping the value is impossible. The classic case is **granularity changing** —
if two old rows collapse into one new row, keeping either old ID is a lie.

> ⭐ This does not have to be uniform. **It is decided per table.** Normally one or two tables get new
> IDs and everything else keeps its value.

## If you re-issue, where does the mapping live

For a re-issued table, child tables must translate the old foreign key into the new ID. Put that
mapping in **a table in the target database**, not in process memory.

```sql
CREATE TABLE _idmap_shifts (
    old_id     TEXT NOT NULL PRIMARY KEY,
    new_id     UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Three reasons for the database.

- **It crosses domains**: the parent and the children load in different transactions. In memory you
  would need coupling just to hand it over
- **It survives re-runs**: redo only the children without reloading the parent
- **Verification can use it**: afterwards you can match "distinct destinations in the mapping" against
  "rows in the new table" in SQL

Write it **in the same transaction as the parent load**. Split them and you can end up with the
parent loaded and the mapping empty.

```go
// Inside the parent domain's Run: mint and record in the same tx.
newID, err := uuid.NewV7()
if err != nil {
	return err
}
if err := idmap.Insert(ctx, in.TargetTx, oldID, newID.String()); err != nil {
	return err
}
```

> ⚠️ Create the table with **`DROP` then `CREATE`**, not `CREATE TABLE IF NOT EXISTS`. Its contents
> are replaced wholesale alongside the real table, so there is nothing worth keeping — and with
> `IF NOT EXISTS` **a stale definition from a previous run survives forever**. Change a constraint and
> it never reaches environments that already have the table.

> 💡 Prefix it with `_` so it reads as distinct from business tables. Something you will `DROP TABLE`
> after cutover is better off saying so in its name.

## Two ways to read it — one at a time, or all at once

The child side looks up the mapping and substitutes the new ID. The obvious version:

```go
// One round trip per row.
func Lookup(ctx context.Context, tx pgx.Tx, oldID string) (string, error) {
	const sql = "SELECT new_id::text FROM _idmap_shifts WHERE old_id = $1"
	var newID string
	err := tx.QueryRow(ctx, sql, oldID).Scan(&newID)
	return newID, err
}
```

Fine up to tens of thousands of child rows. **Past a few hundred thousand, round trips dominate the
runtime.** When parents are far fewer than children, read the whole mapping once at start and resolve
from a map in memory.

```go
// Once at start; resolve in memory afterwards.
func LoadAll(ctx context.Context, q RowsQuerier) (map[string]string, error) {
	rows, err := q.Query(ctx, "SELECT old_id, new_id::text FROM _idmap_shifts")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[string]string{}
	for rows.Next() {
		var oldID, newID string
		if err := rows.Scan(&oldID, &newID); err != nil {
			return nil, err
		}
		out[oldID] = newID
	}
	return out, rows.Err()
}
```

Decide on **parent count** (does it fit in memory) and **child count** (do round trips hurt). With
70k parents and 400k children, one bulk read of 70k beats 400k round trips by a wide margin.

> ⚠️ When a lookup misses, **stop there rather than falling back to a default**. A child pointing at a
> parent that isn't in the mapping means the selection criteria and the parent's load conditions
> disagree; silently writing `NULL` makes that untraceable after the fact.

## The mapping is not necessarily one-to-one

This is the part that bites later. Once **merging** appears — two old rows becoming one new row —
the mapping becomes many-to-one.

```sql
-- Two old rows point at the same new_id, so new_id cannot be UNIQUE.
old_id = 'shift-a-2026-01-05' → new_id = '019...e7'
old_id = 'shift-b-2026-01-05' → new_id = '019...e7'
```

It shows up in three places.

- **Constraints**: drop the `UNIQUE` on `new_id`. Add merging while it is still there and the load fails
- **Verification**: compare the new table's row count against `COUNT(DISTINCT new_id)`, not
  `COUNT(*)`. Forget this and the counts stay off by exactly the merged rows, warning forever
- **Indexes**: even with no lookup path from `new_id`, keep an index on it — verification counts
  distinct values

The merge table itself (which row is the same entity as which) is usually **built by hand**.

```yaml
# Don't derive it mechanically from names. A rule that "almost always works" is the danger.
pairs:
  - old: "11111111-1111-1111-1111-111111111111"
    main: "22222222-2222-2222-2222-222222222222"
```

A rule like "strip the prefix and match the rest" will hit 33 out of 34 and miss one. The miss
**does not error — it quietly lands on the wrong destination**. So use a table rather than a rule,
and **have a pre-flight check fail on anything missing from the table**.

> ⭐ Once merging exists, **every path that writes the new ID must go through `Resolve`**. Miss one
> and that path alone keeps the pre-merge ID, breaking composite foreign keys.

```go
// Return the merge target for a merged-away ID; otherwise return the input unchanged.
func (m *Map) Resolve(id string) string {
	if m == nil {
		return id // nil-safe, so callers need no branch
	}
	if main, ok := m.toMain[normalize(id)]; ok {
		return main
	}
	return id
}
```

## The other kind of mapping — enum values

Beyond IDs you need an **enum value mapping**. Old side stored by Java's `@Enumerated(STRING)` as
`PascalCase`, new side a `CHECK` constraint over `UPPER_SNAKE_CASE`, is a common pairing.

What differs from ID mapping is **what happens on an unknown value**.

```go
// An unmapped legacy value is an error. Never fall back to a default.
type MissingError struct {
	EnumKey  string
	OldValue string
}

func (e *MissingError) Error() string {
	return fmt.Sprintf("enum %q: unknown legacy value %q", e.EnumKey, e.OldValue)
}
```

Fall back to a default and **every value that exists only in production data collapses into one
category and the run completes**. Nothing errors, so you find out once the business is live.

And detect unknown values **before loading starts**. `SELECT DISTINCT` on the old column, matched
against the map's keys, answers it in seconds. Aborting on an unknown value after streaming five
million rows loses exactly that much time.

> 🧭 C#'s `Enum.TryParse` is case-sensitive by default and reports failure as a `bool`. In a migration
> the point is **not to swallow that `false`** — discard the return value and you write `default(T)`,
> the first member. Always log the one row that failed to convert, with its identifier.

## Wrap-up

- **Default to keeping the value** (old ID as new ID). Re-issue only for tables whose granularity
  changes, which keeps the mapping surface minimal
- Put the mapping in **a table in the target database** — usable across domains, across re-runs, and
  during verification
- Choose the read strategy by **parent and child counts**. Past a few hundred thousand children, stop
  doing one round trip per row
- Merging makes the **mapping many-to-one**. Drop the `UNIQUE` and switch verification to
  `COUNT(DISTINCT new_id)`
- **Unknown enum values stop the run** rather than falling back — and they get caught in a pre-flight
  check, before anything is loaded

## Next

How to confirm with numbers that the data landed correctly is in
[preflight / migrate / validate](/en/posts/preflight-migrate-validate/) and
[Testing a Migration](/en/posts/migration-testing/).
