---
title: "A Symptom-Based Troubleshooting Cheat Sheet — Let What Happened Decide Where You Look First"
date: 2026-07-06T12:00:00
summary: "\"Errors are up\", \"it got slow\" — deciding in advance which of logs, traces, or metrics you open first for each symptom makes your first response faster. Four typical symptoms in one cheat sheet, plus the reasoning behind the mapping."
tags: ["監視", "運用"]
level: intermediate
lang: en
translationKey: symptom-based-troubleshooting
---

Monitoring curriculum, supplement. The [three pillars](/en/posts/observability-basics/) (logs, metrics, traces) are about the tools — but when an incident actually hits, what you hesitate over is "**which tool do I pick up first?**" Keeping a symptom → where-to-look-first → what-to-suspect cheat sheet ready makes the first response faster.

## The Cheat Sheet

| Symptom | Look first at | Suspect |
| --- | --- | --- |
| **Error rate went up** | Logs — what the 4xx/5xx say, and which endpoint | Only specific requests → your app / everything → infra or dependencies |
| **Latency went up (no errors)** | Traces — which span is slow | DB and external API calls |
| **Only one endpoint is slow / erroring** | That service's logs and traces | Right after a deploy → the latest change |
| **Everything is slow AND resources are strained** | Metrics — CPU, memory, connection counts | Under-scaling or a leak |

> 💡 Roughly: "**errors → logs, slowness → traces, everything → metrics**". You start from the pillar with the richest information about that particular failure mode — you can derive it, no memorizing required.

> 🧭 Application Insights in C#/.NET has the same structure: the Failures blade (enter from errors) and the Performance blade (enter from slowness) map straight onto the first two rows of this table.

## Why the Mapping Works — Two Axes: "Errors or Not" and "Scope"

The cheat sheet is built from the combination of two questions.

- **Are errors coming out?** If yes, you have **textual clues** — error messages and stack traces — so start with [logs](/en/posts/cloudwatch-logs/). If it's slow with no errors, what you want is **the breakdown of time** — where it's being spent — so start with [traces](/en/posts/distributed-tracing-otel/).
- **Is the scope specific or global?** If only certain endpoints or requests are affected, the cause lives in that code path (= your app). If everything is affected, the suspects are things everyone shares: infra, the DB, dependencies, resources.

> ⭐ Narrow the scope first, dig deep later. Just confirming "global or specific?" in the first minute cuts your suspect list in half.

## Digging Into Each Symptom

### Error rate went up → logs

First check whether it's 4xx or 5xx. **4xx points at the client side** (malformed requests, expired auth, a client bug or release); **5xx points at the server side**. Then check which endpoints the errors cluster on to establish scope: specific → that handler's logs; global → suspect DB connections or a failing dependency.

### Latency went up (no errors) → traces

Slowness without errors usually means **some call somewhere is slow**. Look at the [span breakdown](/en/posts/distributed-tracing-otel/) of a request and you can name the culprit: "800ms in a DB query", "2s waiting on an external API". In practice, the top suspects are the DB and external API calls.

### Only one endpoint is slow / erroring → that service's logs and traces

With the scope already narrow, the cause is usually confined to that code path too. **Right after a deploy, suspect the latest change first** — reading the diff or rolling back is often faster than digging through logs.

### Everything is slow AND resources are strained → metrics

If the whole system is uniformly heavy, the problem isn't individual requests but **the foundation (resources)**. Compare CPU, memory, and connection-count metrics against your [normal baseline](/en/posts/metrics-baseline-and-thresholds/). The classics are under-scaling against increased load, or a leak (memory, connections) that grows over time.

## Two Things to Check First, Whatever the Symptom

Before the cheat sheet, there are two universal checks.

- **Did we deploy recently?** A large share of incidents trace back to the latest change. Whatever the symptom, "what did we change last?" is the first thing to recall.
- **Did [traffic](/en/posts/traffic-monitoring-signal/) change?** If load doubled, the slowness and the resource strain might both be explained by "more access". Read values together with their context.

## Summary

- Keep the symptom → where-to-look mapping ready **in advance** (don't figure it out mid-incident)
- Rule of thumb: "**errors → logs, slowness → traces, everything → metrics**"
- The table derives from two axes: "**errors or not**" × "**scope (specific or global)**"
- Only one endpoint affected, right after a deploy → **the latest change** is suspect number one
- Whatever the symptom, check **the latest deploy** and **traffic changes** first

**Related:** [Monitoring, Observability, and the Three Pillars](/en/posts/observability-basics/) / [Distributed Tracing](/en/posts/distributed-tracing-otel/) / [There Is No Absolute Normal for Metrics](/en/posts/metrics-baseline-and-thresholds/)
