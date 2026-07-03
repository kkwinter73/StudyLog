---
title: "VeriTrans (VeriTrans4G) — A Real-World Domestic PSP"
date: 2026-06-29T18:00:00
summary: "The abstract PSP we kept referring to in the payments series has a concrete Japanese example: VeriTrans. Here's what it is, where it sits, and how you use it from an app — tied back to the terms used across the series."
tags: ["アーキテクチャ", "設計"]
level: intermediate
lang: en
translationKey: veritrans-payment-gateway
---

In [The Payment Processing Flow](/en/posts/payment-processing-flow/) I wrote that "the app never holds the card number — it leaves that to the PSP."
VeriTrans is **the leading domestic example of that PSP (payment service provider)**. Let's organize what it is,
where it sits, and how you use it from an app, tying it back to the terms we've used throughout the series.

## What it is

VeriTrans is a payment service provider currently operated by **DG Financial Technology, Inc. (formerly VeriTrans, Inc.)**.
It's part of the Digital Garage (DG) group, and a well-established player founded in 1997.

- Its current flagship service is **VeriTrans4G** (comprehensive payments for online/in-person)
- Transaction volume runs into the trillions of yen, with over a million payment locations — putting it among the domestic majors

> 💡 Think of it as a **domestic PSP** occupying the position that Stripe / Adyen hold abroad. The box we've been
> abstractly calling "the PSP" throughout the series now has a concrete name in it.

## Where it sits in the payment flow

Of the players we saw in [How Credit Card Payments Work](/en/posts/credit-card-payment-mechanism/),
VeriTrans is **the layer that handles the connections to acquirers and card brands on your behalf**.

```text
Customer → Your app → 【VeriTrans (PSP)】 → Card companies / payment providers
                          ↑ this is what gets consolidated into one
```

- The app **doesn't need individual contracts or connections** with each card brand or convenience-store chain
- You can entrust card data to VeriTrans and have the app deal with [tokens](/en/posts/payment-processing-flow/) instead (offloading the PCI DSS burden)

## Its strength — consolidating many payment methods

This is the biggest reason to use a domestic PSP. You can **adopt 30+ payment methods with a single contract and a single connection**.

| Category | Examples |
| --- | --- |
| Card | Major international brands |
| Convenience store | Convenience-store payment (asynchronous settlement, confirmed later) |
| QR / ID payments | Code payments like PayPay |
| Carrier billing | Bundled with mobile phone bills |
| E-money | Various |
| Cross-border / overseas | PayPal, Alipay, etc. |

> 🧭 Wire up each provider yourself and the APIs, deposit cycles, and [webhooks](/en/posts/webhook-implementation/) are all different.
> A PSP **abstracts all of that into a single interface**. Whether you're on C#/.NET or Go, the benefit of having
> just one thing to connect to is the same.

## How you use it from an app

The concepts we covered across the series map directly onto its features.

- **Authorize → capture**: two-phase auth and capture, with support for **asynchronous settlement** (convenience stores, etc.)
- **Cardholder authentication**: fraud prevention via [3-D Secure 2.0](/en/posts/3d-secure-sca/) and security-code verification
- **Result notifications**: designed on the premise that you receive results via notifications, not just the synchronous response
- **Refunds and more**: [refunds and cancellations](/en/posts/refund-chargeback-dispute/) can also be done via the API

> ⚠️ "Using a PSP" does not mean "you don't have to think about anything." [Idempotency](/en/posts/idempotency-key-implementation/),
> [idempotent handling](/en/posts/webhook-implementation/) of notifications, and [reconciliation](/en/posts/refund-chargeback-dispute/) remain
> the app's responsibility with any PSP.

## Summary

- VeriTrans (VeriTrans4G) is a **major domestic PSP** operated by DG Financial Technology
- Its position is a **payment-agency layer that handles connections to acquirers/brands** on your behalf
- Its strength is **consolidating 30+ payment methods into a single contract and single connection** (cross-border included)
- Authorize/capture, 3-D Secure, result notifications, refunds, and more — **the concepts from the series map directly onto features**
- But **idempotency, notification handling, and reconciliation** remain the app's responsibility with any PSP

**Related:** [The Payment Processing Flow](/en/posts/payment-processing-flow/) / [How Credit Card Payments Work](/en/posts/credit-card-payment-mechanism/) / [3-D Secure & SCA](/en/posts/3d-secure-sca/)
