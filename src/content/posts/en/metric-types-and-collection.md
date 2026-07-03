---
title: "Metric Types and Collection Methods — Counter/Gauge, Pull/Push"
date: 2026-07-01T22:00:00
summary: "A value at a single instant vanishes right away. Record it continuously with timestamps and you can look back later. Cover the two metric types (counter and gauge) and the two ways to collect values (pull and push). Prometheus is pull; CloudWatch is push."
tags: ["監視", "運用"]
level: intermediate
lang: en
translationKey: metric-types-and-collection
---

Monitoring curriculum (3/9, part 2). In [part 1](/en/posts/what-to-measure-metrics/) we decided *what to measure*. This time it's
**how to represent it and how to collect it**. Metric types (counter/gauge) and collection methods (pull/push) form a common
foundation whether you're on CloudWatch or a homegrown OSS stack.

## Metrics are time series

The numbers in `top` are just **the value at this very instant**, and they disappear immediately. **Record them continuously with timestamps**
and you can look back, compare, and spot trends later. That's a time-series metric.

```text
timestamp            metric              value
2026-07-01T21:00:00  http_requests_total 15230
2026-07-01T21:00:15  http_requests_total 15288
2026-07-01T21:00:30  http_requests_total 15355
```

- Accumulating "points" into a "line" makes spikes and upward trends visible
- The storage is a time-series database (Prometheus / CloudWatch metrics, etc.)

## Counter and gauge

There are broadly two metric types. Mix them up and you'll get your aggregations wrong.

| Type | Behavior | Example |
| --- | --- | --- |
| **Counter** | Only goes up (resets to 0 on restart) | Cumulative request count, cumulative error count |
| **Gauge** | Goes up and down (the current value) | CPU utilization, memory usage, connection count |

- A **counter** is cumulative. Looking at it raw isn't very meaningful; turn it into a **rate** to see "how many per second"
- A **gauge** is the value right now. It's meaningful as-is

```promql
# A counter is used by converting it to "per second" with rate
rate(http_requests_total[1m])
```

> 💡 The Rate (requests per second) from [part 1](/en/posts/what-to-measure-metrics/) is obtained by applying rate to the counter
> `http_requests_total`. Once you understand the difference between counter and gauge, you can compute RED.

## Pull and push

There are two methods depending on "who does the work of collecting the value." This directly affects product choice.

```text
Pull:  monitor ──"give me the current value"──▶ monitored target   (goes and fetches)
Push:  monitored target ──"here's the current value"──▶ monitor     (sends it over)
```

| | Pull | Push |
| --- | --- | --- |
| Who initiates | The monitor periodically goes and fetches | The monitored target sends |
| Representative | **Prometheus** | **CloudWatch**, StatsD |
| Good fit | Long-running services (whose location is known) | Short-lived jobs, many distributed sources |

- With **pull**, the monitor holds a "target list" and simultaneously knows whether each is alive (whether it can be fetched)
- With **push**, only the sender needs to reach the monitor, so it's strong for things whose location changes or processes that finish in an instant

> ⚠️ This difference matters later. [Prometheus is pull](/en/posts/build-monitoring-oss/) (built by hand in Step 3),
> **CloudWatch is push** (Step 4). The same "metric collection," but the direction is reversed — keep that in mind.

## Not better or worse, but characteristics

Pull and push aren't about superiority — they're about fit. Long-running services whose location is known are easier to manage with pull,
while serverless, short-lived jobs, and AWS managed environments are a natural fit for push. In practice, **the two often coexist**.

## Summary

- A value at a single instant disappears. Recording it **continuously with timestamps** is a time-series metric
- There are two types: a **counter (only goes up → use with rate)** and a **gauge (the current value)**
- Collection is either **pull (goes and fetches; Prometheus)** or **push (sends; CloudWatch)**
- Pull suits long-running services whose location is known; push suits short-lived, distributed, and managed environments. Not better or worse, just characteristics
- Counter × rate connects to the Rate from part 1 — once you understand types, you can compute RED

**Prev:** [What to Measure (the Four Golden Signals and RED)](/en/posts/what-to-measure-metrics/)　**Next:** [Building the Four Roles of Monitoring Yourself](/en/posts/build-monitoring-oss/) (Step 3, Prometheus + Grafana)
