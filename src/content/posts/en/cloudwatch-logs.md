---
title: "Collecting Logs with CloudWatch Logs — Structured Logs and Logs Insights"
date: 2026-07-02T14:00:00
summary: "Gather logs from multiple services in one place and search across them. To trace scattered footprints, first structure your logs as JSON. We cover log groups/log streams, Logs Insights queries, and when to reach for metrics vs. logs."
tags: ["監視", "AWS", "運用"]
level: intermediate
lang: en
translationKey: cloudwatch-logs
---

Monitoring curriculum (7/9). [Last time](/en/posts/cloudwatch-dashboards/) we visualized metrics. But "the error rate went up — okay, **what** actually happened?" is something metrics can't tell you. This is where **logs** come in. We look at **CloudWatch Logs**, which gathers logs from multiple services into one place for cross-cutting search, and at when to use metrics vs. logs among the [three pillars](/en/posts/observability-basics/).

## The problem of scattered logs

Once you have multiple services, logs end up spread all over the place.

- You don't know which server or which container's logs to look at
- The **footprint of a single request** is scattered across multiple services, and you can't follow it

So you need a mechanism to **collect logs from everywhere into one place and search them together**.

## Structured logs (JSON)

Before collecting them, make the logs themselves easy to search. Instead of plain strings, emit **JSON (structured logs)**.

```json
{"level":"ERROR","requestId":"abc-123","message":"payment failed","userId":42}
```

- At a minimum, include keys for **request ID, log level, and message**
- You can search and aggregate by key. "Only `level=ERROR`" or "thread everything by `requestId=abc-123`" is a one-liner

> 🧭 Same idea as structured logging with Serilog or `ILogger` in C#. Rather than building strings with `string.Format`, emitting **keyed values** makes downstream searching and aggregation dramatically easier.

## Log groups and log streams

CloudWatch Logs holds logs in two levels.

| Term | Role | Example |
| --- | --- | --- |
| Log group | The **container** for logs (per app/purpose) | `/myapp/api` |
| Log stream | A **continuous flow** from a single source | Logs from one container/instance |

- A log group = "all the logs for this app"; a log stream = "the portion from this one instance within it"
- You send logs here via the CloudWatch Agent or your app's SDK

## Querying with Logs Insights

You search and aggregate the collected logs with **Logs Insights**. Queries flow by **chaining with `|` (pipes)**.

```text
fields @timestamp, level, requestId, message
| filter level = "ERROR"          # narrow down first
| filter requestId = "abc-123"    # thread by a specific request
| sort @timestamp desc
| limit 20
```

- **System fields** like `@timestamp` are added automatically. Keys from your JSON logs can be used as conditions directly
- **Put `filter` early**. The sooner you narrow down, the faster the rest runs
- You can aggregate too: `stats count(*) by level` gives you "counts by level"

> 💡 Narrow by `level` first, then thread a single request by `requestId` — this is the basic move for following scattered footprints. If you've structured your logs, `filter requestId = ...` on one line does the job.

## When to use metrics vs. logs

Combined with the [dashboards from last time](/en/posts/cloudwatch-dashboards/), incident response becomes a single continuous flow.

```text
1. Notice via metrics    The dashboard's error rate went up (how much)
2. Pin down the window   When it went up
3. What, via logs        Filter the same window in Logs Insights (what happened)
```

- **Metrics** = "notice something's wrong, and how much"; **logs** = "the details of what happened"
- Go back and forth: "the window when the error rate rose" → "the ERROR logs from that time"

## Summary

- Gather logs from multiple services **into one place and search across them** (CloudWatch Logs)
- First make **structured logs (JSON)**. You can search and aggregate by key, and thread by `requestId`
- **Log group = container, log stream = the flow from a single source**
- **Logs Insights** is a `fields | filter | stats` pipeline. **Put filter early**
- The division of labor: **notice via metrics → what happened via logs**. Go back and forth by time window to zero in on the cause

**Prev:** [Visualizing with CloudWatch](/en/posts/cloudwatch-dashboards/)　**Next:** Distributed tracing (Step 7 · X-Ray / OpenTelemetry)
