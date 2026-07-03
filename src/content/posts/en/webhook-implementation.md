---
title: "Implementing Webhooks — Signature Verification, Return 200 Fast, and an Idempotent Endpoint"
date: 2026-06-29T16:00:00
summary: "Payment confirmation arrives after the fact via a webhook from the PSP. The endpoint must verify signatures, return 200 first, be idempotent to duplicates and ordering, and assume retries. Here are the implementation patterns in Go."
tags: ["アーキテクチャ", "設計"]
level: intermediate
lang: en
translationKey: webhook-implementation
---

In [The Payment Processing Flow](/en/posts/payment-processing-flow/) I wrote that "the source of truth is the PSP's confirmation event."
The endpoint that receives it is the **webhook** (an HTTP push from the PSP to your app). To make that endpoint safe and lossless,
there are four things to nail down in your implementation — signature verification, returning 200 immediately, idempotency, and retries.

## What a webhook is

It's the inverse of polling (where you periodically query the other side). **When an event occurs, the PSP calls you.**

- Payment confirmations, failures, refunds, chargebacks, and so on arrive in a form like `payment_intent.succeeded`
- Your app exposes a single public endpoint (e.g. `POST /webhooks/psp`) to receive them

## Signature verification — reject fake events

A public URL can be hit by anyone. Always verify **whether it really came from the PSP** using the signature in the header.

```go
func verify(payload []byte, sigHeader, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload) // compute over the raw body (before parsing)
    expected := hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(expected), []byte(sigHeader))
}
```

> ⚠️ Verify the signature against the **raw request body**. A byte sequence produced by parsing to JSON
> and re-serializing won't match. Read the body and verify first, then parse — in that order.

> 🧭 Stripe's SDK `ConstructEvent` / .NET's `EventUtility.ConstructEvent` do this internally.
> Even in a hand-rolled implementation, use a **constant-time comparison** like `hmac.Equal` to avoid timing attacks.

## Return 200 first

The PSP **treats a slow or missing response as a failure and resends**. Doing heavy work synchronously leads to retry hell.

```text
1. Verify the signature
2. Persist the event (record receipt)
3. Return 200 immediately
4. Do the real work (enabling fulfillment, notifications, etc.) asynchronously
```

- Don't complete heavy work inside the handler. **Accept → 200 → follow-up via queue/worker**
- Return `400` on verification failure; for events you don't handle, return `200` anyway (don't make them resend)

## Idempotency, duplicates, and ordering

Build on the assumption that webhooks **arrive more than once** and **aren't delivered in order**.

- **Duplicates**: the same event arrives multiple times. **Reject already-processed events by event ID** (the same idea as an [idempotency key](/en/posts/idempotency-key-implementation/))
- **Ordering**: `created` → `succeeded` → `refunded` may come out of order. Decide based on the **event's state**, not the receive time
- **Ignore transitions that would roll back** a state you've already advanced past (don't rewind if `succeeded` arrives after `refunded`)

```go
if seen(event.ID) { // already processed: do nothing and return 200
    w.WriteHeader(200); return
}
markSeen(event.ID)
enqueue(event) // hand off to follow-up processing
```

## Retries and timeouts

Assuming events "arrive eventually," also prepare a safety net for anything you miss.

- On failure, the PSP **resends with exponential backoff**. Since you're idempotent, it's safe no matter how many times it comes
- For events that occurred while your endpoint was down, you can **resend or list them via the PSP's dashboard/API**
- As a safety net, **periodically query the PSP and reconcile** orders whose confirmation never arrived (reconciliation)

## Summary

- A webhook is a push from PSP to app. Receive confirmations as the **source of truth**
- **Verify signatures against the raw body with a constant-time comparison.** Reject fake events
- **Return 200 first and move heavy work to async.** Delays cause resends
- **Make it idempotent by event ID** and tolerate duplicates and out-of-order delivery (ignore rollback transitions)
- Assume retries plus **periodic reconciliation** to recover anything missed

**Related:** [The Payment Processing Flow](/en/posts/payment-processing-flow/) / [Implementing Idempotency Keys](/en/posts/idempotency-key-implementation/) / [HTTP Status Codes](/en/posts/http-status-codes/)
