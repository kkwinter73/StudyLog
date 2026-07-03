---
title: "Compensating Transactions — Designing Undo Across External Integrations"
date: 2026-07-01T13:00:00
summary: "Processes that span multiple external services—inventory, payment, points, shipping—can't be unwound with a DB rollback. When something fails midway, you run 'undo operations' in reverse order: that's a compensating transaction. Here's the idea, a payment example, and the hard parts."
tags: ["アーキテクチャ", "設計"]
level: advanced
lang: en
translationKey: compensating-transaction
---

In [Payment Transactions](/en/posts/payment-transaction/) I noted that "undoing a capture isn't a rollback—it's a refund."
The generalization of that idea is the **compensating transaction**. When a process **spans multiple external
integrations**—inventory, payment, points, shipping—you can't roll it all back at once like a DB. Let's look at
the design where, on failure, you undo with an "opposite operation."

## Why rollback doesn't work

Within a single DB, you can wrap multiple operations in a transaction and `ROLLBACK` on failure. But when the
counterparties are **separate external services**, that's off the table.

- The inventory service, payment PSP, points platform, and shipping arrangement are **each a different system / different DB**
- You can't tell the payment PSP "please rollback that charge and pretend it never happened" (what you *can* do is a **refund**, a separate operation)
- Wrapping everything in one DB transaction is physically impossible

> ⚠️ Reasoning about consistency across distributed counterparties as if it were the ACID of a single DB will fall apart.

## What a compensating transaction is

The idea: for each operation, prepare in advance an **operation that cancels out its effect (a compensation)**.
If the process fails partway, you **compensate the already-succeeded operations in reverse order**, bringing the
whole thing back close to a "never happened" state.

| Forward operation | Compensating operation |
| --- | --- |
| Reserve inventory | Return inventory |
| Capture the payment | Refund |
| Grant points | Revoke points |

> 💡 A [refund](/en/posts/refund-chargeback-dispute/) is literally "the compensating transaction for a capture."
> The compensation idea is just extending, to the whole process, something payments do every day.

## A payment example

Consider "order confirmation" calling several services in sequence. Here's the case where the third one fails.

```text
1. Reserve inventory   ✅
2. Capture payment      ✅
3. Grant points         ❌ Failed!
→ Run compensations in reverse order
   2' Refund            (undo the payment)
   1' Return inventory  (undo the reservation)
→ The order is finalized as failed
```

- Putting a single conductor (an orchestrator) in charge of the whole forward+compensation sequence makes it easier to follow
- **Record how far you got as transaction state**, and use it on failure to decide "where to start compensating from"

> 🧭 C#/.NET's `TransactionScope` works within one DB, but you hit the same problem the moment you span external services.
> Things like MassTransit's Saga manage "the sequence of forward and compensating steps" for you. In Go the idea is the same,
> but you usually build it yourself as a **state machine + a compensation function per operation**.

## Idempotency and retries

Compensation is "cleanup after a failure," so **it can itself fail and be retried**. That means you make it even sturdier than the forward operations.

- Make compensating operations [idempotent](/en/posts/idempotency-key-implementation/) too—don't cause double refunds or double inventory returns
- If a compensation fails, **keep retrying** (you must eventually complete every compensation = drive toward eventual consistency)
- For things that genuinely can't be auto-compensated, design a **manual-handling queue** to pile them into

## Hard parts and pragmatic trade-offs

Compensation isn't a silver bullet. There are things you accept at design time.

- Some operations **can't be compensated** (a sent email, an already-shipped package). Arrange the order so irreversible operations come last
- **Intermediate states are externally visible**. For a moment you can have "inventory decremented but order not yet placed" = not strong consistency but **eventual consistency**
- You could align things strictly with two-phase commit (2PC), but against external services that's often not realistic

## Summary

- Once you span multiple external integrations, you **can't unwind it with a DB rollback**
- Prepare a **canceling operation (compensation)** for each operation, and on failure **compensate the succeeded ones in reverse order**
- A payment **refund is literally the compensation for a capture**—this idea extended to the whole process
- Make compensations **idempotent + retried** so they always complete, and send the impossible ones to a manual queue
- What you get is not strong consistency but **eventual consistency**. Put irreversible operations last and accept the trade-off

**Related:** [Payment Transactions](/en/posts/payment-transaction/) / [Refunds, Chargebacks, and Disputes](/en/posts/refund-chargeback-dispute/) / [Implementing Idempotency Keys](/en/posts/idempotency-key-implementation/)
