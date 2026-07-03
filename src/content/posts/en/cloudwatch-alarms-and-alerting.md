---
title: "Alert Design — CloudWatch Alarms, SNS, and Alerting on Symptoms"
date: 2026-07-03T14:00:00
summary: "From humans watching a screen to being told automatically when something breaks. CloudWatch Alarms and SNS, composite alarms that combine several, and alerting on SLO violations (symptoms) rather than resource thresholds — plus avoiding alert fatigue. The finale of the monitoring series."
tags: ["監視", "AWS", "運用"]
level: intermediate
lang: en
translationKey: cloudwatch-alarms-and-alerting
---

Monitoring curriculum (9/9, part 2 — the finale). In [part 1](/en/posts/slo-and-error-budget/) we defined
"what counts as abnormal" with SLOs. Now we make it **tell us automatically** — CloudWatch Alarms, SNS,
composite alarms — and design to **alert on symptoms**, wrapping up the series.

## From dashboards to automatic notification

A [dashboard](/en/posts/cloudwatch-dashboards/) only catches problems if someone is watching — impossible
overnight or on weekends. So you need alerting: **define the abnormal condition, and notify automatically when it's crossed**.

## CloudWatch Alarm and SNS

A CloudWatch Alarm goes into the `ALARM` state when a metric meets a condition. Notifications go out via **SNS**.

```text
metric (e.g., error rate)
  → CloudWatch Alarm (threshold + period)
    → ALARM state
      → SNS topic → email / Slack, etc.
```

- Set a "threshold" and a "duration" on the alarm (don't fire on a momentary blip)
- Notifications go through an **SNS topic** — fan out to email, Slack, Lambda, and more

## Composite alarms

A single metric alone fires too often or lacks context. A **composite alarm** doesn't watch metrics directly;
it **combines other alarms with AND / OR / NOT** to decide its own state.

```text
composite = (high_error_rate AND high_traffic)   # fire only when both hold
```

- You can express **combinations** like "fire only when the error rate is high AND there's traffic"
- For SLO burn-rate monitoring, pairing **alarms with different windows** under a composite alarm is the standard pattern

## Alert on symptoms

The most important lever for alert quality. Rather than a **resource threshold** like "fire when CPU > 80%,"
it's better to fire on an **SLO violation (a symptom that users are hurting)**.

| Style | Example | Problem |
| --- | --- | --- |
| Resource threshold | CPU > 80% | May be high with no real harm. Breeds false alarms |
| Symptom (recommended) | error rate / latency broke the SLO | You alert on **what actually hurts** |

- High CPU is fine [if users can still use it](/en/posts/metrics-baseline-and-thresholds/); conversely, normal CPU but slow is a problem
- Firing when the [error budget](/en/posts/slo-and-error-budget/) **burn rate** is fast is the symptom-based implementation
- On AWS, **CloudWatch Application Signals** lets you define and monitor SLOs and alarm on burn rate

> ⚠️ Base alerts on "user impact is happening," not "resources are tight." Symptom-based alerting **fires on the
> result regardless of cause**, so it catches unknown failures too.

## Avoiding alert fatigue

Alerts that fire too much eventually get **ignored** (the biggest risk). Principles to cut it down:

- **Lean toward symptom-based** (fewer resource-threshold false alarms)
- Use **composite alarms** so only "genuinely bad combinations" fire
- Notify only for things that **require action**. Send informational stuff to a separate channel

## Wrapping up the monitoring series

We've gone full circle on how CloudWatch handles [the four OSS roles built in Step 3](/en/posts/build-monitoring-oss/).
Finally, the trade-offs of adopting the managed option (CloudWatch):

- **Benefits**: no need to run the monitoring platform itself / integrated with AWS / standard metrics collected automatically
- **Cautions**: **billing** scales with metric/log/trace volume and custom metrics / non-AWS systems are separate / vendor lock-in

> 💡 The whole picture: **collect & store ([metrics](/en/posts/cloudwatch-metrics/), [logs](/en/posts/cloudwatch-logs/))
> → visualize ([dashboards](/en/posts/cloudwatch-dashboards/)) → path ([traces](/en/posts/distributed-tracing-otel/))
> → the bar ([SLOs](/en/posts/slo-and-error-budget/)) → notify (alerts)**. That's a full lap of monitoring.

## Summary

- From watching screens to **automatic notification on anomalies** (CloudWatch Alarm → SNS)
- **Composite alarms** combine other alarms with AND/OR/NOT — fire on combinations
- Prefer **symptom-based (SLO violation / burn rate)** over resource thresholds
- Avoid **alert fatigue**: symptom-based + composite, notify only what needs action
- Managed wins on **no-ops / integration / auto-collection**; watch **billing / non-AWS / lock-in**

**Prev:** [SLOs and error budgets](/en/posts/slo-and-error-budget/)　Monitoring curriculum complete 🎉
