---
title: "What Is an RDBMS — Holding \"Unbreakable\" Data with the Relational Model and SQL"
date: 2026-07-01T16:00:00
summary: "An RDBMS holds data as relationships between tables, operates on it with SQL, and protects integrity with constraints and transactions. Cover the four pillars — the relational model, SQL, schema constraints, and transactions — plus when to choose it over NoSQL."
tags: ["データベース", "基礎"]
level: beginner
lang: en
translationKey: rdbms-basics
---

An **RDBMS (Relational Database Management System)** is a database that holds data as tables and the
relationships between them, operated on with SQL. Its strength is **protecting integrity with
constraints and transactions**. Let's cover the four pillars — the relational model, SQL, schema
constraints, and transactions — plus when to choose it over NoSQL.

## The Relational Model — Holding Data as Tables and Relationships

The relational model represents data as **tables (rows × columns)** and **links tables together with keys**.

```text
users                 orders
+----+-------+        +----+---------+--------+
| id | name  |        | id | user_id | amount |
+----+-------+        +----+---------+--------+
|  1 | Tanaka|        | 10 |    1    |  3000  |  ← user_id=1 points to users.id=1
|  2 | Sato  |        | 11 |    2    |  1500  |
+----+-------+        +----+---------+--------+
```

- The **primary key** (`users.id`) uniquely identifies each row
- A **foreign key** (`orders.user_id`) points to another table
- Data is split up without duplication, and combined with a **JOIN** when needed

## Operating with SQL

An RDBMS is handled with a declarative language called **SQL**. You write "what you want," not "how to get it."

```sql
SELECT u.name, o.amount
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.amount >= 2000;
```

- The basics are read (SELECT), add (INSERT), update (UPDATE), and delete (DELETE)
- Instead of writing a procedure, you **declare conditions**, and the DB decides the efficient way to fetch

> 🧭 If you come from C#/.NET, this is the familiar world of SQL Server and EF Core. The SQL that LINQ
> is ultimately translated into is the common tongue of RDBMSs. In Go, you often write raw SQL with
> `database/sql` plus a driver.

## Schema and Constraints — The Heart of Integrity

An RDBMS **decides its structure (schema) up front**. You declare column types, required-ness,
uniqueness, and relationships as **constraints**, and the DB rejects data that violates them. This is
the foundation of "unbreakable data."

| Constraint | Role |
| --- | --- |
| NOT NULL | Disallows empty values |
| UNIQUE | Disallows duplicates (email addresses, etc.) |
| PRIMARY KEY | A row's unique identifier |
| FOREIGN KEY | Can't point to something that doesn't exist (referential integrity) |
| CHECK | Rejects values that don't meet a condition (balance ≥ 0, etc.) |

> 💡 Even if an app bug tries to insert weird data, the **DB is the last line of defense** that blocks
> it. Not relying on the app alone for integrity is the RDBMS philosophy.

## Protecting with Transactions

A **transaction** bundles multiple updates into "all or nothing." An RDBMS gives it the guarantees of
[ACID](/en/posts/acid-properties/). It's essential for **operations you can't afford to break midway**,
like transfers or inventory changes.

```sql
BEGIN;
UPDATE accounts SET balance = balance - 3000 WHERE id = 1;
UPDATE accounts SET balance = balance + 3000 WHERE id = 2;
COMMIT;  -- if it fails midway, ROLLBACK undoes both
```

> ⚠️ This is what pays off in [payment transactions](/en/posts/payment-transaction/) and concurrent
> inventory updates. But rollback only works **within a single DB** (spanning external integrations
> requires [compensation](/en/posts/compensating-transaction/)).

## When to Use It / How It Differs from NoSQL

An RDBMS isn't all-powerful. It's strong where structure and integrity matter; NoSQL suits massive
scale and flexible schemas.

| | RDBMS | NoSQL (examples) |
| --- | --- | --- |
| Data structure | Predefined schema | Flexible, leans schemaless |
| Strength | Integrity, JOINs, transactions | Horizontal scale, high write volume |
| Consistency | Good at strong consistency | Often leans [eventual consistency](/en/posts/cap-theorem/) |
| Examples | PostgreSQL, MySQL, SQL Server | KV stores, document DBs |

> 💡 When in doubt, **start with an RDBMS** — it's the standard choice. Most business data that needs
> relationships, integrity, and transactions is well served by it.

## Summary

- An RDBMS holds data as **tables and relationships**, and operates on it with **SQL** (declarative)
- **Primary/foreign keys** link tables, combined with a **JOIN** when needed
- **Schema and constraints** (NOT NULL/UNIQUE/FK/CHECK) let the DB block invalid data
- **Transactions + [ACID](/en/posts/acid-properties/)** guarantee "unbreakable updates" (within one DB)
- Use an RDBMS for business data that needs integrity; use NoSQL for massive scale and flexible schemas

**Related:** [ACID properties](/en/posts/acid-properties/) / [Where to store data (AWS)](/en/posts/aws-data-stores-explained/) / [DB schema migration](/en/posts/db-schema-migration-expand-contract/)
