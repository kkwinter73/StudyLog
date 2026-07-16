---
title: "Business Models 101 — How Executives See the 'Structure of Making Money'"
date: 2026-07-16T10:00:00
summary: "A business model is the blueprint for 'who, what, how you deliver, and how you make money.' It's not individual tactics but the structure where revenue and cost mesh so profit remains. As an engineer's first step toward an executive view, here's a plain look at revenue types, unit economics (LTV/CAC), and where they touch technical decisions."
tags: ["経営", "ビジネス"]
level: beginner
lang: en
translationKey: business-model-for-engineers
---

"Business model" sounds like a buzzword, but to an executive it's **the very mechanism by which a business survives**.
In one line: **the blueprint for "who, what, how you deliver, and how you make money."** As an engineer's first step toward
an executive view, this post reframes the business model as the "structure of making money." Together with its pair,
the [culture model](/posts/culture-model-for-engineers/), it forms the two wheels of a business.

## What a business model is — four questions

Before any flashy strategy, an executive first checks whether these four mesh. Miss even one and the business won't run.

| Question | Content | Example (cloud SaaS) |
| --- | --- | --- |
| Who | Who's the customer? Whose problem do you solve? | SMBs with a dev team |
| What | The value delivered — the "result gained," not features | Less deploy toil and fewer incidents |
| How to deliver | Sales/delivery channel, how it reaches them | Self-signup + monthly billing |
| Why pay | Revenue source and price — who pays how much | Per-seat subscription |

> ⭐ How good a feature is is only part of "what." Executives look at **"will the reason to pay persist"** over "a good feature."
> However impressive technically, with no one to pay, no reason to pay, or no path to reach them, it isn't a business.

## Revenue structure — profit is "what remains"

The simplest equation of a business is just this. But executives break down each term.

```text
revenue (what comes in) − cost (what goes out) = profit (money that remains)
```

- **Revenue** = customers × price × retention. Which one you grow changes the play
- **Cost** = variable (grows as you produce more) + fixed (rent, salaries you pay regardless)
- **Profit** = the remainder. If it's negative, no amount of revenue growth sustains it

> 🧭 In engineer terms, a business model is the business's **"architecture diagram."** Before adding individual features (tactics),
> you draw the dependencies and overall structure first. Add features onto a warped structure and it collapses — same as a system.

## Unit economics — look per customer

Before "are we in the black overall," executives confirm **whether the structure profits per single customer.** If this is broken,
the more you sell the more you lose (= you die when you scale). Two numbers are key.

```text
LTV (lifetime value)        … gross profit one customer generates over their life
CAC (customer acquisition cost) … cost to acquire one customer (ads, sales, etc.)

  LTV > CAC             → the more customers, the more profit (healthy)
  LTV / CAC ≥ 3          → a commonly used passing-line rule of thumb
  CAC payback < 12 months → can you recover acquisition cost within a year
```

> ⚠️ "Revenue is growing" is not proof of health. **Grow customers without recovering CAC and the more you grow, the bigger the loss.**
> An executive looks at per-customer economics before the flashy top line (revenue).

## Common revenue types

The same product takes a different business shape depending on "how you make money." Know the main types.

| Type | How it earns | Fits |
| --- | --- | --- |
| Subscription (monthly) | Recurring; stacking, stable revenue | Tools/SaaS used continuously |
| Usage-based | Pay for what you use; scales with usage | Cloud, APIs, infrastructure |
| One-time / license | Sell once, done | Packaged, buy-once software |
| Freemium | Gather for free, some convert to paid | Products entered via personal use |
| Advertising | Free to use; advertisers pay | Places where many users gather |
| Fees / marketplace | Take a % of transaction value | Places connecting sellers and buyers |

> 💡 Types aren't exclusive — you **combine** them (free tier + usage + subscription). Which type you pick changes the metric
> to grow (retention? usage? acquisitions?). When the metric wobbles, so do the plays.

## Why it pays for engineers to know this

Technical decisions connect to the business model without your noticing. With an executive view, the same implementation choice reads differently.

- Under **usage-based** pricing, efficiency gains **directly cut cost of goods**. Performance is part of the cost structure
- Under **subscription**, the lifeline is **retention**. Resilience and ease of migrating ([rollback](/posts/deploy-rollback-strategy/), [data migration](/posts/data-migration/)) feed churn
- Knowing **where cost lands** lets you pick "which optimization helps the business." You don't need to make everything fast

> 🧭 Beyond "is this good code," being able to add **"does this improvement help revenue, cost, or retention"** makes an
> engineer's proposal land with leadership. It's the first step in translating tech language into business language.

## Summary

- A business model is the **blueprint for "who, what, how you deliver, and how you make money."** Not feature quality but "does the reason to pay persist"
- Revenue structure is **revenue − cost = profit**. Executives watch "what remains (profit)," not revenue size alone
- **Unit economics (LTV/CAC)** confirm per-customer economics. Grow without recovering CAC and the more you grow, the bigger the loss
- The revenue type (subscription, usage, ads, fees…) changes the metric to grow. Wobble the metric and the plays wobble
- Technical decisions tie directly to cost and retention. Being able to say **"where in the business does this help"** connects with leadership

**Next:** on to the paired [Culture Models 101](/posts/culture-model-for-engineers/). A business's "how it earns" and an org's "how it moves" are the two wheels.
