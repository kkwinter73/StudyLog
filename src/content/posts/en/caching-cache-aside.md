---
title: "Caching Basics — the cache-aside pattern"
date: 2026-06-26T10:00:00
summary: "The go-to way to cut DB load with a fast in-memory store is cache-aside: reads hit the cache first and fall back to the DB (loading it on the way), writes update the DB then invalidate the cache. Covers TTL and the 'not the source of truth' mindset too."
tags: ["データベース", "アーキテクチャ"]
level: intermediate
lang: en
translationKey: caching-cache-aside
---

As traffic grows, the [DB](/en/posts/aws-data-stores-explained/) becomes a bottleneck. So we put a fast **in-memory store** (Redis and friends)
in front of it. The most common approach is **cache-aside**. Let's look at the read/write flow and the operational assumptions behind it.

## Why cache at all

Querying the [DB](/en/posts/aws-data-stores-explained/) for the same data over and over is wasteful.

- It lowers load on the DB (you don't fire heavy queries every time)
- It's **fast** because responses come from memory (fewer disk hits and network round trips)

> 💡 This is the concrete usage story for the in-memory store I compared to a [sticky note on your desk in AWS #3](/en/posts/aws-data-stores-explained/).

## The cache-aside pattern

An approach where the app **sits between the cache and the DB** and manages both (aside = set off to the side).

```text
[Read]
  1. Check the cache
  2. If present (hit), return it
  3. If absent (miss), read from the DB, load it into the cache, then return it

[Write]
  1. Update the DB (the DB is the source of truth)
  2. Invalidate (or update) the cache
```

- Reads are **cache-first**, hitting the DB only on a miss. Subsequent reads are fast
- Writes treat the **DB as authoritative** and delete the stale cache entry

## TTL and invalidation

Leave a cache alone and it goes **stale**. TTL and invalidation are what prevent that.

- **TTL (expiry)**: entries disappear automatically after a set time. You give up a little freshness in exchange for self-refreshing data
- **Explicit invalidation**: on a write, delete the relevant cache entry so the next read pulls it fresh from the DB

> ⚠️ "The DB was updated but the cache is stale" is a classic bug. Make **write-then-delete** a hard rule, and add a TTL as a safety net so any missed invalidation still recovers over time.

## Operational assumptions

- **The cache is not the [source of truth](/en/posts/single-source-of-truth/)**. The DB is authoritative. Use the cache on the assumption that it can be regenerated even if it's wiped
- If multiple apps share one store, **partition it logically** (separate DB numbers or key prefixes per use case to avoid crosstalk)
- Don't cache everything. The targets are data that is **heavy, read often, and rarely changes**

## Summary

- Use an in-memory cache to **cut DB load and speed things up**
- **cache-aside** = reads are cache-first (on a miss, hit the DB then load it), writes invalidate after updating the DB
- Guard against staleness with **TTL (auto-expiry) plus explicit invalidation on write**
- The cache is **not the source of truth** (the DB is authoritative; assume it can be regenerated if lost)
- Target data that is "heavy, read often, rarely changes." Don't cache everything

**Related:** [Where data lives (ElastiCache)](/en/posts/aws-data-stores-explained/) / [Single source of truth (SoT)](/en/posts/single-source-of-truth/)
