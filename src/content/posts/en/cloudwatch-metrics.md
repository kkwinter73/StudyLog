---
title: "Collecting Metrics with CloudWatch — Standard Metrics and the Agent"
date: 2026-07-02T12:00:00
summary: "How CloudWatch handles the collect-and-store roles of the OSS stack we built ourselves. EC2 automatically ships some metrics, but memory and disk live inside the OS and can't be seen — that's where the CloudWatch Agent fills the gap. Get comfortable with namespaces, dimensions, and the push model."
tags: ["監視", "AWS", "運用"]
level: intermediate
lang: en
translationKey: cloudwatch-metrics
---

Monitoring curriculum (5/9). [Last time](/en/posts/build-monitoring-oss/) we built the four roles — collect, store, query, visualize — ourselves with the Prometheus stack. This time we look at how AWS's managed **CloudWatch** takes on the "collect and store" part. This is the collection entry point you'll actually use on the job. From here we step into the world of push-based collection.

## Standard metrics and their limits

Just by launching, EC2 **automatically ships some metrics to CloudWatch** (standard metrics).

- The **namespace** `AWS/EC2` holds `CPUUtilization`, `NetworkIn/Out`, disk I/O, and more
- But **memory usage and disk (filesystem) usage are not included**

Why aren't they there? Because those are **values inside the OS**. CloudWatch's standard metrics are what the AWS infrastructure (the hypervisor) can see from the outside, so **it can't peek inside the OS to know "how much memory is actually in use" or "what percent of `/` is filled."**

> ⚠️ [The values we looked at by hand with `free` / `df`](/en/posts/observe-server-by-hand/) are exactly this "inside the OS" category. That's why they don't show up in CloudWatch by default either. That's the reason behind "there's no memory graph!"

## Namespaces and dimensions

CloudWatch metrics are organized by namespaces and dimensions.

| Term | Role | Example |
| --- | --- | --- |
| namespace | The **big container** for metrics | `AWS/EC2`, `CWAgent` |
| dimension | A key that **narrows down which one** the value is for | `InstanceId=i-0abc...` |

- The same `CPUUtilization` is split per instance by the `InstanceId` dimension
- The namespace separates things like "AWS standard" vs. "something your own Agent sent"

> 💡 This is close to [Prometheus labels](/en/posts/metric-types-and-collection/). The idea that a single time series is pinned down by "metric name + which one (dimension)" is shared between both.

## Collecting OS internals with the CloudWatch Agent

For memory and disk, which you can't get by default, you install the **CloudWatch Agent (the unified agent)** on the EC2 instance to ship them.

```text
EC2
 ├─ standard metrics (CPU/network) → AWS/EC2 namespace (automatic)
 └─ CloudWatch Agent → memory/disk etc. → CWAgent namespace (custom metrics)
```

- Once you install and configure the Agent, the values equivalent to `free` / `df` show up as graphs as **custom metrics**
- By default the Agent ships to the `CWAgent` namespace, with dimensions like `InstanceId` attached

> ⚠️ Custom metrics are **billable** (costs scale with volume). Don't ship everything — narrow it to what you need. We'll cover cost in one place in Step 8.

## Mapping to the four OSS roles — but the direction is reversed

It clicks once you map it to the roles we built ourselves in [Step 3](/en/posts/build-monitoring-oss/).

| OSS (self-built) | CloudWatch |
| --- | --- |
| node-exporter + scrape (collect) | CloudWatch Agent / standard metrics |
| Prometheus time-series DB (store) | CloudWatch metrics |

- Roughly, **CloudWatch Agent ≒ exporter + scrape, and CloudWatch itself ≒ Prometheus's time-series DB**
- But the collection method is reversed. Prometheus is [pull (it goes and fetches)](/en/posts/metric-types-and-collection/), whereas **CloudWatch is push (the sender pushes)**

## Summary

- EC2 **automatically ships** standard metrics (`AWS/EC2` namespace, CPU/network)
- **Memory and disk live inside the OS, so you can't get them by default** — these are the values we saw with `free` / `df`
- **Namespace = the container, dimension = the key that narrows down which one** (e.g. `InstanceId`)
- Get OS-internal values into the `CWAgent` namespace via the **CloudWatch Agent** (custom metrics = billable)
- The mapping is **Agent ≒ exporter + scrape / CloudWatch ≒ time-series DB**, but it's **push-based** (the reverse of Prometheus's pull)

**Prev:** [Building the four monitoring roles yourself](/en/posts/build-monitoring-oss/)　**Next:** [Visualizing with CloudWatch](/en/posts/cloudwatch-dashboards/) (Step 5 · dashboards)
