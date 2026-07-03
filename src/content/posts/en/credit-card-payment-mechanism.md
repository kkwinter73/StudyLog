---
title: "How Credit Card Payments Work — Issuer, Acquirer, and the Card Network"
date: 2026-06-29T13:00:00
summary: "Card payments aren't a one-to-one deal between merchant and card company. Authorization circulates among four parties plus the network — issuer, acquirer, and international brand. Here's who does what, and why a PSP sits in the middle."
tags: ["アーキテクチャ", "設計"]
level: intermediate
lang: en
translationKey: credit-card-payment-mechanism
---

In [The Payment Processing Flow](/en/posts/payment-processing-flow/) we looked at the app-side choreography. This article goes one level deeper:
**which parties a card payment actually flows between**. The key insight is that it's *not* a
direct transaction between the merchant and the card company. Four parties plus a network stand in between.

## The Four Parties + the Network

| Party | Role |
| --- | --- |
| Cardholder | The customer who holds the card |
| **Issuer** | The bank that issued the card to the member. Holds the credit line / balance |
| Merchant | The side selling goods/services (your app) |
| **Acquirer** | Signs up merchants and aggregates their payments |
| International brand | Visa, Mastercard, etc. The **network** connecting both sides |

> 💡 The point is that the **issuer** (which holds the customer's money) and the **acquirer** (the merchant's gateway)
> are separate companies, and the **brand's network** bridges the gap between them. The merchant never has to think about which issuer is on the other end.

## The Path an Authorization Travels

The query "can this card cover ¥X?" (authorization) makes a full loop around the four parties.

```text
Customer card
  → Merchant (app)
    → Acquirer
      → Brand network
        → Issuer (checks credit line / fraud, approves or declines)
      ← Approve or decline
    ← Result returns in reverse order
  ← Merchant gets "approved / rejected"
```

- The issuer looks at **balance, credit line, and fraud detection**, then returns an approve/decline on the spot
- What comes back here is only a *hold* — "this can be used." The actual charge happens later at **capture**

## Clearing and Settlement

Even after authorization reserves the credit, no money has moved yet. Reconciliation happens afterward in two stages.

- **Clearing**: finalized transaction data is matched up through the brand to determine who owes whom, and how much
- **Settlement**: the actual movement of funds. Money flows issuer → acquirer → merchant, deposited in batches

> ⚠️ This is why "payment complete" and "money in the account" happen at **different times**. Deposits to the merchant
> are batched over several days / on a cycle (which is exactly why reconciliation is needed).

## The Flow of Fees (Roughly)

Break down the processing fees a merchant pays, and you can see whose cut is whose.

- **Interchange fee**: acquirer → issuer. The main component of the fee
- **Brand fee**: the network usage charge
- **Acquirer / PSP cut**: the merchant gateway's margin

## Why Put a PSP in the Middle

You *could* contract directly with an acquirer, but in practice it's normal to put a **PSP (payment service provider)** in between.

- It **consolidates multiple brands and payment methods into a single API**
- Card numbers are entrusted to the PSP, and the merchant only handles a [token](/en/posts/payment-processing-flow/) (shifting the PCI DSS burden away)
- It **abstracts** authorization / capture / refund / webhooks for you

> 🧭 Whether you're in C#/.NET or Go, all your app calls is the PSP's SDK/API. The value of using a
> provider is that you never have to deal with the raw brand-network protocols (ISO 8583 and friends).

## Summary

- A card payment isn't a direct transaction between merchant and card company — the **issuer, acquirer, and brand** all sit in between
- Authorization loops around all four parties, and the **issuer returns the approve/decline** (only a hold at this point)
- Deposits follow later via **clearing → settlement**, so "payment complete" and "money deposited" are separate moments
- The main component of the fee is the **interchange fee** (acquirer → issuer)
- By putting a **PSP** in the middle, the merchant gains multi-brand support and a lighter PCI burden

**Related:** [The Payment Processing Flow](/en/posts/payment-processing-flow/) / [3-D Secure & SCA](/en/posts/3d-secure-sca/)
