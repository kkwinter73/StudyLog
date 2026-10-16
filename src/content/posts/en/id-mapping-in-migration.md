---
title: "ID Mapping in a Migration — Keep the Old ID, or Keep a Mapping Table"
date: 2026-10-16T11:00:00
summary: "The first thing a data migration decides isn't column correspondence — it's what happens to IDs. When to reuse old IDs versus mint new ones and keep a mapping table, where to put that table and how to read it, what breaks the moment two rows become one, and how enum conversion differs."
tags: ["データベース", "設計", "Go"]
level: intermediate
lang: en
translationKey: id-mapping-in-migration
---

[Inside a Migration Tool](/en/posts/migration-tool-internals/) covered the skeleton that reads and
loads per domain. This post is about **the part that goes wrong most often** — turning old IDs into
new ones.

## Why IDs get special treatment

That old `name` maps to new `full_name` is fixable later if you get it wrong. **An ID is not**,
because other tables point at it.

```text
Old DB                             New DB
┌────────────────┐                ┌────────────────┐
│ app_user       │                │ users          │
│  uuid = U-001  │ ←──┐           │  id = ???      │ ←──┐
└────────────────┘    │ refs       └────────────────┘    │ refs
┌────────────────┐    │           ┌────────────────┐    │
│ app_order      │    │           │ orders         │    │
│  user_uuid ────┼────┘           │  user_id ──────┼────┘
└────────────────┘                └────────────────┘
```

Change `users.id` and you change what goes into `orders.user_id`. With ten referencing tables, ten
transformation rules change. **How you decide IDs is the premise every other conversion rests on.**

There are only two options.

| Approach | What it does | When it fits |
| --- | --- | --- |
| **Keep the value** | Load the old primary key as the new primary key | Old and new are both UUID; one row stays one row |
| **Re-issue** | Mint a new ID in the new system (UUID v7, etc.) | Old is a sequence or composite key / two old rows become one |

**Default to keeping the value.** No mapping table is needed, so child tables just write the old
foreign-key value straight through. And when a strange row shows up in production later, **you can
look up the same ID in the old database** — that matters enormously when investigating.

Re-issue only where keeping the value is physically impossible. The classic case is **granularity
changing**: if two old rows collapse into one new row, keeping either old ID is a lie.

> ⭐ This does not have to be uniform. **It's decided per table.** Typically one or two of fifty
> tables get new IDs and everything else keeps its value.

## If you re-issue, where does the mapping live?

For a re-issued table, **child tables must translate the old foreign key into the new ID**.

```text
① loading the parent           ② loading the children
   read old S-001                 the entry's shift_uuid = S-001
   → mint new ID 019…e7           → look it up → 019…e7
   → record it in the mapping     → write 019…e7 into shift_id
```

Put that mapping in **a table inside the new database**, not in program memory.

```sql
CREATE TABLE _idmap_shifts (
    old_id     TEXT NOT NULL PRIMARY KEY, -- the old ID (TEXT, since it isn't always a UUID)
    new_id     UUID NOT NULL,             -- the newly minted ID
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Three reasons for the database:

- **It crosses domains** — the parent and the children load in different transactions. Passing it in
  memory creates coupling that exists only for the hand-off
- **It survives re-runs** — "reload only the children" works without reloading the parent
- **Verification can use it** — afterwards you can match "distinct destinations in the mapping"
  against "rows in the new table" in SQL

Write it **in the same transaction as the parent load**. Split them and you can end up with the
parent loaded and the mapping empty.

```go
// Inside the parent domain's Run: mint and record in the same tx.
newID, err := uuid.NewV7() // time-ordered UUID, friendlier to indexes
if err != nil {
	return err
}
if err := idmap.Insert(ctx, in.TargetTx, oldID, newID.String()); err != nil {
	return err
}
```

> ⚠️ Create it with **`DROP` then `CREATE`**, not `CREATE TABLE IF NOT EXISTS`. Its contents are
> replaced wholesale along with the real table, so there's nothing worth keeping — and worse, with
> `IF NOT EXISTS` **a stale definition from a previous run survives forever**, so a constraint change
> never reaches any environment that already has the table.

> 💡 Prefixing the name with `_` keeps it visibly distinct from business tables. Something you will
> `DROP TABLE` after cutover is better off saying so in its name.

## Two ways to read the mapping

The child side looks the ID up and substitutes the new one. The obvious version:

```go
// One round trip to the database per row.
func Lookup(ctx context.Context, tx pgx.Tx, oldID string) (string, error) {
	const sql = "SELECT new_id::text FROM _idmap_shifts WHERE old_id = $1"
	var newID string
	err := tx.QueryRow(ctx, sql, oldID).Scan(&newID)
	return newID, err
}
```

Fine up to tens of thousands of child rows. **Past a few hundred thousand, the round trips dominate
the runtime.** When parents are far fewer than children, read the whole mapping once at start and
resolve from an in-memory `map`.

```text
70,000 parents / 400,000 children

Lookup  → 400,000 round trips
LoadAll → one round trip loading 70,000 rows into a map → resolved in memory afterwards
```

```go
// Called once at start; everything after that reads this map.
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

Only two inputs to the decision: **parent count** (does it fit in memory) and **child count** (do
round trips hurt).

> ⚠️ When a lookup misses — a child points at an ID that isn't in the mapping — **stop right there
> instead of substituting a default**. It means the migration's filtering criteria and the parent's
> load conditions disagree, and silently writing `NULL` makes that untraceable once the migration is
> done.

## When "one-to-one" stops holding

This is what bites later. **Merging** — two old rows turn out to be the same thing, so the new system
keeps one — makes the mapping **many-to-one**.

```text
old S-001 ─┐
           ├──> new 019…e7   (two old rows → one new row)
old S-002 ─┘
```

It surfaces in three places, each one a spot where "assumed one-to-one" code breaks.

| Place | Written for one-to-one | Once it's many-to-one |
| --- | --- | --- |
| Constraint | `UNIQUE` on `new_id` | **drop it** (otherwise the load fails) |
| Verification | compare `COUNT(*)` with the new table's rows | compare **`COUNT(DISTINCT new_id)`** |
| Index | not needed, nothing reads by `new_id` | **keep one** — verification counts distinct values |

And the table of **which row is the same thing as which** is usually built by hand.

```yaml
# Don't derive it mechanically from names. A rule that "almost always works" is the danger.
pairs:
  - old: "11111111-1111-1111-1111-111111111111"
    main: "22222222-2222-2222-2222-222222222222"
```

A rule like "strip the prefix and match the rest" will hit 33 out of 34 and miss one — and **the miss
doesn't error, it quietly lands on the wrong destination**. So use a table, not a rule, and **fail a
pre-migration check on anything missing from the table**.

> ⭐ Once merging exists, **every path that writes the new ID must go through `Resolve`**. Miss one
> and that path alone keeps the pre-merge ID, breaking multi-column foreign keys.

```go
// Return the merge target for a merged-away ID; otherwise return the input unchanged.
func (m *Map) Resolve(id string) string {
	if m == nil {
		return id // works with no table at all (nil-safe), so callers need no branch
	}
	if main, ok := m.toMain[normalize(id)]; ok {
		return main
	}
	return id
}
```

## The other kind of mapping — enum values

Besides IDs you need an **enum mapping**. Old side storing `PascalCase` strings like
`WaitingPayment`, new side using `UPPER_SNAKE_CASE` like `WAITING_PAYMENT`, is a common pairing.

What makes it different from ID mapping is **what happens on a value you don't know**.

```go
// An unmapped legacy value is an error. Never fall back to a default.
type MissingError struct {
	EnumKey  string // which enum this is about ("order_status", etc.)
	OldValue string // the unknown value found in the old database
}

func (e *MissingError) Error() string {
	return fmt.Sprintf("enum %q: unknown legacy value %q", e.EnumKey, e.OldValue)
}
```

Why a default is wrong: **every value that exists only in production data collapses into one category
and the run completes**. Nothing errors, so you find out after the business is live — and by then you
can't tell which rows were flattened.

Also, detect unknown values **before loading starts**. `SELECT DISTINCT` on the old column, matched
against the map's keys, answers it in seconds.

```sql
-- Seconds to learn what's actually in the old database
SELECT DISTINCT state FROM app_order;
```

Aborting on an unknown value after streaming five million rows loses exactly that much time. **Don't
spend hours learning something that takes seconds.**

> 🧭 C#'s `Enum.TryParse` reports failure as a `bool`. In a migration the point is **not to swallow
> that `false`** — ignore the return value and `default(T)`, the first member, gets written silently.
> Always log the row that failed to convert, in a form that identifies which row it was.

## Wrap-up

- **How you decide IDs is the premise for every other conversion.** Settle it before column mapping
- **Default to keeping the value.** Re-issue only for tables whose granularity changes, so the mapping
  surface stays minimal
- Put the mapping in **a table in the new database**, written in the same transaction as the parent.
  Usable across domains, across re-runs, and during verification
- Choose the read strategy from **parent and child counts**. Past a few hundred thousand children,
  stop doing one round trip per row
- Merging makes the **mapping many-to-one**. Drop the `UNIQUE`, switch verification to
  `COUNT(DISTINCT new_id)`
- **Unknown enum values stop the run** rather than falling back — and they get caught before any
  loading starts

## Next

How to confirm with numbers that the data landed correctly is in
[preflight / migrate / validate](/en/posts/preflight-migrate-validate/) and
[Testing a Migration](/en/posts/migration-testing/).
