---
title: "The Payment Processing Flow — Authorization, Capture, Idempotency, and Webhooks"
date: 2026-06-29T12:00:00
summary: "Online card payments aren't a case of the app moving money directly — they run through a payment service provider (PSP) in two stages: authorization then capture. Get the cast, the state transitions, idempotency, and webhooks straight, and the whole picture clicks."
tags: ["アーキテクチャ", "設計"]
level: intermediate
lang: en
translationKey: payment-processing-flow
---

Let's untangle what happens behind "press the pay button and you get charged." The key points: **the app never touches raw card numbers — it delegates to a payment service provider (PSP)**, and a payment moves through **two stages: authorization then capture**. We'll go through the cast, the state transitions, idempotency, and webhooks in that order.

## The cast

The app doesn't move money by itself. Someone stands in between.

| Player | Role |
| --- | --- |
| Customer / card | The person paying. Enters card details |
| Your app | Manages the order. **Does not hold the card number**, as a rule |
| PSP (payment service provider) | Stripe and the like. Holds the card details and talks to the network |
| Card network / issuing bank | Checks the balance and credit line, and ultimately approves or declines |

> ⚠️ Storing or passing raw card numbers (PANs) through your own systems triggers the heavy compliance burden of **PCI DSS**. The standard move is to send them straight to the PSP from the front end to **tokenize** them, and have the app deal only with that token.

## Authorization and capture

A card payment looks like a single action, but internally it's often split into two stages.

```text
1. Authorization
   - "Reserves" room on the card. No money moves yet
   - Done at the point of reserving stock or verifying identity

2. Capture
   - Actually "bills" against the reserved amount
   - Done when fulfillment is confirmed, e.g. when goods ship
```

- You *can* do **immediate capture** (auth and capture at once), but for physical goods "capture on shipment" is safer
- If you authorize but never capture, the reservation is automatically released after a set period
- A refund is a reversal after capture; canceling an authorization is called a void — the terms are kept distinct

> 💡 Same idea as a hotel "deposit." At check-in they hold room on your card (auth), and at check-out they bill the actual amount (capture).

## Idempotency — preventing double charges

The scariest thing in payments is a **double charge**. The network gets flaky, the response is lost, the client retries — and the same payment can run twice.

The defense against this is an **idempotency key**. You attach a unique key to each request, and the server records "this key has been processed" so that on the second and later attempts it returns the original result.

```go
// Generate one key per order and reuse the same key on retries
req.Header.Set("Idempotency-Key", orderID) // e.g. a stable unique value like the order ID

// Server-side idea: remember the result by key, and return the stored response on resends
if res, ok := store.Get(key); ok {
    return res // don't re-run the charge
}
res := charge(req)
store.Save(key, res)
return res
```

> 🧭 The thinking is the same in C#. When you add retries to HttpClient (with Polly and the like), it comes as a set: **put the same idempotency key on the request you retry**. Retrying without a key is a recipe for double charges.

## Asynchronous capture and webhooks

Payment results don't always come back synchronously in the HTTP response. 3-D Secure authentication, bank transfers, convenience-store payments and the like **settle later**.

So the PSP uses a **webhook** (event notification) to tell the app after the fact whether the payment "succeeded" or "failed."

- The app must **not treat the immediate response as proof of capture**. It marks the payment as confirmed on a notification like `payment_intent.succeeded`
- Assume webhooks **arrive more than once**, and process them idempotently here too (reject already-handled ones by event ID)
- Always verify the PSP's signature to check the notification isn't **spoofed**

> ⚠️ "The front end showed a success screen" does not equal "the charge succeeded." **The source of truth is the capture event from the PSP.** Only make an order shippable after receiving the webhook.

## Order state transitions

Hold all of this as state on the app side, and the flow becomes a single line.

```text
pending (order created, awaiting authorization)
  → authorized (auth OK, reserved)
    → captured (captured, billed) → shippable
    → canceled (authorization voided)
  → failed (auth declined)
refunded (refund after capture)
```

- Keep state **forward-only** as a rule, and transition on the events received via webhook
- Recording each transition (an event log) pays off for support inquiries and reconciliation

## Summary

- The app **holds no card number** and leaves tokenization to the PSP (avoiding PCI DSS)
- Payment is **two stages: authorization (auth) then capture** — for physical goods, capturing on shipment is safer
- Prevent **double charges from retries with an idempotency key** — remember the result and return the same response on resends
- **The source of truth is the PSP's capture event (webhook)** — don't base confirmation on the immediate response or a success screen
- Manage it as **order state transitions** on the app side, and record each event to be ready for reconciliation

**Related:** [HTTP status codes](/en/posts/http-status-codes/) / [Authentication at the boundary](/en/posts/auth-boundary-edge-vs-app/) / [Single source of truth (SoT)](/en/posts/single-source-of-truth/)
