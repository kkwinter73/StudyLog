---
title: "Choosing a Migration Strategy — Big Bang, Incremental, or Parallel Run?"
date: 2026-07-08T12:00:00
summary: "Last time we compared migration styles. This time: the decision axes for picking one (downtime tolerance, divisibility, fear of implicit specs), plus the concrete steps and pitfalls of each style."
tags: ["デプロイ", "運用"]
level: intermediate
lang: en
translationKey: migration-strategy-selection
---

[Last time](/en/posts/system-migration-strategy/) we compared cutover styles (big bang / incremental / parallel run) and established the principle of keeping a way back. This post is the sequel: **the decision axes for choosing a style**, and the **concrete steps and pitfalls** once you've chosen.

## Three Decision Axes — Can You Stop, Can You Slice, Are You Scared

Choosing a style isn't a matter of taste — the system's conditions mostly decide it for you. Look at these three.

| Axis | Question | What the answer decides |
| --- | --- | --- |
| **Downtime tolerance** | How long can the service be down? | Whether big bang is even an option |
| **Divisibility** | Can you slice by feature, endpoint, or user segment? | Whether incremental (strangler) is usable |
| **Fear of implicit specs** | How well do you understand the old system's behavior? | Whether to add a parallel run (result comparison) |

> 💡 The three are not mutually exclusive. In practice you **combine** them: "incremental as the base, parallel run only for the scary features, and a small big bang for whatever remains at the end."

## When Big Bang Is Actually Fine

Last time I said "avoid it" — but when the conditions line up, it's the cheapest and fastest style. It's acceptable only when **all** of the following hold.

- **You can stop**: a maintenance window (nights, weekends) long enough for migration + verification + rollback on failure
- **It's small**: a scope whose impact and stakeholders you can fully enumerate (internal tools, an API with a limited audience)
- **You can rehearse**: a full dry run on production-equivalent data is possible beforehand, with the duration actually measured

Three things matter most in execution.

```text
1. Rehearsal        On a production copy, run migrate → verify → roll back end to end, and time it
2. Freeze window    Stop writes during the cutover (the stop time becomes a clean data boundary)
3. Count backwards  Decide up front: "if verification isn't done by X o'clock, we revert unconditionally"
```

> ⚠️ The rollback is part of the rehearsal too. Rehearsing only the migration and improvising the revert on the day is the most dangerous pattern.

## Incremental (Strangler) — How to Execute

If you can slice, this is the default. Route at the front (LB / API gateway) between old and new, and shift traffic to the new side little by little.

- **Move read paths first**: read-only endpoints can fail without corrupting data. Save the write paths for later
- **Cut boundaries along data, not screens**: move features in clusters that read and write the same tables. Cut halfway and old and new fight over the same data — [dual-write](/en/posts/system-migration-strategy/) hell
- **Make progress visible**: keep a list of "endpoints still on the old system" and watch it shrink

> ⚠️ The biggest pitfall is **coexistence becoming permanent**: "the last 20% is hard, we'll do it later" — and years pass while you pay double the operating cost. Set the old system's retirement date first and count backwards from it.

## Parallel Run — How to Execute

When you don't fully understand the old system's behavior (implicit specs are scary), add this as a **pre-cutover stage**. Copy production requests to the new side too (shadow traffic), keep serving the old system's responses, and record the result diffs.

- **Suppressing side effects is priority one**: emails, payments, and external API calls from the new side must be **disabled**. The worst pattern is a "shadow" run that double-charges a customer
- **Triage expected diffs first**: exclude fields that differ by design (timestamps, generated IDs) from the comparison, then treat every remaining diff as a real spec difference and triage it one by one
- **Decide the sample size up front**: set a numeric exit condition like "one week, all traffic, zero diffs → cut over" (don't let it run indefinitely)

> 🧭 In the C# world, GitHub's Scientist (Scientist.NET on .NET) is the same idea as a library: run old and new code side by side and record result diffs — the only difference is whether the subject is a system or a method.

## The Decision Flow — Start Here

```text
Can you stop? ── Yes ──→ Small and rehearsed? ── Yes ──→ Big bang
   │                        │ No
   No                       ↓
   ↓                    Reconsider whether you can make it sliceable
Can you slice? ── Yes ──→ Incremental (read paths → write paths)
   │                        + parallel run only for the scary features
   No
   ↓
Exhaust verification with a parallel run, then commit to a big bang
(= the most expensive combination. Question the un-sliceable design itself)
```

If you land on "can't slice and can't stop," that's not a migration-style problem — it's an
**un-sliceable design problem**. Using the migration as the occasion to redraw module boundaries is a legitimate option.

## Summary

- The decision axes are **can you stop (downtime), can you slice (divisibility), are you scared (implicit specs)**
- **Big bang is rational with conditions**: only when stoppable + small + rehearsed all hold
- **Incremental goes read paths first**. Cut boundaries along data clusters, and set the old system's retirement date up front to prevent permanent coexistence
- **In a parallel run, disable side effects first**. Decide a numeric exit condition before you start
- The three styles **combine** rather than exclude each other. If none fits, question the design's divisibility itself

**Related:** [Migrating From an Old System to a New One](/en/posts/system-migration-strategy/) / [Deploy Rollback Strategies](/en/posts/deploy-rollback-strategy/) / [DB Schema Migration — expand-contract](/en/posts/db-schema-migration-expand-contract/)
