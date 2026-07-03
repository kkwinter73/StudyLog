---
title: "SLOs and Error Budgets — Deciding What Counts as Abnormal"
date: 2026-07-03T13:00:00
summary: "A dashboard only helps if someone is watching. Before that, you need a definition of what counts as abnormal. That's SLIs, SLOs, and error budgets — set targets numerically and make operational calls from how much failure you can afford."
tags: ["監視", "運用"]
level: intermediate
lang: en
translationKey: slo-and-error-budget
---

Monitoring curriculum (9/9, part 1). By [last time](/en/posts/distributed-tracing-otel/) we had metrics,
logs, and traces. But without a definition of "what counts as abnormal," alerts and operational decisions
wobble. That's what **SLIs, SLOs, and error budgets** define. First, set the bar as a number.

## Why you need a bar

A [dashboard](/en/posts/cloudwatch-dashboards/) only catches problems if someone is watching, and since
[there's no absolute "normal" value for a metric](/en/posts/metrics-baseline-and-thresholds/), you need a
**per-service target** decided up front for what "healthy" means.

- Without a target, "is this abnormal?" gets re-litigated every time
- With a target, you judge by "met / missed," and it becomes the basis for alerts

## SLI, SLO, error budget

The three-piece set for treating reliability as numbers.

| Term | Meaning | Example |
| --- | --- | --- |
| SLI | the Indicator you measure | request success rate |
| SLO | its Objective (target) | 99.9% over 30 days |
| Error budget | the failure you can afford | 100% − 99.9% = **0.1%** |

- **SLI** is "what you use as the reliability yardstick." Often derived from [RED](/en/posts/what-to-measure-metrics/) (success rate, latency)
- **SLO** is its target value. Don't aim for 100% (unrealistic and expensive)
- **Error budget** is the "you may fail this much" budget — the flip side of the SLO

> 💡 Example: if the target is 99.9% success over 30 days, the error budget is 0.1%. At 10M requests/month
> that's a concrete **~10,000 failures within "expected"**.

## Using the error budget

The error budget shines as a **decision input** for both development and operations.

- **Budget remaining**: some risk is fine — you can push new releases and experiments
- **About to run out / exhausted**: play defense — prioritize stabilization, slow releases
- **Burn rate (consumption speed)**: how *fast* you're spending the budget. Rapid burn signals an imminent problem

> ⚠️ Chasing "zero errors" invites excessive stabilization cost and stalled feature work. The SLO philosophy is
> to hold a budget that **deliberately allows some failure**.

## How to set an SLO

Don't start strict. Set it to reality and grow it as you operate.

- Pick one SLI (e.g., request success rate)
- Write the SLO as a **number** (e.g., 99.9% over 30 days). Start near your current measured value
- Choose indicators tied to user impact ("is it usable?" over resource utilization)

> 💡 Just like [growing thresholds from incidents](/en/posts/metrics-baseline-and-thresholds/), SLOs get
> revised as you operate. You can't pick the perfect value on day one.

## Summary

- Judging abnormality needs a **per-service target**: SLI, SLO, error budget
- **SLI** = the measured indicator, **SLO** = its target, **error budget** = affordable failure (100 − SLO)
- Push while budget remains, defend when it's spent. Watch the **burn rate** for consumption speed
- Set SLOs on **user-impact** indicators, from realistic values, and **grow** them
- Don't aim for 100% — treat it as a budget that **deliberately allows failure**

**Prev:** [Distributed tracing](/en/posts/distributed-tracing-otel/)　**Next:** [Alert design (Alarms, SNS, composite alarms)](/en/posts/cloudwatch-alarms-and-alerting/) (part 2)
