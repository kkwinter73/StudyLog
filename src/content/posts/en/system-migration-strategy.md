---
title: "Migrating From an Old System to a New One — Avoid the Big Bang, Keep a Way Back"
date: 2026-07-07T12:00:00
summary: "Replacing a system is not a regular deploy: the blast radius is total and data is involved. This post sorts out what makes migrations scary, compares cutover styles (big bang / incremental / parallel run), and covers keeping a \"way back\" open for the whole migration."
tags: ["デプロイ", "運用"]
level: intermediate
lang: en
translationKey: system-migration-strategy
---

Notes on what to watch out for in a "replacement migration" — retiring an old system and moving to a new one. The conclusion up front: **avoid the one-shot cutover (big bang), and stay able to return to the old system at any point during the migration** — almost every precaution derives from that one sentence.

## A Migration Is Not Just a Big Deploy

Compared with a regular [deploy](/en/posts/deploy-rollback-strategy/), a replacement migration has three fears of its own.

- **The impact is total**: it's not one feature of a new version — the whole system swaps out. The blast radius when something breaks is at its maximum
- **Data is involved**: code can be rolled back, but data doesn't roll back on its own. What to do with writes that landed on the new side is a constant question
- **Unknown behavior surfaces**: every old system has undocumented behavior (implicit spec), and only after migrating do you discover "something depended on *that*?"

> ⚠️ "All the tests passed" does not guarantee a safe migration. What's scary isn't the spec that's written down — it's the **spec nobody knew about**. That's why cutover styles that let you verify with production traffic are worth the cost.

## Comparing Cutover Styles

| Style | What you do | Strength | Weakness |
| --- | --- | --- | --- |
| **Big bang** | Switch everything over on one day | Simple, short migration period | Maximum impact on failure; going back is also a major incident |
| **Incremental** (strangler) | Move to the new system feature by feature, endpoint by endpoint | Small blast radius; you learn as you go | Long old/new coexistence; boundaries need managing |
| **Parallel run** | Run both systems and compare their results | Verification with real production traffic | Double the cost; needs comparison tooling |

- Incremental migration routes each path to old or new at the front (LB, API gateway) and slowly "strangles" the old system (the strangler fig pattern). Its superpower: **rolling back is just pointing the route back at the old system**
- A parallel run mirrors production requests to the new side too (shadow traffic), serves responses from the old one, and records the **diff between old and new results**. This is the most effective way to flush out implicit spec

> 🧭 The same playbook holds in the C# world: the recommended path for .NET Framework → .NET migrations is not a rewrite-in-one-go but a strangler-style move, project by project, API by API.

## Migrating the Data — the Hardest Place to Turn Back

Code can be reverted with routing; data is the trickiest part because "which side is the truth" is in motion. The basic shape has two steps.

- **Backfill**: bulk-copy the existing data from the old DB to the new DB (whatever accumulates during the copy gets picked up by the next step)
- **Dual writes**: during the migration period, write to **both** old and new. Reads switch from old to new incrementally

```text
[before]   writes → old DB           reads ← old DB
[during]   writes → old DB + new DB  reads ← old DB (switch to new once verified)
[after]    writes → new DB           reads ← new DB (keep old around read-only)
```

- While dual-writing, keep running **consistency checks** (row counts, checksum comparisons)
- The thinking is the same as [expand-contract for schema migrations](/en/posts/db-schema-migration-expand-contract/) — **expand while staying compatible, contract only after verification**

## Designing the Way Back — Decide the Abort Criteria in Advance

The most dangerous thing on migration day is pushing on because "it's almost fixed". **Don't leave the decision to go back to on-the-spot courage.**

- **Write down the rollback criteria beforehand**: agree before the migration that you go back "if the error rate exceeds X%" or "if verification isn't done by HH:00" (if you have an [SLO](/en/posts/slo-and-error-budget/), the thresholds can come from there)
- **Don't delete the old system right away**: keep it bootable for a while after the cutover. If you're still dual-writing, going back loses no data
- **Set up migration-specific monitoring**: a dashboard showing old and new error rates and latency [side by side](/en/posts/what-to-measure-metrics/), and an alert for when only the new side degrades

> ⭐ "Migration succeeded" is defined not by the day you switched, but by **the day you could retire the old system**. Until then you are mid-migration — the period in which you keep the way back open.

## Summary

- The fears specific to replacement migrations: **total impact, data, and implicit spec**
- **Avoid the big bang.** Slicing the migration by routing (strangler style) also makes going back easy
- To flush out implicit spec, a **parallel run** (diffing old vs. new results) works best
- For data: **backfill + dual writes**, keeping the old side as the source of truth until verification is done
- **Document the rollback criteria in advance**, and keep the old system until the retirement decision

**Related:** [Deploy Rollback Strategy](/en/posts/deploy-rollback-strategy/) / [DB Schema Migration — expand-contract](/en/posts/db-schema-migration-expand-contract/) / [A Symptom-Based Troubleshooting Cheat Sheet](/en/posts/symptom-based-troubleshooting/)
