---
title: "There's No Absolute Normal for Metrics — Baselines and Thresholds"
date: 2026-07-02T09:00:00
summary: "Is 80% CPU a problem? The answer depends on the service. Metrics aren't inherently good or bad—you can only judge whether something is wrong by looking at the deviation from the normal baseline together with the context behind why a value moved. And thresholds are set individually, learned from experience."
tags: ["監視", "運用"]
level: intermediate
lang: en
translationKey: metrics-baseline-and-thresholds
---

Monitoring curriculum, supplement (continuing from [Observing a Server by Hand](/en/posts/observe-server-by-hand/) and [What to Measure](/en/posts/what-to-measure-metrics/)).
Once you can read metrics, the next thing you run into is the question: "**OK, but is this number actually a problem?**"
There's a trap here—metrics have **no absolute normal value**. Let's sort out how to make the call.

## There's no inherently good or bad value

"Is 80% CPU a problem?" The answer **depends on the service**.

- On a batch-processing server, running near 100% CPU during a job is **actually normal** (it's using every resource to get work done).
- On an API that's supposed to be lightly loaded, a constant 80% might be **a sign that something is wrong**.

The same number can mean the exact opposite depending on the nature of the service. That's why you can't judge from a number alone—"if it goes over X%, it's dangerous."

> ⚠️ The [four golden signals and RED](/en/posts/what-to-measure-metrics/) tell you *which* metrics you should measure. But whether a given value is **healthy** isn't determined by the metric's name alone.

## Judge by deviation from the baseline

The foundation for the call is the **normal-state baseline**. Know the "wave" your service usually traces.

- Metrics trace **periodic waves** over a day or a week (the daytime peak, the overnight trough, weekdays vs. weekends, monthly batch jobs…).
- Whether something is wrong comes down to "**how does this compare to the usual value for this time of day, this day of the week?**"

```text
Normal-state wave (e.g., peaks during the day)
  ┌─╮      ┌─╮      ┌─╮
──┘  ╰──┘  ╰──┘  ╰──   ← this is "usual"
              ↑ only this spiked = deviation from usual = worth a look
```

> 💡 Judge by "the difference from usual," not by an "absolute value." That's why monitoring starts by **recording the normal state and learning its shape**.

## Look at the value and the cause together

Even when something deviates from the baseline, that alone doesn't make it "a problem." You need the context of **why** it moved.

- CPU spiked → maybe traffic just went up because of a campaign (expected).
- Error rate went up → maybe the deploy right before it is the cause (a problem).

Even for the same "the value went up," if the cause is expected it's healthy, and if it's unexpected it's a problem. You can only make the call once you combine **the movement of the value with the context behind it**.

## Set thresholds individually, from experience

That's why thresholds also **can't be set mechanically** as "if it goes over X, it's dangerous."

- When a problem actually happens, you investigate the cause and learn "**when this number moved this way, the service was not healthy.**"
- You then set thresholds **individually for those specific points you've learned about**.
- This accumulation becomes "the feel for this service."

> 💡 Thresholds aren't something you get perfect from the start—they're something you **grow with every incident**. That's why symptom-based alerts (SLO violations) are preferred: instead of the absolute value of a resource, they let you base alerts on user impact—the thing that actually hurts (details in Step 8).

## Summary

- Metrics have **no absolute normal value**. The same 80% CPU means different things depending on the service.
- The foundation for judging anomalies is the **normal-state baseline**. Know the daily and weekly waves, and look at the **deviation** from them.
- Read the movement of a value **together with the context of its cause**. Up doesn't mean bad.
- Set thresholds not mechanically but by **learning from incidents and growing them individually**.
- This sense is something you **build up per service, through experience**. There's no shortcut.

**Prev:** [What to Measure (the four golden signals and RED)](/en/posts/what-to-measure-metrics/)　**Related:** [Observing a Server by Hand](/en/posts/observe-server-by-hand/)
