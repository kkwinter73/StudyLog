---
title: "Deployment Rollback Strategy — Rolling Back vs. Forward-Fix"
date: 2026-06-26T14:00:00
summary: "When production breaks, do you revert to the previous version (rollback) or fix it and move forward (forward-fix)? Nail down the prerequisites for instant rollback — immutable image tags and retained past versions — plus when to use each approach."
tags: ["デプロイ", "運用"]
level: intermediate
lang: en
translationKey: deploy-rollback-strategy
---

Preparing for when a [deployed](/en/posts/cicd-github-actions/) version turns out to be broken. Broadly, there are two options:
**roll back** or **fix it and move forward (forward-fix)**.
Let's cover the prerequisites for reverting instantly, plus when to use each.

## How Do You Recover When It Breaks — Two Approaches

| Approach | What you do | When it fits |
| --- | --- | --- |
| Rollback | **Instantly revert** to the last healthy version | Production, high impact, recovery over root-cause investigation |
| Forward-fix | **Fix the bug and ship a new version** | Dev environment, small changes, when moving forward is faster |

> 💡 "Stop the impact on users first (rollback)" and "fix the root cause (fix)" are separate concerns.
> For production incidents, the basic rule is to **stop the bleeding first (rollback)**, then fix it calmly.

## Prerequisites That Make Instant Rollback Possible

"Reverting instantly" only works if the mechanism is in place. The key is that **past artifacts remain exactly as they were**.

- **Immutable image tags**: tag your [images](/en/posts/image-layers-multistage/) with the commit hash (SHA) and **never overwrite them**
- **Retaining past versions**: keep the last N generations of images in the [registry](/en/posts/registry-and-compose/)
- With this in place, you can "redeploy the previous SHA" and revert **in tens of seconds, with no build**

> ⚠️ If you only have **moving tags** like `latest`, you can't identify what "the previous version" was, so you can't revert.
> Immutable tags (SHA) = the target to revert to is always pinned down, which is the condition for instant rollback.

## When Forward-Fix Fits

Rollback isn't always the right call.

- In dev environments, **fixing and shipping is often faster** than reverting
- If the change is small and the cause is obvious, ship a fixed version forward
- When a schema change is involved, you may [not be able to revert backward](/en/posts/db-schema-migration-expand-contract/) in the first place (see the linked article)

## A Tiered Approach to Reverting

Have a set of stages, from lighter to heavier measures.

```text
1. Switch to the previous revision (previous TD/deployment)  … fastest, no build needed
2. Roll code back commit-by-commit and redeploy              … corrects the history
3. Specify a past SHA image from the registry and redeploy   … any version, no build
```

## Summary

- Incident recovery has two approaches: **rollback (revert instantly)** and **forward-fix (fix and move forward)**
- For production, the basic rule is to **stop the bleeding with rollback first** → then fix the root cause calmly
- Instant rollback requires **immutable SHA tags + retained past versions** (relying on `latest` means you can't revert)
- For dev, small changes, or an obvious cause, forward-fix is faster
- Structure your reverts in stages: "switch to previous revision → roll code back → redeploy a past image"

**Related:** [CI/CD Pipeline](/en/posts/cicd-github-actions/) / [Image Layers and Tags](/en/posts/image-layers-multistage/) / [DB Schema Migration](/en/posts/db-schema-migration-expand-contract/)
