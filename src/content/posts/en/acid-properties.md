---
title: "ACID Properties — The Four Guarantees a Transaction Upholds"
date: 2026-07-01T14:00:00
summary: "What keeps a DB transaction from breaking halfway, mixing with others, or vanishing is the four properties: Atomicity, Consistency, Isolation, and Durability. We cover what each means and the isolation levels that matter most in practice."
tags: ["データベース", "基礎"]
level: intermediate
lang: en
translationKey: acid-properties
---

Treating multiple updates as "all of them or none of them" is what a transaction is about. The four guarantees behind it are **ACID** (Atomicity / Consistency / Isolation / Durability). Let's walk through what each letter means, all the way to **isolation levels**, which matter most in practice.

## What ACID Is

The four properties a transaction upholds. Take the initials and you get ACID.

| Letter | Property | In a nutshell |
| --- | --- | --- |
| A | Atomicity | All succeed or none do (nothing half-finished) |
| C | Consistency | Move from one constraint-respecting state to another |
| I | Isolation | Concurrent executions don't mix with each other |
| D | Durability | Once committed, it doesn't disappear |

## Atomicity and Durability (A / D)

These two are intuitive. They guarantee the "grouping" and the "finalization" of a transaction.

- **Atomicity**: if it fails partway, `ROLLBACK` undoes everything. Prevents "the money was withdrawn but never added" in a transfer
- **Durability**: once `COMMIT` returns, it survives even if the power drops right after (the log is written before responding)

> 💡 The reason you end up needing a [compensating transaction](/en/posts/compensating-transaction/) is that this atomicity **only works within a single DB**. Once you span external services, you can't roll back.

## Isolation and Isolation Levels (I)

This is where people trip up most in practice. **How far you isolate** concurrent transactions is chosen in steps (isolation levels). Stronger isolation is safer but slower; weaker is faster but can allow anomalies.

| Isolation level | Anomaly it can't prevent (example) |
| --- | --- |
| READ UNCOMMITTED | Dirty read (reading uncommitted data) |
| READ COMMITTED | Non-repeatable read (value changes on re-read) |
| REPEATABLE READ | Phantom (rows matching a condition appear/disappear) |
| SERIALIZABLE | (Equivalent to serial execution — no anomalies) |

- Many DBs default to **READ COMMITTED** (PostgreSQL, etc.). Raise it only where strong consistency is required
- For **concurrent updates** to inventory or balances, use an isolation level or explicit locks to prevent "double withdrawal"

> ⚠️ "Wrap it in a transaction and it's safe" is not true. **Depending on the isolation level**, concurrency anomalies can occur. Be especially careful with contended things like payments and inventory.

## Where Consistency (C) Fits

The C in ACID means "**don't break integrity constraints (foreign keys, unique constraints, balance never going negative, etc.)**". It's kept as a result of A, I, and D combining with the DB's constraints — a property with a somewhat different character.

> ⚠️ This C is a **different thing** from the C in the [CAP theorem](/en/posts/cap-theorem/) discussed elsewhere (all nodes see the same value). Same word "consistency," but it refers to different things, so don't conflate them.

## Handling It in Go

In `database/sql`, the shape is `Begin` → work → `Commit` / `Rollback`. The standard pattern is to undo with `defer`.

```go
tx, err := db.BeginTx(ctx, nil)
if err != nil { return err }
defer tx.Rollback() // no-op once Commit'd. Guarantees rollback on failure

if _, err := tx.ExecContext(ctx, /* ... */); err != nil {
    return err // defer will Rollback for you
}
return tx.Commit()
```

> 🧭 The idea is the same as C#'s `TransactionScope` (auto-rollback unless you call Complete). In Go you place `defer tx.Rollback()` first and `Commit` on success, building the same safety net.

## Summary

- ACID = **Atomicity, Consistency, Isolation, Durability**, the four guarantees of a transaction
- Atomicity is "all or nothing"; Durability is "once committed, it won't disappear"
- What matters in practice is **Isolation = isolation levels**. The default is READ COMMITTED; strengthen it only where things are contended
- The C in ACID means **don't break constraints**, and it's a different thing from the C in CAP
- In Go, the standard is `BeginTx` + `defer tx.Rollback()` + `Commit` on success

**Related:** [Payment Transactions](/en/posts/payment-transaction/) / [CAP Theorem](/en/posts/cap-theorem/) / [Compensating Transactions](/en/posts/compensating-transaction/)
