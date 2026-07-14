---
title: "Snapshots — Capturing a Whole State at a Single Moment"
date: 2026-07-14T10:00:00
summary: "A snapshot captures the entire 'state at one moment' of a volume or database. Here's why it's instant and cheap (copy-on-write), the most misunderstood distinction — 'a snapshot is not a backup' — the use cases like insurance before a risky change and DB restore, and the gotchas around consistency and cost."
tags: ["インフラ", "運用"]
level: intermediate
lang: en
translationKey: snapshots-explained
---

A **snapshot** is a whole capture of the "**state at one moment**" of a disk or database.
You use them daily — insurance before an upgrade, cloning an environment, restoring a DB. This post isn't about a specific product;
it's for grasping the **mechanism and the key points**: "why is it instant?" and "how does it differ from a backup?"

## What a snapshot is — an "image" of that moment

A snapshot is an **image of the entire contents of a target** (volume, disk, DB instance) **at a point in time**.
Like a photo, it freezes "the moment it was taken," and later you can **roll back** to that state or **clone** it.

- The target is mainly a **chunk of storage** (an EBS volume, a virtual disk, a whole DB)
- Even if the source data changes afterward, the snapshot **stays exactly as it was** when taken
- Restore, and the target **reverts precisely to that moment** (= any changes after it are gone)

> 💡 It's a tool for "creating a point you can return to" — close to a save point in a game. Take one before a risky operation,
> and if it fails you can rewind to where you took it.

## Why it's instant and cheap — copy-on-write

Copying a several-hundred-GB disk in full every time would be slow and space-hungry. Snapshots are fast and cheap thanks to
**copy-on-write (COW)**.

```text
At capture: copy nothing. Just place a marker for "the state at this moment"  ← done in an instant
On write:   only for blocks being changed, save the original first, then write  ← only the delta grows
```

- At the moment of capture, **nothing is copied** (just a marker). So it finishes instantly
- After that, only **the blocks that changed** are stored as a delta. Change nothing and the size barely grows
- From the second snapshot on, it's usually **incremental** — storing "only what changed since last time"

> 🧭 In C#, `ToList()` on a big list copies every element immediately. COW is the reverse: **lazy copying that doesn't duplicate until a change comes in**.
> That's why "taking" it is instant. The contents are **shared** with the source, and only the rewritten parts branch off.
> (Same idea as COW on fork in [physical vs virtual memory](/posts/physical-and-virtual-memory/).)

## A snapshot is NOT a backup (most important)

Here's the biggest misconception. "We have snapshots, so we're safe" is dangerous. The two differ in **purpose and location**.

| | Snapshot | Backup |
| --- | --- | --- |
| Purpose | roll back / clone quickly | **preserve independently** against disaster or loss |
| Location | near the **same platform** as the source | ideally **isolated** — another region, another medium |
| Relation to source | tends to **depend** via deltas (the COW chain) | a complete copy **detached** from the source |
| Failure it assumes | operator error, a failed change | total storage loss, account loss, ransomware |

> ⚠️ Snapshots tend to live on the same platform and same account as the source. If that whole thing is destroyed,
> **the snapshots go down with it**. It's "insurance you can roll back to," not "preservation against loss."
> A real backup needs an **isolated, separate copy**.

## What you use them for

They shine wherever those two properties — a point to return to, and a source to clone — matter.

- **Insurance before a risky change**: take one right before an OS upgrade or a schema change. Roll back if it fails (the base of [rollback strategy](/posts/deploy-rollback-strategy/))
- **Cloning an environment**: **replicate** a staging DB/volume exactly, from a production snapshot
- **DB restore**: **point-in-time restore** like "revert to yesterday 23:00." A snapshot from RDS etc. is typical
- **Machine images**: freeze the state including the OS and **boot many servers from the same state** (AMI, etc.)

## Gotchas

"Thinking you captured it" is the most dangerous. Know the points that bite in operation.

- **Consistency**: capture mid-write and you image a broken state. Pulling the plug on power = **crash-consistent**.
  For a DB, it's safer to flush/quiesce first (**application-consistent**) or capture via the DB's own feature
- **Cost as they pile up**: even as deltas, snapshots accumulate. Set a **retention (generation) policy** and delete old ones
- **Mind the chain**: COW deltas depend on the base or prior generations. Carelessly deleting the base can break things
- **Restore = revert to that moment**: changes after capture are lost. Realize a restore is also **an operation that loses data**

> ⭐ Just as important as "automating snapshot capture" is **actually testing the restore**.
> A capture you can't restore is meaningless. Rehearse restores regularly.

## Summary

- A snapshot is an **image of the target's state at one moment** — a "save point" to roll back to or clone from
- It's instant and cheap thanks to **copy-on-write**: nothing is copied at capture; only **the delta** accumulates
- **A snapshot is NOT a backup**. It tends to sit on the same platform; for disaster/loss you separately need an **isolated, separate copy**
- Use cases: **insurance before a risky change, cloning an environment, point-in-time DB restore, machine images**
- Pitfalls: **consistency, accumulating cost, chain dependency, data loss on restore**. Don't just capture — **test the restore**

**Related:** [Physical vs Virtual Memory](/posts/physical-and-virtual-memory/) / [AWS Data Stores](/posts/aws-data-stores-explained/) / [Soft Delete](/posts/soft-delete/) / [Rollback Strategy](/posts/deploy-rollback-strategy/)
