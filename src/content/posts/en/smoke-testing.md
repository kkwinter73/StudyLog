---
title: "Smoke Testing — Fastest Check for a Fatal Wound Before Digging Deep"
date: 2026-07-15T10:00:00
summary: "A smoke test hits only the critical functions, shallow and wide, right after a build or deploy to decide whether it's worth testing further — a go/no-go gatekeeper. Here's the origin, purpose, and traits, the difference from the easily-confused sanity and regression tests, where and what to check in CI and after deploy, and the knack for keeping it thin and fast."
tags: ["テスト", "運用"]
level: beginner
lang: en
translationKey: smoke-testing
---

A **smoke test** hits only the critical functions, shallow and wide, **right after** a build or deploy,
to check as fast as possible whether it's **fundamentally broken**. It's the **go/no-go gatekeeper** before detailed testing.
The name comes from hardware — the first check of **powering on a board and seeing if smoke comes out**.

## What it's for — a gatekeeper before deep testing

There's one purpose: to **quickly decide "is it worth testing further."**

- Running a slow full test suite when the build is fundamentally broken is **a waste**. Confirm it's alive first
- If smoke **fails, bounce it back immediately**. No detailed tests, no distribution to a staging environment
- If it passes, "the base runs" — you can **move on to real testing** with confidence

> ⭐ A smoke test isn't "verify everything" but "**decide whether to proceed.**"
> Not coverage but **speed and breadth** is the point. Because results come in minutes, it works as a gatekeeper.

## Traits — shallow, wide, fast

Its role differs from ordinary testing, so it's built the opposite way.

- **Shallow and wide**: touch many critical functions **once, lightly, each**. Don't dig into any one
- **Critical paths only**: narrow to the **thick paths** — login, homepage, key APIs. Edge cases are out of scope
- **Fast**: keep it to a few-minute scale. A slow smoke test stops being used as a gate
- **Automated**: run it mechanically on every build/deploy (built into [CI/CD](/posts/cicd-github-actions/))

## The difference from sanity and regression — don't conflate them

It's easy to mix up with its opposite and with comprehensive testing. Separate the roles.

| Test | Breadth × depth | Purpose | When |
| --- | --- | --- | --- |
| Smoke | wide, shallow | go/no-go on a fatal wound | right after build/deploy |
| Sanity | narrow, deep | does a specific fix/feature work as expected | after a small change |
| Regression | wide, deep | comprehensive check that existing features aren't broken | after changes, thoroughly |

> 🧭 "Run **only smoke** before the full suite in CI, and abort immediately if it fails" is the same idea in .NET and Go.
> Tag tests with something like `Smoke` and **select just the critical paths to run first** — that's how you build a gate.

## Where and what to check

Smoke runs mainly at two moments. Its content sticks to "confirming the thick paths are alive."

- **After build (in CI)**: does it compile and start; run only the key unit/integration cases (build verification)
- **After deploy (prod/staging)**: right after release, **hit the key flows** against the actually-running environment —
  health-check response, login, key pages loading, key APIs returning 200, DB connectivity

> 💡 Post-deploy smoke pairs with [rollback](/posts/deploy-rollback-strategy/). If smoke fails right after cutover, don't chase it —
> **revert immediately**. Post-deploy smoke's job is to make "notice it first, in production" a mechanism.

## The knack for keeping it thin and fast

A gatekeeper works **precisely because it's light**. Fatten it and no one uses it.

- **Keep it thin**: don't add everything as features grow. Keep narrowing to the paths where "if this doesn't work, nothing else matters"
- **Guard the speed**: if it exceeds a few minutes, revisit. Push detailed verification to the real test side
- **Watch side effects in prod smoke**: to avoid dirtying real data, center it on reads or use dedicated test data
- **Stop on failure**: a smoke failure must **reliably halt the pipeline**. Letting it slide defeats the gatekeeper

## Summary

- A smoke test hits **critical functions shallow and wide** right after build/deploy — a go/no-go gate. The name is "power on, see if it smokes"
- The purpose is to **quickly decide whether it's worth proceeding**. Not coverage but **speed and breadth** is the point
- **Different from sanity (narrow, deep) and regression (wide, deep).** Smoke is wide and shallow, fastest
- It runs **after build (CI) and after deploy (prod smoke)**, sticking to thick-path liveness. Post-deploy pairs with rollback
- The knack: **keep it thin and fast, and reliably halt on failure**. Fatten it and it stops being used as a gate

**Related:** [Test Strategy and the Pyramid](/posts/testing-strategy-pyramid/) / [Migration Testing](/posts/migration-testing/) / [Rollback Strategy](/posts/deploy-rollback-strategy/) / [CI/CD and GitHub Actions](/posts/cicd-github-actions/)
