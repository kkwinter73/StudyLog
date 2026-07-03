---
title: "3-D Secure and SCA — the flow of cardholder authentication"
date: 2026-06-29T14:00:00
summary: "A card number alone can't confirm you're the owner. 3-D Secure inserts issuer-side authentication and shifts where fraud and liability (chargebacks) land. Here's the flow and what your app has to do."
tags: ["セキュリティ", "アーキテクチャ"]
level: intermediate
lang: en
translationKey: 3d-secure-sca
---

In [How credit card payments work](/en/posts/credit-card-payment-mechanism/) we framed the issuer as the party that decides "can this card be used." But **whether the person entering it is the actual cardholder** is a separate question. Filling that gap is cardholder authentication via **3-D Secure (3DS)**. Let's look at what it solves, how the flow goes, and what your app does.

## What it solves

A card number, expiry date, and security code can be entered by anyone once they leak. Impersonated payments go through.

- **Reduce impersonation (fraud)**: the issuer performs an extra identity check
- **Change where liability sits**: pass authentication and the loss from fraud shifts from the merchant to the issuer side (more below)

> 💡 The "3D" in 3DS means three domains (the issuer domain, the acquirer domain, and the interoperability domain). The current mainstream is **3DS2**.

## The 3DS2 flow

At payment time, **issuer authentication** is inserted between card entry and authorization.

```text
1. The merchant sends payment info + device/browser info to the issuer
2. The issuer assesses risk
   ├─ Low risk → frictionless (passes with no extra action)
   └─ High risk → challenge (requires a one-time password / biometrics / etc.)
3. Proceed to authorization with the authentication result attached
```

- **Frictionless**: judged safe from device info and buying patterns, so no user action is requested
- **Challenge**: an extra identity check such as an SMS one-time password or in-app biometrics

> ⚠️ "3DS = enter a password every time" is wrong. Most transactions are risk-assessed behind the scenes and **pass straight through**. Minimizing friction while only checking when something looks off is the whole point of 3DS2.

## Liability shift

This is 3DS's biggest practical effect.

- If fraud occurs on a transaction that passed 3DS authentication, **the issuer side bears the chargeback loss**
- Fraud on a transaction that didn't go through it is, as a rule, **the merchant's burden**

> 🧭 It's less a "security feature" and more like **insurance against risk**. Whether to adopt it is a trade-off between conversion rate (drop-off) and [chargeback](/en/posts/refund-chargeback-dispute/) losses.

## What your app does

If you use a PSP, your app never builds the authentication screen itself. It just handles **interruption and resumption**.

```text
1. Create the payment → the PSP may return "additional authentication required (requires_action)"
2. The app directs the user to the specified authentication URL/modal (provided by the PSP)
3. After authentication completes, the PSP continues the payment → you receive the finalized result via webhook
```

- **The PSP decides** whether authentication is needed. When the app receives `requires_action`, it just redirects
- Final confirmation comes via [webhook](/en/posts/webhook-implementation/) rather than the synchronous response — same as ordinary payments

## Summary

- 3-D Secure inserts **issuer-side cardholder authentication** to reduce impersonated payments
- Current 3DS2 switches between **frictionless (pass-through) and challenge (extra check)** based on risk
- Passing authentication **shifts chargeback liability to the issuer side** (liability shift)
- Adoption is a **trade-off** between drop-off rate and fraud losses
- The app just receives `requires_action`, **redirects to authentication, and takes final confirmation via webhook**

**Related:** [How credit card payments work](/en/posts/credit-card-payment-mechanism/) / [Refunds, chargebacks, and disputes](/en/posts/refund-chargeback-dispute/)
