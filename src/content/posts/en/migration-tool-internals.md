---
title: "Inside a Migration Tool — One Domain, One Transaction"
date: 2026-10-16T10:00:00
summary: "Data migration seen not as \"what to move\" but as \"how to build the tool\". Instead of a pile of per-table scripts, make each migration unit an interface, let it declare its dependencies, derive the run order by topological sort, and keep transaction boundaries in the caller. Walking that structure through Go code."
tags: ["アーキテクチャ", "設計", "Go"]
level: intermediate
lang: en
translationKey: migration-tool-internals
---

Moving data from an old system to a new one was covered [separately](/en/posts/data-migration/).
This post is about the **implementation** — what kind of program the migration tool itself should be.
The setting: a CLI that reads an old PostgreSQL and loads a new one.

## Why one giant script falls apart

The first thing you want to write is a single script that walks every table top to bottom. It is
fast only at the start, and then runs into four things.

- **Order becomes implicit**: "`users` must exist before `orders`" lives nowhere but the line order
  of the code. Reorder it and foreign keys blow up
- **No partial runs**: "just redo `orders`" is impossible, so you re-run everything every time
- **Rollback is all-or-nothing**: one giant transaction commits nothing until the very end; no
  transaction at all leaves half-loaded state behind
- **Untestable**: connection, config, transformation, and loading mixed into one function means you
  cannot verify the transformation alone

Every fix points the same way: **split the migration into units and make the units declare their
relationships**.

## Make the unit an interface

The right unit is not one table but a **domain** — the group of tables that only makes sense moved
together. `orders` and `order_items` are useless apart.

```go
// Migrator is implemented by each domain.
type Migrator interface {
	Name() Name
	// Dependencies lists domains this one depends on via foreign keys.
	Dependencies() []Name
	// Run completes the load inside in.TargetTx and returns its counts.
	Run(ctx context.Context, in Inputs) (Result, error)
}
```

One package per domain, exposing only `func New() Migrator`.

```go
func New() domain.Migrator { return &migrator{} }

type migrator struct{}

func (m *migrator) Name() domain.Name           { return "order" }
func (m *migrator) Dependencies() []domain.Name { return []domain.Name{"user", "product"} }
```

`Inputs` carries **every dependency as an argument** — connections, transaction, logger.

```go
type Inputs struct {
	SourcePG *pgxpool.Pool // read-only pool for the old DB
	TargetTx pgx.Tx        // transaction the caller already began
	Logger   *slog.Logger  // domain name already attached
	Options  RunOptions    // DryRun / BatchSize, from CLI flags
}
```

> 💡 The payoff is avoiding package variables and `init()` self-registration. "Which domains run"
> lives in exactly one explicit list in `main`, and tests can hand in any combination of Migrators.

> 🧭 In C# you would reach for auto-registering `IMigrator` in a DI container. For a migration tool
> the **list of targets is itself the specification**, so a hand-written list in `main` beats
> assembly scanning — a test can diff that list against the packages on disk and catch omissions.

## Derive the order from the declarations

Once each domain declares `Dependencies()`, the run order is computed rather than written down —
a topological sort (Kahn's algorithm), pulling nodes whose in-degree is zero.

```go
func topoSort(targets []domain.Migrator) ([]domain.Migrator, error) {
	indegree := map[domain.Name]int{}        // how many dependencies this domain waits on
	graph := map[domain.Name][]domain.Name{} // dependency -> domains waiting on it

	for _, m := range targets {
		if _, ok := indegree[m.Name()]; !ok {
			indegree[m.Name()] = 0
		}
		for _, dep := range m.Dependencies() {
			graph[dep] = append(graph[dep], m.Name())
			indegree[m.Name()]++
		}
	}

	ready := readyNames(indegree) // in-degree 0, sorted by name
	var out []domain.Migrator
	for len(ready) > 0 {
		n := ready[0]
		ready = ready[1:]
		out = append(out, byName[n])
		for _, next := range graph[n] {
			indegree[next]--
			if indegree[next] == 0 {
				ready = insertSorted(ready, next) // keep the queue sorted
			}
		}
	}
	if len(out) != len(targets) {
		return nil, errors.New("cyclic dependency") // leftovers wait on each other
	}
	return out, nil
}
```

Two things matter here.

- **Break ties within a layer by name**. Go's map iteration order is randomized, so without this the
  order changes on every run. For a tool you run once in production, **the same order every time** is
  what reproducibility rests on
- **Cycles are an error**. If fewer nodes come out than went in, the rest are waiting on each other

> ⚠️ When running a single domain (`--domain order`), **do not pull its dependencies in
> automatically**. "I meant to load `order` and it rebuilt `user` too" is the scariest accident, so
> dependencies absent from the input are ignored by the sort and reported at run time instead.

## The caller owns the transaction boundary

`Run` never calls `Begin` or `Commit`. The orchestrator **opens the transaction and lends it** as
`Inputs.TargetTx`.

```go
func runDomain(ctx context.Context, m domain.Migrator, pool *pgxpool.Pool, ...) domain.Result {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return failed(m, started, err)
	}
	defer func() { _ = tx.Rollback(ctx) }() // no-op once committed

	result, runErr := m.Run(ctx, domain.Inputs{TargetTx: tx, ...})
	if runErr != nil {
		return failed(m, started, runErr) // the deferred Rollback fires
	}
	if err := tx.Commit(ctx); err != nil {
		return failed(m, started, err)
	}
	return result
}
```

This pins the granularity at **one domain, one transaction** — a smaller rollback window than one
transaction for everything, and less half-loaded state than committing per table.

> 💡 Writing `defer tx.Rollback(ctx)` unconditionally is the idiom. Rolling back a committed
> transaction is a no-op, so you never have to branch per error path.

> 🧭 Same division of labor as `TransactionScope` / `DbContext` in C#. The stricter you are that the
> borrower never commits, the more the caller can decide failure handling in one place.

## Make it idempotent — TRUNCATE, then COPY

A migration tool always runs many times: rehearsals, retries, production. A tool that **loads twice
as much when run twice** is one nobody dares re-run after a failure.

The simplest idempotency is for each domain to empty its own tables and load them again. It is
faster than diffing with `UPSERT` and the resulting state is easier to reason about.

```go
func (m *migrator) Run(ctx context.Context, in domain.Inputs) (domain.Result, error) {
	// TRUNCATE and COPY in the same transaction: a failure rolls back both.
	if err := pgio.TruncateCascade(ctx, in.TargetTx, "orders", "order_items"); err != nil {
		return domain.Result{}, err
	}
	...
}
```

Load with `COPY FROM STDIN` rather than row-by-row `INSERT`. For dry runs, skip that call but
**still run the transformation to completion and return the count** — you surface conversion
failures without writing anything.

```go
func CopyRows(ctx context.Context, tx pgx.Tx, table string, columns []string,
	src pgx.CopyFromSource, dryRun bool) (int64, error) {
	if dryRun {
		return drainCopySource(src) // drain and count only
	}
	return tx.CopyFrom(ctx, pgx.Identifier{table}, columns, src)
}
```

> ⚠️ During a bulk load you may **not be able to rely on database constraints**. Using
> `SET session_replication_role = replica` in PostgreSQL to silence audit triggers also silences
> foreign-key check triggers. "The database will reject bad rows" stops being true, so **move the
> integrity checks into the post-migration verification phase**
> ([preflight / migrate / validate](/en/posts/preflight-migrate-validate/)).

## Wrap-up

- Build the tool as **a set of interfaces keyed on domains**, not per-table scripts — partial runs,
  testability, and ordering all follow from that
- **Compute the run order from `Dependencies()`**, not from the order of lines. Break ties by name
  for reproducibility and treat cycles as errors
- **The caller opens and lends the transaction.** One domain per transaction balances rollback scope
  against half-loaded state
- **TRUNCATE then COPY for idempotency.** Only when repeated runs produce the same result can you
  choose "stop, fix, resume" in production
- Bulk loading can disable constraint checks. **"It loaded" and "it is correct" need separate gates**

## Next

How to map old IDs onto new ones — keep the value, or keep a mapping table — is in
[ID Mapping in a Migration](/en/posts/id-mapping-in-migration/).
