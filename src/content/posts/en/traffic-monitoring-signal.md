---
title: "Traffic as a Signal — Load Volume Is the Context for Other Metrics"
date: 2026-07-02T15:00:00
summary: "In monitoring, traffic means \"how much is coming in\" — the volume of load. It isn't good or bad on its own, but it's the foundation (the denominator, the context) for reading error rates and latency. Here's how to measure it, and why you look at it alongside other metrics rather than in isolation."
tags: ["監視", "運用"]
level: intermediate
lang: en
translationKey: traffic-monitoring-signal
---

Monitoring curriculum, supplement (a follow-up to [What to Measure](/en/posts/what-to-measure-metrics/)). This digs into **Traffic**, one of the Four Golden Signals / RED. Traffic is "how much is coming in" — the volume of load. On its own it can't tell you good from bad, but it kicks in as **the context for reading other metrics**.

## What Traffic Is

The amount of **work coming into your service**. Also called throughput.

- For a web API, that's **requests per second (req/s)**
- It can also be bandwidth (bytes/s), concurrent connections, queue enqueue rate, and so on — it varies with the nature of the service

> 💡 This is the **Rate** in [RED](/en/posts/what-to-measure-metrics/). Note that it's a measure of "volume," not "speed"
> (speed is Duration — i.e., latency).

## How to Measure It

Most often it's held as a **counter** (cumulative request count), and you look at its rate of change to get "per second."

```text
http_requests_total (a counter — only ever increases)
  → convert with rate(...) to "how many requests per second"
```

- [Counters are used via rate](/en/posts/metric-types-and-collection/) — a raw cumulative value only becomes a load volume once you turn it into "per second"
- Some traffic is measured as a **gauge** (the current value), like bandwidth or concurrent connections

## Why You Look at It — It's the Context for Other Metrics

Looking at the traffic number alone doesn't mean "more = bad." **It pays off when you tie it to other metrics.**

- **Read errors and latency in relation to load**: "errors went up" might mean the ratio is unchanged if traffic doubled.
  That's why you look at errors as a **rate (error count ÷ traffic)**
- **It explains spikes and drops**: CPU jumped → if traffic also rose, you know "the cause is a rise in access" (useful for judging whether it's expected)

> 💡 On the "cause" side of ["look at the value and the cause together"](/en/posts/metrics-baseline-and-thresholds/), traffic is
> the first context you check. Most anomalies can be explained by "because load went up."

> ⚠️ **A sharp drop in traffic is also an anomaly.** Requests that should always be arriving are near 0 — that's a sign the upstream (LB, DNS,
> the service in front) is broken. Not just increases; "nothing is coming in" is a monitoring target too.

## Traffic and Capacity

Traffic is the flip side of **saturation (resource strain)**. As load rises, resources get consumed.

- Traffic up → CPU, memory, connection count climb → eventually the limit (saturation)
- Reading "how much more load can we take" from the relationship between traffic and resource utilization is material for a **scaling decision**
- If you know the [normal waves](/en/posts/metrics-baseline-and-thresholds/), you can estimate how close a peak gets to capacity

## Summary

- In monitoring, traffic is the **volume of load** (req/s, bandwidth, concurrent connections, etc.). The Rate in RED
- Most often measured as a **counter × rate** to get "per second"
- It can't tell good from bad on its own. It's the **context (denominator) for reading error rates and latency**
- **Not just spikes but drops are anomalies too** (a sign of upstream failure)
- The flip side of saturation. The relationship between traffic and resources is material for a **scaling decision**

**Related:** [What to Measure (the Four Golden Signals and RED)](/en/posts/what-to-measure-metrics/) / [There's No Absolute Normal Value for Metrics](/en/posts/metrics-baseline-and-thresholds/)
