---
title: "Migration Testing — What to Verify at Each Phase (In Chronological Order)"
date: 2026-07-14T14:00:00
summary: "Testing a system migration isn't one kind of test. Across the prepare, develop, rehearse, verify, accept, and cut-over phases, both the subject and the purpose change. Here's the lineup in chronological order — from data profiling to unit tests, the migration rehearsal and reconciliation, old-vs-new comparison and regression, performance and UAT, and finally the rollback check and smoke test around cutover."
tags: ["テスト", "運用"]
level: intermediate
lang: en
translationKey: migration-testing
---

Testing a migration is nowhere near "one functional check after the move." The **subject and purpose change per phase**.
Building on [data migration](/posts/data-migration/) and [cutover method](/posts/system-migration-strategy/), this post lines up
**the tests you run in a migration, chronologically**, so you can grasp "when, what, and why to verify" on one page.

## The big picture — a chronological test map

A migration runs in a straight line from prep to post-cutover. Here are the tests that match each stage.

```text
Prepare ─▶ Develop ─▶ Rehearse ──▶ Verify ──▶ Accept ──▶ Cutover ─▶ After
  │          │          │            │          │          │         │
profiling   unit      migration    functional  UAT/perf   smoke    monitor
            tests     rehearsal +  /old-vs-new  /cutover   rollback
                      reconcile    /regression  time
```

| Phase | Main tests | What it verifies |
| --- | --- | --- |
| Prepare | data profiling | the reality of source data (quality, drift, implicit rules) |
| Develop | unit tests | whether the transform/mapping logic is correct |
| Rehearse | migration rehearsal + reconciliation | can it move end-to-end / does the result match |
| Verify | functional, old-vs-new, regression | does the new system work right with migrated data |
| Accept | UAT, performance, cutover time | does the business run / can it take production volume / does it fit the window |
| Cutover | rollback check, smoke | can you revert / do critical operations run right after switching |

## ① Prepare — data profiling

Before you start writing the migration, **know the reality of the source data**. Without it, transform rules are armchair theory.

- Examine each column's **distribution, NULL rate, format drift, outliers**. Grasp how much out-of-spec data is mixed in
- Enumerate the code values **actually in use** to prevent gaps in the mapping table
- Look for clues to **implicit rules** like "if this column is empty, treat it specially"

> ⭐ Profiling is more survey than "test," but it's the **premise for all migration testing**. The dirt you find here
> becomes the test cases for the later transform logic. Transforms written without knowing the source always break somewhere.

## ② Develop — unit tests (transform logic)

The core of a migration script is the old→new **transform logic**. Test it at the function level.

- Add not just the happy path but the **dirty data, boundary values, and unmapped values** found in profiling as inputs
- Verify the **decided behavior** — "reject unmapped values / fall back to a default" — matches the implementation

> 🧭 Same idea as unit-testing a transform function with xUnit in .NET. Make **one row of the mapping table = one test case**,
> and regression bites when rules change. Don't treat a migration script as "disposable" — guard it with tests.

## ③ Rehearse — migration rehearsal and reconciliation

**Run the migration end-to-end** on a copy of production. This is the peak of migration testing.

- **Migration rehearsal (dry run)**: move everything end-to-end and **measure the duration** (the basis for the cutover time estimate).
  Also confirm the script is **idempotent** (same result no matter how many times you run it)
- **Reconciliation**: verify the result with [data migration](/posts/data-migration/)'s three-way check — **counts, totals, sampling**.
  Also check **referential integrity** (is any foreign key's counterpart missing)

> ⚠️ Don't stop at "it ran without errors." A transform bug quietly inserts wrong values. **Success is only when the numbers reconcile.**
> A rehearsal isn't one-and-done — fix the findings and **repeat until it passes**.

## ④ Verify & accept — functional, old-vs-new, performance, UAT

Confirm the new system with migrated data works **correctly, sufficiently, and as a business**.

- **Functional testing**: do the new system's features work right with migrated data
- **Old-vs-new comparison**: for the same input, do old and new outputs match? In a parallel run this is a continuous guarantee
- **Regression testing**: are existing features unbroken (apply [test strategy](/posts/testing-strategy-pyramid/) thinking as-is)
- **Performance/load testing**: can the new system take production-scale **data volume**? Row counts jump after migration
- **Cutover-time testing**: does migration-to-cutover **fit within the allowed downtime window** (use the rehearsal's measured time)
- **UAT (user acceptance testing)**: actual business staff confirm **daily operations run** with the migrated data

## ⑤ Around cutover — rollback check and smoke test

Last, just before and after production cutover. Quickly confirm **you can go back** and **it's running**.

- **Rollback check**: test beforehand that you can revert to the old on trouble. Never cut over a migration you can't roll back ([rollback strategy](/posts/deploy-rollback-strategy/))
- **Smoke test**: **right after** cutover, quickly check **only the thick paths** — critical operations, connectivity, login
- **Post-cutover monitoring**: keep watching old-new consistency and anomalies for a while. Problems tend to surface right after cutover

> 💡 A smoke test isn't "verify everything" but "**see if there's a fatal wound, fastest**."
> In the limited time right after cutover, first confirm the thick paths are alive. Leave the details to monitoring and normal tests.

## Summary

- Migration testing isn't one kind. **Subject and purpose change per phase.** Line them up chronologically to avoid gaps
- Prepare is **data profiling** (know the source); develop is **unit tests of the transform logic**
- The peak is the **migration rehearsal + reconciliation**. Move end-to-end, measure duration, confirm match by counts/totals/samples
- Verify & accept is **functional, old-vs-new, regression, performance, cutover-time, UAT**. Always measure production volume and the downtime window
- Around cutover, do the **rollback check and smoke test**, then monitor after. Never cut over a migration you can't revert

**Related:** [Data Migration](/posts/data-migration/) / [Migrating from Old to New System](/posts/system-migration-strategy/) / [Choosing a Migration Method](/posts/migration-strategy-selection/) / [Test Strategy and the Pyramid](/posts/testing-strategy-pyramid/)
