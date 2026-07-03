---
title: "Visualizing with CloudWatch — Dashboards and Metric Math"
date: 2026-07-02T13:00:00
summary: "Turn collected metrics into a screen you can read at a glance. Let CloudWatch dashboards play the role that Grafana did in your DIY OSS stack. Stack RED at the top, compute the error rate with metric math, and order things so you can read straight down from health to resources."
tags: ["監視", "AWS", "運用"]
level: intermediate
lang: en
translationKey: cloudwatch-dashboards
---

Monitoring curriculum (6/9). Last time we [collected metrics](/en/posts/cloudwatch-metrics/); this time we turn them into a **dashboard you can read at a glance**. This is the episode where CloudWatch plays the role Grafana did in the [DIY OSS stack](/en/posts/build-monitoring-oss/). The key points are "how you arrange things" and **metric math**, which combines multiple metrics.

## Build a screen where health is obvious at a glance

Opening each metric individually in the console every time is far too slow in the middle of an incident.

- Make "is the service healthy?" answerable on **a single screen**
- Decide the reading order in advance, so you understand the situation just by reading top to bottom

Add widgets to a CloudWatch dashboard **one at a time**.

## Stack RED at the top

Put the [RED you wrote out in Step 2](/en/posts/what-to-measure-metrics/) (Rate / Errors / Duration) in the top row first.

- **Rate**: requests per second
- **Errors**: error rate (we'll build this with metric math next)
- **Duration**: response time distribution (p50 / p99)

This is the "core of health" for that service. Look at the top row and you can tell whether users are being affected.

## Compute the error rate with metric math

There's no single metric for error rate. You need to compute **error count ÷ total count**. That's where **metric math** comes in: you combine multiple metrics with an expression to produce a new time series.

```text
m1 = total requests     (e.g. RequestCount)
m2 = error count        (e.g. number of 5xx)
e1 = (m2 / m1) * 100     <- error rate (%). This is what you plot on the widget
```

- Hide the source metrics (m1/m2) and plot only the computed result e1 to keep it readable
- For a load balancer, an expression like "`100 * number of 5xx / request count`" gives you the fault rate

> 💡 Same idea as [the "use counters as rates" point from earlier](/en/posts/metric-types-and-collection/). Don't look at the raw counts as-is — only once you **process them into a ratio or rate of change** do they become an indicator you can read for "healthy or not".

## Arrange it so you can read straight down

Give the widget order meaning. From top to bottom, make it read in **symptom → cause** order.

```text
┌─────────────────────────────┐
│ Top: is the service healthy? (RED) │ <- start here. user impact
│   Rate / Error rate / Duration     │
├─────────────────────────────┤
│ Bottom: are resources sufficient?  │ <- then here. narrow down the cause
│   CPU / Memory / Disk              │
└─────────────────────────────┘
```

- Notice "is something wrong?" from the top row (RED), then narrow down "why?" from the bottom row (resources)
- Make your app deliberately return errors and confirm the **error-rate widget reacts** — that gives peace of mind

## Mapping to the OSS stack

| OSS (DIY) | CloudWatch |
| --- | --- |
| Grafana (visualization) | CloudWatch dashboards |
| PromQL (queries) | Metric search / metric math |

- Roughly, **CloudWatch dashboards ≒ Grafana**
- The difference: in CloudWatch the **data source (metrics) and visualization are unified**. It's not a setup where you wire in a separate data source the way Grafana does.

## Summary

- A dashboard is "**a screen where health is obvious at a glance**". Opening metrics individually during an incident is too slow
- Put **RED** (Rate/Errors/Duration) in the top row and check user impact first
- Compute the error rate with **metric math** (`error count / total count × 100`) into a single time series
- Order it **top = symptom (RED) → bottom = cause (resources)**. You grasp the situation just by reading down
- **CloudWatch dashboards ≒ Grafana**, but the data source and visualization are unified

**Prev:** [Collecting metrics with CloudWatch](/en/posts/cloudwatch-metrics/)　**Next:** [Collecting logs with CloudWatch Logs](/en/posts/cloudwatch-logs/) (Step 6)
