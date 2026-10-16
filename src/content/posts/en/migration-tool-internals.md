---
title: "Inside a Migration Tool — One Domain, One Transaction"
date: 2026-10-16T10:00:00
summary: "What kind of program is a migration tool — the thing that moves data from an old system to a new one? Starting from why one long script always breaks, then: how to split the work into units, how the run order gets decided, how far a failure rolls back, and how to make it safe to run again and again."
tags: ["アーキテクチャ", "設計", "Go"]
level: intermediate
lang: en
translationKey: migration-tool-internals
---

Moving data from an old system to a new one was covered [separately](/en/posts/data-migration/).
This post is about **the program that does the moving**, and what structure makes it safe to run in
production.

## What a migration tool actually does

Only three things. **Read from the old DB → reshape → load into the new DB.**

```text
   Old DB (read only)        Migration tool (Go CLI)        New DB (destination)
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ app_user         │      │ ① read           │      │ users            │
│ app_order        │ ───> │ ② reshape        │ ───> │ orders           │
│ app_order_line   │      │ ③ load           │      │ order_items      │
└──────────────────┘      └──────────────────┘      └──────────────────┘
   never written to                                   rebuildable anytime
```

What "reshape" means concretely, for a single order row:

| Old `app_order` column | Old value | New `orders` column | New value | What happens |
| --- | --- | --- | --- | --- |
| `uuid` | `a1b2c3…` | `id` | `a1b2c3…` | carried through as-is |
| `state` | `WaitingPayment` | `status` | `WAITING_PAYMENT` | enum converted via a map |
| `price` | `3000` | `amount` | `3000` | carried through as-is |
| `memo` | `''` (empty string) | `memo` | `NULL` | empty string given a meaning |
| (doesn't exist) | — | `currency` | `JPY` | new required column filled in |

**Every row gets these decisions applied and is rebuilt.** With 50 tables you have 50 of these
tables. That is what a migration tool is made of.

> 💡 A migration tool runs **once in production** but **dozens of times while you build it** —
> rehearsals, retries, tests. The right framing isn't "it runs once so it can be sloppy", it's
> "**it runs dozens of times so it must be hard to break**".

## The obvious shape, and where it breaks

Written plainly, it becomes one function walking every table top to bottom.

```go
func main() {
	migrateUsers()      // load users
	migrateProducts()   // load products
	migrateOrders()     // load orders (needs users and products first)
	migrateOrderItems() // load order_items (needs orders first)
	// ... 50 more lines
}
```

It works. It also fails in four predictable ways.

**① The ordering rule exists only as line order**

`migrateOrders()` assumes `users` is already loaded, but that assumption is written nowhere.
Reorder the lines and you find out from a foreign-key error.

**② You can't redo one part**

"I fixed the `orders` transformation, reload just that" is impossible — running `main()` runs
everything. If all 50 tables take two hours, every one-character fix costs two hours.

**③ Failure recovery is all-or-nothing**

Wrap everything in one transaction and nothing is final until the very end (a failure throws away
hours of work). Use no transaction and **half-loaded state stays behind**. Neither is workable.

**④ You can't write tests**

Connections, config, transformation, and loading are mixed into one function. Checking that
`WaitingPayment` becomes `WAITING_PAYMENT` requires a real database.

All four have one cause: **the work isn't split**. So the rest of this post is about how to split it.

## Split the work into domains

Is one table the right unit? Too small — `orders` loaded without `order_items` is useless to the
business.

The unit is **the group of tables that only makes sense moved together**. Call it a domain.

```text
order domain = { orders, order_items, order_payments }
user  domain = { users, user_addresses }
```

Each domain is a type with exactly three methods.

```go
// Migrator is implemented by each domain.
type Migrator interface {
	Name() Name                                         // ① its own name
	Dependencies() []Name                               // ② domains that must come first
	Run(ctx context.Context, in Inputs) (Result, error) // ③ the body
}
```

How to read it:

- **① `Name()`** — a short name like `"order"`, also the value you pass to `--domain order`
- **② `Dependencies()`** — the domain **declares for itself** which domains must be loaded before it.
  This pays off in the next section
- **③ `Run()`** — read, transform, load. `Result` carries "how many rows read, how many written"

One package per domain, exposing only `New()`.

```go
func New() domain.Migrator { return &migrator{} }

type migrator struct{} // empty — it holds no state

func (m *migrator) Name() domain.Name { return "order" }

// orders has foreign keys to users(id) and products(id), so both must come first.
func (m *migrator) Dependencies() []domain.Name { return []domain.Name{"user", "product"} }
```

`Inputs` hands `Run()` **every tool it needs, as arguments**.

```go
type Inputs struct {
	SourcePG *pgxpool.Pool // connection to the old DB (read-only)
	TargetTx pgx.Tx        // new DB transaction, already begun by the caller
	Logger   *slog.Logger  // logger with the domain name attached
	Options  RunOptions    // CLI flags such as DryRun
}
```

> 💡 The important part is **no global variables and no `init()` self-registration**. "Which domains
> run" sits in one explicit list in `main`, readable at a glance, and tests can pass in whichever
> domains they want.

> 🧭 In C# you'd be tempted to auto-register `IMigrator` in a DI container. But for a migration tool
> **the list of what gets migrated is itself the specification**, so a hand-written list in `main`
> beats assembly scanning — and a test can diff that list against the directory to catch omissions.

## Let the declarations decide the run order

Once every domain declares `Dependencies()`, **the program can compute the order**. Nobody writes it
down.

Collect the declarations and you get a directed graph:

```text
user ────┐
         ├──> order ──> payment
product ─┘

(arrows mean "this one first": payment waits on order, order waits on user and product)
```

Deriving an order from that graph is a **topological sort**. The idea is simple:

1. For each domain, count **how many others it is waiting on** (`user` = 0, `order` = 2, `payment` = 1)
2. Put the **zeros** in a queue → `user`, `product`
3. Pop one, and decrement the count of everyone who was waiting on it
4. Anything that hits zero joins the queue → `order` drops to 0 and goes in
5. Repeat until the queue is empty

In code (Kahn's algorithm):

```go
func topoSort(targets []domain.Migrator) ([]domain.Migrator, error) {
	indegree := map[domain.Name]int{}        // how many others this domain waits on
	graph := map[domain.Name][]domain.Name{} // dependency -> domains waiting on it

	for _, m := range targets {
		if _, ok := indegree[m.Name()]; !ok {
			indegree[m.Name()] = 0
		}
		for _, dep := range m.Dependencies() {
			graph[dep] = append(graph[dep], m.Name())
			indegree[m.Name()]++ // one more thing to wait for
		}
	}

	ready := readyNames(indegree) // the zeros, sorted by name
	var out []domain.Migrator
	for len(ready) > 0 {
		n := ready[0]
		ready = ready[1:]
		out = append(out, byName[n])

		for _, next := range graph[n] {
			indegree[next]-- // one of its blockers is done
			if indegree[next] == 0 {
				ready = insertSorted(ready, next) // insert keeping sort order
			}
		}
	}

	if len(out) != len(targets) {
		// couldn't drain the queue = the rest are waiting on each other (a cycle)
		return nil, errors.New("cyclic dependency")
	}
	return out, nil
}
```

Two small details that matter a lot:

- **Break ties within a layer by name.** `user` and `product` can go in either order, but iterating a
  Go map directly gives **a different order on every run** (Go randomizes map iteration on purpose).
  A migration lives on "same result as last time", so pin the order
- **Reject cycles before running.** If fewer nodes come out than went in, the rest are waiting on each
  other. "A waits for B, B waits for A" is a declaration bug — stop before touching any data

> ⚠️ When a single domain is requested (`--domain order`), **do not pull its dependencies in
> automatically**. "I meant to reload `order` and it rebuilt `user` too" is the scariest accident, so
> dependencies missing from the input are ignored by the sort and reported as an error at run time.

## How far does a failure roll back?

A **transaction** is the database mechanism for "everything in here either all succeeds or never
happened". In a migration, **choosing its boundaries is the design**.

Three options; take the middle one.

| Scope | On failure | Problem |
| --- | --- | --- |
| One for all domains | everything disappears (clean) | two hours of work lost to the last row |
| **One per domain** | **only that domain disappears** | **← this one** |
| One per table | only that table disappears | leaves `orders` loaded with no `order_items` |

The implementation detail: **`Run()` never begins or commits**. The caller (the orchestrator) begins
the transaction and lends it as `Inputs.TargetTx`.

```go
func runDomain(ctx context.Context, m domain.Migrator, pool *pgxpool.Pool) domain.Result {
	tx, err := pool.Begin(ctx) // ① the caller begins
	if err != nil {
		return failed(m, err)
	}
	defer func() { _ = tx.Rollback(ctx) }() // ② book the rollback up front

	result, runErr := m.Run(ctx, domain.Inputs{TargetTx: tx /* ... */}) // ③ lend it
	if runErr != nil {
		return failed(m, runErr) // ②'s rollback fires here
	}

	if err := tx.Commit(ctx); err != nil { // ④ the caller commits
		return failed(m, err)
	}
	return result
}
```

> 💡 Writing ②'s `defer tx.Rollback(ctx)` **unconditionally, even on the success path**, is the Go
> idiom. Rolling back an already-committed transaction is a no-op, so you never have to sprinkle
> rollbacks across every error path.

> 🧭 Same division of labor as `TransactionScope` / `DbContext` in C#. The stricter you are that
> **the borrower never commits**, the more failure handling stays in one place in the caller.

## Make repeat runs safe (idempotency)

You will run this tool many times. A tool that **loads twice as much data when run twice** is one
nobody dares re-run after a failure. The property "running it repeatedly gives the same result" is
called **idempotency**.

The simplest way to get it: **each domain empties its own tables, then loads them again**.

```go
func (m *migrator) Run(ctx context.Context, in domain.Inputs) (domain.Result, error) {
	// Empty, then reload — inside the same transaction.
	// A failure rolls back the TRUNCATE too, so you never end up with data simply gone.
	if err := pgio.TruncateCascade(ctx, in.TargetTx, "orders", "order_items"); err != nil {
		return domain.Result{}, err
	}
	// ... read, transform, load with COPY
}
```

You could instead apply differences with `UPSERT` ("update if present, insert if not"), but for a
migration, **wipe and reload** is faster and the resulting state is easier to reason about — nobody
is using the new database yet, so there is nothing to preserve.

Load with `COPY`, not row-by-row `INSERT`.

```text
500,000 INSERTs → one round trip to the database per row. slow
COPY, 500,000 rows → one stream, sent in bulk. dramatically faster
```

And build `--dry-run` (run without writing) so that it skips `COPY` but **still runs the whole
transformation and returns the count**. That tells you whether the transformation is broken without
writing a single row.

```go
func CopyRows(ctx context.Context, tx pgx.Tx, table string, columns []string,
	src pgx.CopyFromSource, dryRun bool) (int64, error) {
	if dryRun {
		return drainCopySource(src) // drain to the end, just count
	}
	return tx.CopyFrom(ctx, pgx.Identifier{table}, columns, src)
}
```

> ⚠️ During a bulk load you may **not be able to rely on database constraints**. PostgreSQL's
> `SET session_replication_role = replica` — commonly used to silence audit triggers — **silences
> foreign-key checks at the same time**. "Bad rows can't get in because the database rejects them"
> stops being true, so move integrity checking into the post-migration verification phase
> ([preflight / migrate / validate](/en/posts/preflight-migrate-validate/)).

## Wrap-up

- A migration tool is a pile of "**read a row, rebuild it as a new row**" logic. One mapping table per
  database table
- The unit is **a domain, not a table** (the group that only makes sense moved together). An interface
  of just `Name` / `Dependencies` / `Run` buys you partial runs and testability
- **Compute the order, don't write it.** Topological sort over the declared dependencies, ties broken
  by name so every run is identical
- **The caller begins the transaction and lends it.** One domain per transaction is the right
  rollback window
- **Wipe, then `COPY`** for idempotency. Only when repeated runs give the same result can you choose
  "stop, fix, run again" in production

## Next

How to map old IDs onto new ones — keep the value, or keep a mapping table — is in
[ID Mapping in a Migration](/en/posts/id-mapping-in-migration/).
