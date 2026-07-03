---
title: "Refunds, Chargebacks, and Disputes — Handling Reversals After Capture"
date: 2026-06-29T17:00:00
summary: "A payment isn't done once it's captured. Authorization voids, refunds, and customer-initiated chargebacks are all different things — the money flows back differently and so does your response. Here are the three, plus how to reflect them in your app's state."
tags: ["アーキテクチャ", "設計"]
level: intermediate
lang: en
translationKey: refund-chargeback-dispute
---

A follow-up to [The Payment Processing Flow](/en/posts/payment-processing-flow/). Even after a capture,
"reversals" still happen. **Void, refund, and chargeback** sound similar but are quite different.
Let's sort out who initiates each, how the money comes back, and how your app should change state.

## Three kinds of reversal

First, get the terms straight. Confusing them leads to double refunds and reconciliation mismatches.

| Type | Initiator | Target | In short |
| --- | --- | --- | --- |
| **void** (authorization void) | Merchant | Authorization **before** capture | Releases an unbilled hold. No money has moved |
| **refund** | Merchant | Charge **after** capture | Returns a billed amount to the customer. Full or partial |
| **chargeback** (payment reversal) | Customer → issuer | Charge after capture | Customer disputes via their card company. Funds are forcibly pulled back |

> 💡 The dividing lines are "**has it been captured**" and "**who initiates it**." Before capture, it's a void;
> after capture and voluntary, it's a refund; if the customer files with their card company, it's a chargeback.

## The refund flow

A refund is when the merchant voluntarily returns money. It's done against an already-captured charge.

```text
1. App sends a refund request to the PSP (full or partial, with an amount)
2. Via the PSP to the issuer → back onto the customer's card
3. The outcome is confirmed via webhook (refund.succeeded, etc.)
```

- **Partial refunds** can often be issued multiple times. Validate server-side that the total doesn't exceed the original charge
- Make refunds **idempotent**. Attach an [idempotency key](/en/posts/idempotency-key-implementation/) so retries don't refund twice
- A refund after settlement is netted out — it's **deducted from the merchant's payout**

> ⚠️ Processing fees are often **not returned on a refund**. Even on a full refund, the merchant is out the fee.

## Chargebacks and disputes

When a customer tells their card company "I don't recognize this" or "the item never arrived,"
**funds are forcibly pulled back**. That's a chargeback. The merchant can push back (dispute) it.

```text
1. Customer disputes with the issuer → funds are provisionally pulled back
2. The merchant is notified via the PSP (webhook: dispute.created, etc.)
3. The merchant submits evidence (shipping records, terms acceptance, communication logs) to contest it
4. The card network rules → merchant wins (funds returned) or loses (finalized)
```

- Disputes have a **deadline**. You need a workflow to gather evidence promptly once notified
- Frequent chargebacks bring penalties from the card networks. Using [3-D Secure](/en/posts/3d-secure-sca/) to **shift liability** reduces your exposure on fraud
- You also have to decide between "settle it quietly with a refund" and "fight it with evidence"

## Reflecting state in your app

Add the reversal terminal states to the [payment state machine](/en/posts/payment-processing-flow/).

```text
captured
  → refunded / partially_refunded   (voluntary refund)
  → disputed → won (stays captured) / lost (funds lost)
authorized
  → canceled                        (void: reversal before capture)
```

- Drive transitions off **the events you receive via webhook** (don't rely on the synchronous response)
- Record every event so you can **reconcile against the PSP's payout statements**
- Reflect refunds and chargebacks in your accounting as **negative revenue**

## Summary

- Reversals come in three distinct forms: **void (before capture), refund (after capture, voluntary), chargeback (customer-initiated, forced)**
- Refunds can be **full or partial** and must be idempotent. The **fee usually isn't returned**
- A chargeback forcibly pulls funds back. Contest it by **submitting evidence within the deadline**; frequent ones bring penalties
- Reduce your exposure on fraud with **liability shift** via [3-D Secure](/en/posts/3d-secure-sca/)
- Have your app **transition state off webhooks**, **reconcile** against payout statements, and reflect it in accounting

**Related:** [The Payment Processing Flow](/en/posts/payment-processing-flow/) / [3-D Secure and SCA](/en/posts/3d-secure-sca/) / [Implementing Webhooks](/en/posts/webhook-implementation/)
