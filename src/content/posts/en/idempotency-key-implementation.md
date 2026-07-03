---
title: "Implementing Idempotency Keys — Preventing Double Charges on the Server"
date: 2026-06-29T15:00:00
summary: "An idempotency key is what stops a payment from running twice on retries or concurrent requests. Covers the server-side implementation in Go: key design, DB uniqueness constraints, concurrent-request races, and storing responses with expiry."
tags: ["アーキテクチャ", "設計"]
level: intermediate
lang: en
translationKey: idempotency-key-implementation
---

Building on the **idempotency key** mentioned in [The Payment Processing Flow](/en/posts/payment-processing-flow/),
this post digs into how to implement one on the server. The goal: "even if the same operation arrives twice, charge once and return the same response."
The four crux points are key design, uniqueness constraints, concurrency races, and expiry.

## What causes double execution

Treat double charges not as "the client's fault" but as something **structurally unavoidable**.

- **Retries**: the client resends on a timeout or 5xx. In reality the first attempt may have already succeeded
- **Concurrency**: a double-click or multiple tabs fire nearly the same operation at once

> ⚠️ The network doesn't guarantee "no response = failure." Always suspect the case where **it succeeded but only the response was lost**.

## Key design

The premise is that the client **generates a unique key and reuses the same key on retries**.

- One key per "single intent." Example: one press of the confirm-order button = one key (a stable value like the order ID)
- **Limit the scope**. Treat a key as unique within "this endpoint × this user"
- Even with the same key, **reject it if the body differs** (this detects misuse from key reuse)

```go
type IdemRecord struct {
    Key       string
    ReqHash   string // hash of the request body; a mismatch means misuse
    Status    string // "in_progress" | "done"
    RespCode  int
    RespBody  []byte
}
```

## Handle it with a DB uniqueness constraint

The heart of the implementation is that "**only one row can be created per key**." Leaning on a uniqueness constraint is the robust approach.

```sql
CREATE TABLE idempotency_keys (
  key        text PRIMARY KEY,
  req_hash   text NOT NULL,
  status     text NOT NULL,
  resp_code  int,
  resp_body  bytea,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

```go
// If the INSERT succeeds, you're the first. A duplicate means someone else is already processing/done
err := insertKey(ctx, key, reqHash) // status="in_progress"
if isUniqueViolation(err) {
    return loadAndReturnExisting(ctx, key, reqHash) // return the existing response
}
res := charge(ctx, req)            // only here do you actually charge
saveResult(ctx, key, res)          // update status to "done" and save the response
return res
```

> 💡 "SELECT first to check existence → INSERT if absent" lets **both slip through under concurrency**.
> Instead of checking, **reject via the INSERT's uniqueness-constraint violation** — that's what holds up against races.

## Concurrent-request races

With two nearly simultaneous requests, one creates the `in_progress` row and the other is rejected by the uniqueness constraint.
Decide up front how to handle the rejected one.

- **Still `in_progress`**: return `409 Conflict` to signal "processing" and have the client retry
- **`done`**: return the saved response (code + body) **as-is**

> 🧭 C#'s `[Idempotent]` middleware and the Stripe SDK's `IdempotencyKey` work on the same idea internally.
> Even across different frameworks, the skeleton is the same: "one row per key, uniqueness constraint, cached response."

## Storing responses and expiry

Idempotency includes "returning the same response." Store the response and decide a retention period.

- **Save the first status code and body**, and return the same ones on resends
- Don't keep keys forever. Delete them with a **TTL (e.g., 24h to a few days)** — enough grace for retries is sufficient
- Accept that if the same key arrives after expiry, it's treated as a separate new operation

## Summary

- Design on the premise that double execution is inevitable via **retries and concurrency**
- The client **generates a unique key and reuses it on retries**. A body mismatch is rejected as misuse
- The server decides who's first via the **DB uniqueness constraint** (a SELECT check slips through under races)
- On concurrency, return `409` if still processing, and **return the saved response as-is** if already done
- Save the response (code + body) and manage its lifetime with a **TTL**

**Related:** [The Payment Processing Flow](/en/posts/payment-processing-flow/) / [Implementing Webhooks](/en/posts/webhook-implementation/) / [HTTP Status Codes](/en/posts/http-status-codes/)
