---
title: "The CAP Theorem — Consistency or Availability When a Partition Hits"
date: 2026-07-01T15:00:00
summary: "The theorem that a distributed system can't fully satisfy consistency (C), availability (A), and partition tolerance (P) all at once. Since network partitions are unavoidable, the real choice is between CP and AP. We also sort out the common misconceptions."
tags: ["アーキテクチャ", "データベース"]
level: advanced
lang: en
translationKey: cap-theorem
---

Once you spread data across multiple nodes, you inevitably run into the **CAP theorem**: you can't fully satisfy all three of consistency (C), availability (A), and partition tolerance (P) at the same time. The key takeaway is that, since **partitions are unavoidable, the real choice comes down to CP or AP**. Let's nail down what the three words mean and the points people tend to misunderstand.

## The three of CAP

These are the three properties a distributed datastore would like to have. CAP says you **can't have all three at once**.

| Letter | Property | Meaning |
| --- | --- | --- |
| C | Consistency | Whichever node you ask, you get **the same latest value** |
| A | Availability | A live node **always returns a response** |
| P | Partition tolerance | The system **keeps working even if communication between nodes is cut** |

> ⚠️ The C here (same value across all nodes) is **a different thing** from the C in [ACID](/en/posts/acid-properties/) (don't break constraints). Same word "consistency," but it refers to something else.

## The real choice is CP or AP

The crux is that **you don't get to choose P (partitions)**. The network will eventually partition, guaranteed. The moment a partition happens, you're forced to choose **which of C and A to give up**.

```text
Node A ──✂ partition ✂── Node B   (a write reached only one side)

・Preserve consistency (CP) → the possibly-stale side "doesn't answer / returns an error" (give up A)
・Preserve availability (AP) → answer no matter what, but may return a stale value (give up C)
```

- **CP**: during a partition, reject some requests if needed to prevent value mismatches
- **AP**: during a partition, keep returning responses and reconcile the mismatches later (eventual consistency)

## Examples of CP and AP

Which way you lean depends on the use case and the product.

| Lean | Good for | Examples |
| --- | --- | --- |
| CP | Balances, inventory, and other things where **a mismatch is a problem** | DBs that sell strong consistency / consensus-based stores |
| AP | Displays, carts, and other things where **going down is a problem** | Eventually-consistent KV stores / [caches](/en/posts/caching-cache-aside/) |

> 💡 A payment balance leans CP (better to stop than to be wrong), while a product listing leans AP (show it even if it's a bit stale). **Even within a single system, choosing per use case** is the realistic approach.

## Common misconceptions

CAP is often framed as "pick two of three," but there's a trap in that.

- **In normal times you can have both C and A.** You're only forced into the CAP choice **while a partition is happening**.
- "Give up P" isn't actually an option (partitions happen). So it's effectively **CP or AP**.
- CAP talks about C as all-or-nothing, but in practice you design across a gradient that includes **eventual consistency** in between.

> 🧭 As an extension there's **PACELC** (during a partition it's C/A, and in normal times it's a Latency/Consistency trade-off). The point: the "relax consistency for speed" decision is always present, even in normal times.

## Summary

- CAP = **consistency, availability, partition tolerance** can't all be satisfied at once
- Since **P (partitions) is unavoidable**, during a partition the real choice is **CP or AP**
- CP gives up responding to prevent mismatches; AP gives up consistency to keep responding (eventual consistency)
- The C in CAP means **the same value across all nodes**, which is a different thing from the C in [ACID](/en/posts/acid-properties/)
- In normal times you can have both, and you're only forced to choose **during a partition**. Design by leaning one way per use case.

**Related:** [ACID properties](/en/posts/acid-properties/) / [Caching strategy (cache-aside)](/en/posts/caching-cache-aside/) / [Payment transactions](/en/posts/payment-transaction/)
