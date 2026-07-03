---
title: "What to Measure — The Four Golden Signals and the RED Method"
date: 2026-07-01T21:00:00
summary: "A server exposes countless numbers. Where do you even start? Using Google SRE's Four Golden Signals and the RED method for request-driven services, we work out how to decide which metrics to put on a dashboard."
tags: ["監視", "運用"]
level: intermediate
lang: en
translationKey: what-to-measure-metrics
---

Monitoring curriculum (3/9, part 1). [Last time](/en/posts/observe-server-by-hand/) we read the raw numbers by hand. But
a server exposes countless numbers. **Where do you even start?** This question is the same whether you use CloudWatch or
your own OSS stack. Let's use the classic metric sets — the Four Golden Signals and RED — as a map.

## Choosing from countless numbers

Measuring everything and cramming it onto a dashboard gives you too much to read "is it healthy or not?" Narrow down to
**a small set of effective metrics**. There are a few well-established templates that tell you "look at these first."

## The Four Golden Signals

The four signals from the Google SRE book that capture user impact. Start here to answer "is the service healthy?"

| Signal | Meaning | Example |
| --- | --- | --- |
| Latency | Time it takes to respond | p50/p99 response time |
| Traffic | How much is coming in | Requests/sec |
| Errors | Rate of failures | 5xx rate, failure count |
| Saturation | How stressed resources are | CPU/memory/queue congestion |

- The first three (latency, traffic, errors) tie directly to **user experience**
- Saturation is "how much headroom is left." [The load average and available memory from last time](/en/posts/observe-server-by-hand/) fall under this

> ⚠️ Look at latency as a **distribution, not an average**. Even if the average is fast, a bad p99 (the slowest 1%) means
> some users are having a terrible experience. Averages hide anomalies.

## The RED Method

RED is the Golden Signals boiled down to three, aimed at **request-driven services** like a web API.

| Metric | Meaning |
| --- | --- |
| **R**ate | Requests per second (= traffic) |
| **E**rrors | Number/rate of failed requests (= errors) |
| **D**uration | Time taken to process (= latency) |

- Just lining up "Rate / Errors / Duration" per service lets you read health at a glance
- These become the backbone of the metrics you'll put on your [CloudWatch dashboard](/en/posts/cloudwatch-dashboards/) (Step 5) later

> 💡 For the resource side there's a different template, the **USE method** (Utilization / Saturation / Errors).
> Roughly: **RED = requests (from outside the service)**, **USE = resources (inside the server)** — use them accordingly.

## Applying it to a Go business system

Don't stop at abstractions; ground it in concrete numbers for your own service. For an HTTP API, for example:

```text
Rate     : convert http_requests_total to a per-second rate
Errors   : ratio of 5xx statuses (and 4xx if needed)
Duration : distribution of handler processing time (p50 / p95 / p99)
```

- The error criterion is based on HTTP status codes. Split 5xx (server-caused) from 4xx (client-caused) and reason about them separately
- Writing out "which number maps to which RED metric" up front keeps your dashboard design from wandering

## Summary

- Narrow countless numbers down to **a small set of effective metrics**. Following a template is the shortcut
- **The Four Golden Signals** = latency, traffic, errors, saturation (health first)
- **The RED method** = Rate/Errors/Duration. The core for request-driven services
- Look at latency as a **distribution (p99)**. The average hides anomalies
- The resource side is **USE**. Use RED (from outside) and USE (inside) accordingly

**Prev:** [Observing a Server by Hand](/en/posts/observe-server-by-hand/)　**Next:** [Metric Types and Collection Methods](/en/posts/metric-types-and-collection/) (part 2)
