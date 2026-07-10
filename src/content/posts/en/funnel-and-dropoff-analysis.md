---
title: "Funnel & Drop-off Analysis — Where People Leave"
date: 2026-07-10T11:00:00
summary: "Model the sequence of steps a user takes toward a goal as a funnel, and measure how many remain and how many drop at each stage. Drop-off analysis is just looking at those between-step losses —— two sides of one coin. Here's how to define steps, split overall vs step-to-step conversion, count it, and the design gotchas like denominators and time windows."
tags: ["データ分析", "SQL"]
level: intermediate
lang: en
translationKey: funnel-and-dropoff-analysis
---

"Sign-ups are high but paid conversions aren't growing" —— where are people leaving? **Funnel analysis** makes that visible.
Model the sequence of steps a user takes toward a goal (purchase, sign-up, upgrade) as a funnel and measure
**how many remain and how many drop** at each stage. **Drop-off analysis** is just looking at those "between-step losses" —— two sides of one coin.
Let's cover defining steps, measuring conversion, counting it, and the design gotchas that trip people up.

## What a funnel is — a sequence of steps

A funnel is a sequence of **ordered steps** toward a goal. Each stage must be an **event you can measure**.

```text
visit ──▶ add to cart ──▶ checkout ──▶ purchase complete
1000        400             250            180     ← users who reached each stage
```

- Counts shrink as you go down (hence "funnel"). What you want is **where the drop is steepest**
- Define each step by a **clear event**: "did `page_view`," "did `add_to_cart`"
- Decide up front whether the order is strict, or any-order still counts as passing through

> 💡 Funnels also apply to what you *build*: each onboarding screen, each form field, each stage of an API call —
> **anywhere there's an order and drop-off happens** can be viewed as a funnel.

## Conversion rate and drop-off rate — separate overall from step-to-step

There are two kinds of numbers. Conflating them leads you to the wrong cause.

| Step | Users reached | Overall pass rate | Step-to-step pass rate | Drop-off rate |
| --- | --- | --- | --- | --- |
| Visit | 1000 | 100% | — | — |
| Add to cart | 400 | 40% | 40% | 60% |
| Checkout | 250 | 25% | 62.5% | 37.5% |
| Purchase | 180 | 18% | 72% | 28% |

- **Overall conversion rate** = last stage ÷ first stage (18% here). The business-KPI number
- **Step-to-step conversion rate** = a stage ÷ the previous one. **Drop-off rate = 1 − step-to-step pass rate**
- Hunt for "where it drops most" at the **step-to-step** level. Here, visit→add-to-cart's **60% drop-off** is the biggest bottleneck

> ⚠️ Looking only at the overall rate tempts you to blame the last stage ("18% purchase is low"). But the real hole is the first step.
> The rule of thumb: **narrow improvement to the one step-to-step stage that drops the most**.

## How to count — from the event log

The raw data is an event log of "who did what, when." From it, count the **number of users** reaching each step.

```sql
-- Unique users who reached each step (DISTINCT removes one user's duplicates)
SELECT
  COUNT(DISTINCT CASE WHEN event = 'visit'    THEN user_id END) AS s1_visit,
  COUNT(DISTINCT CASE WHEN event = 'add_cart' THEN user_id END) AS s2_cart,
  COUNT(DISTINCT CASE WHEN event = 'checkout' THEN user_id END) AS s3_checkout,
  COUNT(DISTINCT CASE WHEN event = 'purchase' THEN user_id END) AS s4_purchase
FROM events
WHERE ts >= '2026-07-01' AND ts < '2026-07-08';
```

- Count **unique users, not rows** (`COUNT(DISTINCT user_id)`). Don't let one person's repeated clicks inflate it
- Strictly, "only people who did the previous step form the denominator of the next," but a **row of reach counts** like the above is enough to see it first
- The larger the population, the more you should **count on the DB side (SQL)**. Don't pull all rows to memory and count there

> 🧭 In C#, LINQ can express the same with `GroupBy` / `Select(g => g.DistinctBy(...))` — but that's *after loading all the data into memory*.
> Beyond tens of thousands of rows, pushing the query to the DB is faster. Push the aggregation down, same as `GROUP BY` in [SQL basics](/posts/sql-basics/).

## Design gotchas that trip people up

With funnels, the "how you count" changes the conclusion. Get these wrong and the numbers lie.

- **Fix the cohort**: take "people who visited 7/1–7/7" and **follow that same population** to the end. Don't count different people per stage
- **Where you put the denominator**: overall (first-stage base) or previous-stage base. **Show both in the table** to cut misreads
- **Time window**: how long counts as "passing through"? Within one session, or within 7 days? Change the window and the rate changes
- **Segment it**: averages lie. Split by **mobile/desktop, source, new/returning** and holes invisible in the aggregate appear
- **Correlation ≠ causation**: high drop-off isn't necessarily bad. A **deliberately narrowing stage** (a paywall) is supposed to lose people
- **Survivorship bias**: don't reason only from those who reached the last stage. The people who left hold the bottleneck's clues

> ⭐ After "where does it drop (quantitative)" always comes "**why does it drop (qualitative)**." Pinpoint one bottleneck stage in SQL,
> then dig into that one with session recordings, surveys, or A/B tests. Quantitative → qualitative is the fastest route.

## Summary

- Funnel analysis measures survival at each **ordered step** toward a goal; drop-off analysis looks at the **between-step losses** (two sides of a coin)
- Separate **overall conversion rate** from **step-to-step conversion rate**. Hunt the bottleneck at the **step-to-step** level
- The source is the event log. Count uniquely with **`COUNT(DISTINCT user_id)`** and push aggregation to the DB
- Decide **cohort, denominator, time window, and segments** before counting. The conclusion turns on these
- Narrow "where" to one stage quantitatively, then dig into "why" qualitatively. **Quantitative → qualitative** is fastest

**Related:** [SQL Basics](/posts/sql-basics/) / [What to Measure — The Four Golden Signals and the RED Method](/posts/what-to-measure-metrics/) / [RDBMS Basics](/posts/rdbms-basics/)
