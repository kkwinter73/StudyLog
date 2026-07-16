---
title: "preflight → migrate → validate — The Three Gates for Actually Running a Migration"
date: 2026-07-15T19:00:00
summary: "Even with your migration tests in place, the moment you run it once in production is a different problem. Wrap the execution in three gates — preflight (decide to abort before touching anything), migrate (run it safely), validate (confirm success by the numbers and decide go/rollback) — and you get an execution procedure that doesn't blow up. Not just for data migration: it's the common shape for running any risky, hard-to-reverse change once."
tags: ["運用", "テスト"]
level: intermediate
lang: en
translationKey: preflight-migrate-validate
---

Even if your [migration tests](/posts/migration-testing/) are lined up per phase, **the moment you actually run it once in production** is a separate problem.
Testing is about "building quality in"; execution is about "not blowing up." This post lays out the shape for
**running a migration or a high-risk change once**, wrapped in three gates: **preflight → migrate → validate**. It works
not just for data migration but for any "run a hard-to-reverse change once" situation — schema changes, cutovers, bulk updates.

## The big picture — wrap execution in three gates

Guard the "run it" step (migrate) with gates before and after (preflight / validate). The key: **any gate fails, you stop.**

```text
          ┌── NG ─▶ abort (nothing touched yet)
Preflight ┤
          └── OK
               │
               ▼
            Migrate ── fail ─▶ rollback
               │
               ▼
          ┌ Validate ┐
   OK ◀───┘          └───▶ NG ─▶ rollback
 (done, committed)
```

| Gate | When | Role | On failure |
| --- | --- | --- | --- |
| preflight | **before** touching | confirm prerequisites; if not, **don't start** | abort (unharmed) |
| migrate | **during** | run the body safely (idempotent, resumable, logged) | rollback |
| validate | **after** running | confirm success criteria by the numbers | rollback |

> ⭐ The gate that pays off most is **preflight**. Most accidents come from "starting in a state you shouldn't have."
> Stopping **while nothing has been touched yet** is the cheapest and safest way to fail.

## ① Preflight — decide to "abort" before touching anything

The **abort-decision gate** before migrate. This isn't "prepare to run" — it's for **finding conditions under which you must NOT run**.
If even one check trips, abort without touching the body at all.

Typical checks:

- Is there a **backup / a way back** ([rollback strategy](/posts/deploy-rollback-strategy/) — if you can't revert, don't run)
- Has the **rehearsal passed** (did you run the [migration rehearsal + reconciliation](/posts/migration-testing/) on a prod copy)
- Are the **window and dependencies** satisfied (within allowed downtime, upstream jobs done, no clash with other changes)
- **Input data health** (are row counts, NULL rate, duplicates within expectation — if off by an order of magnitude, stop)
- Is there an **idempotency key / lock** to prevent double runs or interruption

```bash
#!/usr/bin/env bash
set -euo pipefail   # any failure aborts immediately (never proceed to the body)

preflight() {
  test -f "$BACKUP" || { echo "no backup"; exit 1; }        # can we revert?
  [ "$(count_source)" -le "$MAX_ROWS" ] || { echo "too many rows"; exit 1; }
  in_maintenance_window || { echo "outside window"; exit 1; } # the window
}
preflight   # migrate is never called until this passes
```

> 🧭 Same idea as lining up argument-check guard clauses at the top of a C# method, returning/throwing early so the
> body never runs on bad state. Preflight is that **"guard clause before execution," lifted into your ops procedure**.

## ② Migrate — run the body safely

Once past preflight, run the body. What matters here isn't speed but the property that **damage is minimized even if it dies mid-run**.

- **Idempotent**: same run any number of times → same result. Re-running after a mid-run failure stops being scary
- **Resumable**: record progress (how far you got) so you can resume from the failure point. Avoid redoing everything
- **Leave a record**: log what, when, and how much you processed. It feeds both validate and root-cause analysis
- **Run in chunks**: batches instead of one shot narrow the blast radius of a failure and make resume finer-grained

> ⚠️ "It ran to the end without errors" is not success. A transform bug **quietly inserts wrong values and finishes.**
> "Did it run" and "did the right data land" are separate — confirmed at a separate gate (validate).

> 💡 Being idempotent and resumable means that even if an unforeseen issue preflight couldn't catch shows up mid-run,
> you can **stop safely, fix it, and resume**. In production, being able to stop and resume beats a fast one-shot gamble.

## ③ Validate — confirm success by the numbers, decide go / rollback

The gate "after" you finish. **Judge against success criteria decided in advance, by the numbers — not a subjective "seems fine."**
This is the very reason migrate and validate are separate gates.

- **Reconciliation**: [data migration](/posts/data-migration/)'s three-way check — do **counts, totals, sampling** match?
  Also referential integrity (any foreign key's counterpart missing)
- **Health check**: do the critical paths run ([smoke test](/posts/smoke-testing/))? For a cutover, connectivity and login
- **Old-vs-new**: in a parallel run, use [API response diffing](/posts/api-response-diffing/) to confirm same input → same output
- **Make the verdict automatic and binary**: judge "pass/fail" by thresholds, not human eyeballing, and on **fail, tip straight to rollback**

> ⭐ Decide validate's success criteria **before preflight**. If you start thinking about "what counts as success" only
> after finishing the run, you'll invent conveniently lax criteria. Fix each gate's passing line before you begin.

## Reuse it as a pattern

This shape isn't migration-only. The same skeleton works for **any run-once, hard-to-reverse change**.

| Scenario | preflight | migrate | validate |
| --- | --- | --- | --- |
| Data migration | backup, counts, rehearsal passed | idempotent transform in chunks | count/total/sample reconciliation |
| Deploy | health check, deps ready | roll out gradually ([rollback](/posts/deploy-rollback-strategy/)-ready) | smoke, error-rate monitoring |
| Schema change | compatibility ([expand/contract](/posts/db-schema-migration-expand-contract/)) | apply in a backward-compatible order | do both old and new code run |
| Bulk update | target count, WHERE condition | batches + idempotency key | updated count matches expectation |

> 💡 The more you fix the three gates into "the same procedure every time," the less execution is a personal test of nerve.
> Even just **putting preflight / migrate / validate headings in the runbook** cuts omissions and makes review easier.

## Summary

- **Building the tests** for a migration and **running it once safely** in production are different jobs. Wrap execution in three gates
- **preflight**: the abort decision before touching. Confirm you can revert, rehearsal passed, the window, data health — and if not, **don't start** (stopping unharmed is best)
- **migrate**: run the body **idempotent, resumable, logged**, ideally in chunks. "Ran to completion ≠ success"
- **validate**: judge pre-decided success criteria **by the numbers, binary**, and on fail roll back immediately. Fix the criteria before you begin
- This shape isn't migration-only — reuse it for deploys, schema changes, bulk updates, and any **run-once, hard-to-reverse change**

**Related:** [Migration Testing](/posts/migration-testing/) / [Data Migration](/posts/data-migration/) / [Rollback Strategy](/posts/deploy-rollback-strategy/) / [Smoke Testing](/posts/smoke-testing/) / [API Response Diffing](/posts/api-response-diffing/)
