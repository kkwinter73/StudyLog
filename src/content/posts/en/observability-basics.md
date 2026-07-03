---
title: "Monitoring and Observability — the Big Picture of Metrics, Logs, and Traces"
date: 2026-07-01T19:00:00
summary: "Production systems run where you can't watch them. Monitoring is how you know whether things are working now, and what happened when they weren't. A map before you start: monitoring vs observability, and the three pillars (metrics/logs/traces)."
tags: ["監視", "運用", "基礎"]
level: beginner
lang: en
translationKey: observability-basics
---

Monitoring curriculum (1/9). Before touching any tool, grasp **why we monitor** and the **big picture**.
While developing, you run the app on your own machine and check it with your eyes. Production is
different: it runs somewhere you can't see, serving many users' actions continuously. Monitoring is
how you observe that state from a distance.

## Why monitor

The decisive difference between development and production is "can you be there to watch it?"

- In development: you run it locally, and logs and errors are right in front of you
- In production: it runs on another server, under many users' traffic — and **you are not there**

So you need a way to know, **even from afar**, "is it working right now?" and "what happened when it
wasn't?" That's monitoring. Conversely, **just being up doesn't mean it's working correctly** — a
process can be alive yet slow, returning errors, or partially broken.

> 💡 Monitoring earns its keep when it can detect "the server is alive, but users can't use it."
> Watching process liveness alone is not enough.

## Monitoring vs Observability

Similar words, different viewpoints.

| | Monitoring | Observability |
| --- | --- | --- |
| Question | Are the **predefined** signals healthy? | Can you **ask, after the fact**, what's happening? |
| Example | Alert when CPU > 80% | Dig into "why is only this request slow?" |
| Good at | Detecting known problems | Investigating **unknown** problems |

- **Monitoring** assumes you know the failure modes, sets thresholds, and watches them
- **Observability** assumes you don't know what will happen, so you keep enough data to query freely later

> 🧭 It helps to see monitoring as a subset of observability. First emit enough data (the three pillars
> below), then do both: "watch the defined anomalies (monitoring)" and "explore the unknown (observability)."

## The three pillars — metrics, logs, traces

The data behind observability comes in roughly three kinds. In one word each:

| Pillar | In a word | Example |
| --- | --- | --- |
| Metrics | **numbers** (how much) | CPU usage, request count, error rate |
| Logs | **events** (what happened) | "exception on order id xxx" |
| Traces | **path** (where it went) | which of A→B→C took the time |

- **Metrics**: numeric time series. Great for aggregation, graphing, threshold alerts. Cheap
- **Logs**: records of individual events. Detailed, but high in volume
- **Traces**: the path and timing of one request across multiple services. Shines in distributed systems

## How to use them together

In incident response, you use the three by dividing roles. A typical flow:

```text
1. Notice the anomaly with metrics   (error rate went up = how much)
2. Find out what happened with logs   (exceptions in that window = what)
3. Locate where with traces           (which of A→B→C = the path)
```

- **Metrics** to "notice," **logs** for the "detail of what," **traces** for "where"
- No single one is enough. You **move between the three** to reach the cause

> ⚠️ Dumping tons of logs won't help you "notice," and metrics alone won't tell you "why."
> Emitting all three from the source is the prep work of observability.

## Summary

- Production runs out of sight; monitoring is **how you know its state from afar**
- Up ≠ working correctly. You must watch for **slowness, errors, partial failures**
- **Monitoring = watching defined anomalies**, **observability = being able to query the unknown later**. Monitoring is a subset
- The three pillars are **metrics (numbers), logs (events), traces (path)**
- Incident response **moves between the three**: notice with metrics → what with logs → where with traces

**Next:** Observe a server by hand (Step 1 · reading the raw numbers the OS and processes hold)
