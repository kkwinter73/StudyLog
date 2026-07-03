---
title: "Really Understanding AWS ③: Where Data Lives"
date: 2026-06-20T04:00:00
summary: "The right place to store data depends on the type of data. Understand what problems RDB (RDS), cache (ElastiCache), file warehouse (S3), and NoSQL (DynamoDB) each solve."
tags: ["AWS", "クラウド", "データベース"]
level: beginner
lang: en
translationKey: aws-data-stores-explained
---

> 📚 Series: "Really Understanding AWS" (3 / 6)

"Storing data" sounds simple, but **the best place to store it depends on the nature of the data**.
Let's organize the four main types by what each one solves.

## Four types of places to store data

| Type | AWS | Best for |
| --- | --- | --- |
| Relational database (RDB) | RDS | Business data held as tables + relationships |
| In-memory cache | ElastiCache | Frequently used results, temporarily and fast |
| Object storage | S3 | Files themselves (images, backups) |
| NoSQL | DynamoDB | Simple key lookups, massive scale |

## RDS = a managed relational database

**RDB** stores data as tables with rows and columns, and handles the relationships between tables via SQL.
**RDS** is the service where AWS operates that for you. Here we use **PostgreSQL**.
The benefit is that you can hand off the "babysitting" of a database — backups, patching, redundancy.

> 🧭 This is the layer that maps to .NET's Entity Framework + SQL Server. The engine just becomes PostgreSQL; the mental model is the same.

## ElastiCache = a sticky note on your desk (a fast temporary spot)

Querying the DB every time is heavy. So the idea of caching is to **remember frequently used results in memory and return them instantly**.
**ElastiCache** is the managed version of that, and the engine is **Valkey** (a Redis-compatible OSS fork).

Think of it like this: instead of opening the drawer (the DB) every time, you jot things down on a sticky note (memory) on your desk. It's fast but volatile, so you put "temporary data that's fine to lose" there.

## S3 = a giant warehouse for files

**S3** is the warehouse where you put **the files themselves** — images, videos, backups, build artifacts.
Capacity is practically unlimited and cheap, and you can retrieve files by URL.

> 💡 Putting large files in an RDB is heavy and expensive. The standard practice is to **keep the file in S3 and record only its location (URL) in the DB**.

## DynamoDB = instantly queryable NoSQL (here, for state locking)

**DynamoDB** is a NoSQL store that returns a value instantly when you hand it a key. The schema is loose, and it scales enormously.
In this setup its use is very specialized: it's used for **Terraform's state lock**
(a small table that records who holds the "key," providing the mutual exclusion that stops multiple people from changing infrastructure at once).

## How to choose between them

```text
Related business data         → RDS (PostgreSQL)
Speeding up frequent results  → ElastiCache (Valkey)
Files themselves              → S3
Simple key-value / locking    → DynamoDB
```

## Summary

- Where data lives depends on its nature — don't just default to "a DB"
- RDS is the managed version of a relational database (PostgreSQL here)
- ElastiCache is a fast temporary cache (Valkey), for data that's fine to lose
- S3 is a warehouse for files; keep only the URL in the DB
- DynamoDB is instantly queryable NoSQL; here it's used for state locking

Next time: the "messaging and asynchronous" edition, connecting services to each other.

**← Prev:** [② Compute](/en/posts/aws-compute-explained/)
**→ Next:** [④ Messaging and Async](/en/posts/aws-messaging-explained/)
