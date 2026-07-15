---
title: "Old-vs-New API Response Diffing — Same Input, Same Answer?"
date: 2026-07-15T11:00:00
summary: "A migration that rewrites an endpoint needs proof that 'the new returns the same answer as the old.' Here's the technique of throwing the same input at both old and new and diffing the responses: the record-replay and shadow (mirror) methods, normalizing the differences that never fully match (timestamps, ordering, generated IDs), and running the new side-effect-free in the shadows to raise the match rate before switching over."
tags: ["テスト", "運用"]
level: intermediate
lang: en
translationKey: api-response-diffing
---

A migration that rewrites an old API into a new one can't switch over without confirming "**the new returns the same answer as the old**."
The surest way is to **throw the same input at both old and new and diff the responses**.
This is the substance of the "old-vs-new comparison" in [migration testing](/posts/migration-testing/). This post lays out how to actually run it.

## Why diff — test cases alone aren't enough

The goal of a rewrite is "the same behavior as before." But **hand-written test cases can't cover production input**.

- Production always carries **edge inputs, old data, and unexpected combinations** not in the spec
- Whether the new returns **the same** answer the old did for those, you can't know until you compare on the same input
- So running **real production requests** through old and new and diffing the responses is the surest way

> ⭐ Diffing doesn't prove "the new is correct" on its own — it surfaces the **difference from the old**. In a migration,
> the requirement is often "**same as now**" rather than "the ideal correct answer," and this method targets exactly that.

## Two methods — record-replay and shadow

There are broadly two ways to compare, chosen by side-effect risk and ease of implementation.

| Method | How | Fits when |
| --- | --- | --- |
| Record-replay | **record the old's inputs and responses**, later replay the same inputs to the new and compare | you want to retry safely / run offline |
| Shadow (mirror) | **duplicate** production requests to the new too, **discard** its response, compare old vs new | you want production-equivalent load and freshness |

```text
Shadow (mirror) method:
user ─▶ old API ─▶ response (only this returns to the user)
          └─(copy)─▶ new API ─▶ response (discarded; only recorded for comparison)
```

> 💡 Shadow's crux is **not returning the new's response to the user**. The old always answers the user, so even if the new is wrong,
> the impact is zero. You accumulate diffs behind the scenes. It's the standard way to "try the new safely in production."

## Handling diffs — know that exact match is impossible

Compare naively and even a correct result is full of diffs. Killing the **differences you can ignore** first is the real work of diffing.

- **Diffs to normalize away**: timestamps, the **ordering** of arrays or JSON keys, assigned **IDs**, floating-point rounding, whitespace
- **Define tolerated diffs**: write down "this field may vary a bit." Decide up front what counts as a match
- **Leave only real diffs**: only after killing the noise do **meaningful diffs** — wrong values, missing data, misread specs — surface

> ⚠️ Skip normalization and there are so many diffs no one looks, and the diffing goes hollow. Over-normalize and you hide real diffs.
> Treat **the line for "diffs you can ignore" as itself subject to review.**

## Run it safely, raise the match rate, then switch

Since you expose the new to production traffic, mind **side effects and load**.

- **The new emits no side effects**: keep it read-only, or make it a **stand-in with writes/charges/notifications disabled**. Double-charging is an incident
- **Mind performance**: the load of running both old and new. You can compare a **sample** rather than everything
- **Measure progress by match rate**: each diff you kill raises the match rate. Only **once it's high enough** point reads at the new (connects to [cutover method](/posts/system-migration-strategy/))

> 🧭 Running both old (control) and new (candidate), **returning the old's result to the user while recording the diff**, is
> known as GitHub's "Scientist" pattern — .NET has `Scientist.NET` too. The idea is to embed diffing in the code.

## Summary

- Old-vs-new response diffing throws the same input at both and **diffs the responses**. It targets the migration requirement "same as the old"
- Hand-written tests **can't cover production input**. Comparing on real requests is the surest way
- The methods are **record-replay** (safe, offline) and **shadow/mirror** (production-equivalent; discard the new's response)
- Exact match is impossible. Normalize **timestamps, ordering, generated IDs**, define **tolerated diffs**, and leave only real diffs
- Run the new as a **side-effect-free stand-in**, raise the **match rate**, then switch. The Scientist pattern works as a template

**Related:** [Data Migration](/posts/data-migration/) / [Migration Testing](/posts/migration-testing/) / [Migrating from Old to New System](/posts/system-migration-strategy/) / [Idempotency Key Implementation](/posts/idempotency-key-implementation/)
