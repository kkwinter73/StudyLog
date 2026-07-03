---
title: "Distributed Tracing — Finding Where It's Slow with OpenTelemetry and X-Ray"
date: 2026-07-03T12:00:00
summary: "Metrics tell you the API is slow, but not where. Tracing follows one request across multiple services. Instrument with vendor-neutral OpenTelemetry and ship to X-Ray via ADOT."
tags: ["監視", "AWS", "運用"]
level: intermediate
lang: en
translationKey: distributed-tracing-otel
---

Monitoring curriculum (8/9). Through [last time](/en/posts/cloudwatch-logs/) we covered metrics and logs.
But once a service splits into many, it's hard to tell "where in A→B→C did it get slow or fail?" That's
where **tracing** comes in. Instrument with the **OpenTelemetry** standard; on AWS, ship traces to
**X-Ray** via **ADOT**.

## Metrics can't tell you "where"

Recall the role split of the [three pillars](/en/posts/observability-basics/):

- **Metrics**: notice that "the API is slow" (how much)
- **Logs**: the detail of "what happened"
- **Traces**: as services call A→B→C internally, **where** the time went (the path)

Metrics say "slow" but not "where." Tracing fills that gap.

## Traces and spans

A trace represents one request as a nested structure.

| Term | Meaning |
| --- | --- |
| Trace | The record of **one whole request** (end to end) |
| Span | An **individual operation** within it (a service call, a DB query, etc.) |

```text
Trace: GET /order/42                 [============ 320ms ============]
  ├─ span: API handler               [== 20ms ==]
  ├─ span: call payment service         [====== 250ms ======]  ← slow here
  └─ span: write DB                                    [== 40ms ==]
```

- Spans have **parent/child** relationships; connected, they show the request's path and per-step timing
- "The payment-service span is 250ms" → you can **pinpoint what's slow** at a glance

## OpenTelemetry — vendor-neutral instrumentation

Getting traces requires **instrumentation** in the app. Use the standard, **OpenTelemetry (OTel)**.

- **Vendor-neutral**: instrument once; choose or change the destination later (X-Ray, CloudWatch, another backend)
- Instrumenting each service with its own vendor SDK leads to fragmentation and rework whenever you switch destinations. OTel avoids that.

```go
// OTel instrumentation sketch: wrap work in a span
ctx, span := tracer.Start(ctx, "call-payment")
defer span.End()
// call the payment service here (its duration lands on this span)
```

> 🧭 In C#/.NET too, you can instrument with the OpenTelemetry SDK (built on `System.Diagnostics.Activity`)
> and pick X-Ray as the destination. Instrumenting with **the same standard across languages** is OTel's value.

## Shipping to X-Ray with ADOT

To view traces on AWS, send the collected spans to **X-Ray**. The bridge is **ADOT (AWS Distro for OpenTelemetry)**.

```text
Go service (instrumented with OTel) → ADOT Collector → AWS X-Ray (ServiceLens trace map)
```

- The X-Ray trace map visualizes the **A→B→C** spans and their durations
- ADOT is the AWS distribution of OTel; it can trace across systems including those outside AWS

## X-Ray SDK is going into maintenance mode

This matters **if you're starting now**. The old X-Ray-specific SDK is winding down.

- **The X-Ray SDKs/Daemon enter maintenance mode on Feb 25, 2026 and reach end-of-support on Feb 25, 2027** (security fixes only afterward, no new features)
- AWS is moving its instrumentation standard **to OpenTelemetry**. For new work, **OTel/ADOT-based is recommended**
- However, **the X-Ray service itself continues** (adding native OTel support and CloudWatch Transaction Search). X-Ray "as a destination" is alive and well

> ⚠️ Don't copy older articles' "use the X-Ray SDK directly" steps. Instrumenting with **OpenTelemetry (ADOT)
> from the start** is the right move when you're beginning today.

## Summary

- Tracing fills in "**where** it's slow/failing" (after metrics = notice, logs = what)
- **Trace = one whole request, span = an individual operation** within it (connected by parent/child)
- Instrument with **vendor-neutral OpenTelemetry**; instrument once, choose the destination
- On AWS, ship via **ADOT** to **X-Ray** and read the path and timing on the trace map
- **X-Ray SDK is in maintenance mode (Feb 2026) → new work uses OTel/ADOT**. The X-Ray service itself continues

**Prev:** [Collecting logs with CloudWatch Logs](/en/posts/cloudwatch-logs/)　**Next:** SLOs and alert design (Step 8, the finale)
