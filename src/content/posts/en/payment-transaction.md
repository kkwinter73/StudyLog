---
title: "Payment Transactions — Treating a Single Purchase as a Record"
date: 2026-07-01T12:00:00
summary: "Authorization, capture, and refund look like separate operations, but they all hang off a single payment transaction. Here's how to bundle them by transaction ID, the states involved, why you keep them as records, and how this differs from a DB transaction."
tags: ["アーキテクチャ", "設計"]
level: intermediate
lang: en
translationKey: payment-transaction
---

In [The Flow of Payment Processing](/en/posts/payment-processing-flow/) we walked through authorization, capture, and refund in order. This article shifts the perspective and treats them together as **a single "payment transaction" — one unit of trade**. The key is to "think in terms of records, not operations." Along the way we'll also untangle the confusingly similar **DB transaction**.

## What is a payment transaction

It's a **unit of trade** representing "one payment." When a customer makes one purchase, one payment transaction is born.

- The PSP assigns it a unique **transaction id**
- Your app **links and stores** its own order together with the PSP's transaction ID

> 💡 The trick is to see it as "a single transaction record," not "a collection of operations." The authorization, capture, and refund that follow ride on top of this one record as **events**.

## Operations hang off a single transaction

Authorization, capture, refund, and void look like independent processes, but they stack up **referencing the same transaction ID**.

```text
transaction ID: txn_abc123
  ├─ authorization  (authorize: reserve the amount)
  ├─ capture        (capture: charge)
  └─ refund         (refund: partial/full)  ← all tied to txn_abc123
```

- A refund or capture isn't a "new transaction," it's an **additional operation on the original transaction**
- So amount consistency (refund total ≤ captured amount, etc.) can be **verified per transaction ID**

> 🧭 In both C#/.NET and Go, the table design that's easiest to work with holds "the transaction (payments)" and "events against the transaction (payment_events)" as a parent-child pair. Creating an independent record per operation makes reconciliation harder.

## Transaction states

A transaction record holds state and advances as it receives events. It's the state machine from the [flow article](/en/posts/payment-processing-flow/), reframed as the lifecycle of a transaction.

| State | Meaning |
| --- | --- |
| pending | Created, awaiting authorization |
| authorized | Authorization OK (reserved) |
| captured | Captured (charged) |
| refunded / partially_refunded | Refunded (full/partial) |
| failed / canceled | Failed / voided |

- State transitions on events received via [Webhook](/en/posts/webhook-implementation/)
- **Never roll back** a state that has already advanced (if an old `succeeded` arrives after `refunded`, ignore it)

## Why keep it as a "record"

The reason to carefully record a payment transaction pays off downstream.

- **Traceability**: You can trace "what happened with this order's payment and refund" instantly by transaction ID
- **Reconciliation**: **Match** the PSP's settlement statement against your own transaction records **by ID** to detect discrepancies
- **Audit and inquiries**: An event log of who did what and when becomes the evidence trail for customer support and accounting

> ⚠️ If you judge solely from the immediate response and keep no record, a transaction can get lost — "was it charged?" is unclear after a dropped connection. The safe order is to **create and record the transaction first, then update the result via events**.

## The difference from a DB transaction

Same word, "transaction," but a different thing. Let's separate them so you don't conflate them.

| | Payment transaction | DB transaction |
| --- | --- | --- |
| Subject | A **trade**: one payment | A **unit** that groups multiple DB operations |
| Purpose | Track the state of money | Guarantee ACID (atomicity, consistency, etc.) |
| Time span | Can stretch over days (capture, refund) | Usually commits/rolls back in an instant |
| Undoing | refund / void (a new operation) | rollback (make it as if it never happened) |

> 💡 A payment transaction is not something you can "undo with a rollback." To reverse a capture you need **a separate operation called a refund**. It's fundamentally different from a DB rollback.

## Summary

- A payment transaction is **a unit of trade representing one payment**, bundled by transaction ID
- Authorization, capture, and refund aren't independent processes but **events hanging off the same transaction ID**
- Advance state from Webhook events, and **never roll it back**
- Keeping the transaction **as a record** enables traceability, reconciliation, and audit
- It's **a different thing from a DB transaction (ACID, rollback)**. Undoing is a refund, not a rollback

**Related:** [The Flow of Payment Processing](/en/posts/payment-processing-flow/) / [Refunds, Chargebacks, and Disputes](/en/posts/refund-chargeback-dispute/) / [Implementing Idempotency Keys](/en/posts/idempotency-key-implementation/)
