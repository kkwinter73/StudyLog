---
title: "Database Design — Building Tables That Don't Duplicate or Contradict, with Normalization and Keys"
date: 2026-07-09T22:00:00
summary: "How you split tables and link them with keys is what database design really is. Cover the four pillars — splitting entities, normalization, primary/foreign keys, and deliberate denormalization — to design a schema that never duplicates or contradicts itself."
tags: ["データベース", "設計"]
level: intermediate
lang: en
translationKey: database-schema-design
---

The foundation of holding "unbreakable data" in an [RDBMS](/en/posts/rdbms-basics/) is decided by
**how you split tables**. Cram everything into one giant table and duplication and contradiction
appear immediately. Cover four pillars — splitting entities, normalization, key design, and deliberate
denormalization — to build a schema that **never duplicates or contradicts itself**.

## What Goes Wrong — Cramming It All into One Table Breaks

For example, put an entire order into one table and you get this.

```text
orders
+----+----------+-------------+-----------+--------+
| id | customer | cust. email | product   | price  |
+----+----------+-------------+-----------+--------+
| 1  | Tanaka   | t@ex.com    | notebook  |  300   |
| 2  | Tanaka   | t@ex.com    | pen       |  100   |  ← customer info duplicated
| 3  | Sato     | s@ex.com    | notebook  |  350   |  ← same product, different price… contradiction
+----+----------+-------------+-----------+--------+
```

- Fixing Tanaka's email means fixing **every matching row** (extra work, missed rows)
- The same "notebook" has different prices (**which one is correct?**)
- You can't register a customer who hasn't ordered yet (no existence without an order row)

> ⚠️ These are called **update, insertion, and deletion anomalies**. The cause is "mixing separate
> facts into one table."

## Split Tables by Entity

The first step of design is to **put each independent "thing" (entity) in its own table**. In the
example above, customers, products, and orders are separate facts, so split them into three.

```text
customers          products              orders
+----+------+       +----+------+-------+   +----+-------------+------------+
| id | name |       | id | name | price |   | id | customer_id | product_id |
+----+------+       +----+------+-------+   +----+-------------+------------+
| 1  |Tanaka|       | 1  | note | 300   |   | 1  |     1       |     1      |
| 2  | Sato |       | 2  | pen  | 100   |   | 2  |     1       |     2      |
+----+------+       +----+------+-------+   +----+-------------+------------+
```

- Customer facts live in `customers` in **exactly one place** (an email fix is one row)
- Product price lives in `products` in **exactly one place** (no way to contradict)
- An order holds only the **relationship**: which customer bought which product

> 🧭 In C#/.NET, this is the same idea as one EF Core entity class mapping to one table. Split the DB
> tables at the same granularity you'd split classes.

## Normalization — Three Steps to Kill Duplication

Normalization systematizes "splitting tables." Covering first through third normal form (1NF–3NF) is
enough for practical work.

| Normal form | Rule | In plain terms |
| --- | --- | --- |
| 1NF | Each cell holds one value; no repeating columns | Don't make columns like `product1, product2, product3` |
| 2NF | Split off columns that depend on only part of the key | A column decided by half of a composite key goes to its own table |
| 3NF | Split off columns that depend on non-key columns | A chain like "zip → address" goes to its own table |

```text
-- 3NF violation: given the zip, the prefecture is determined (dependency on a non-key column)
customers(id, name, zip, prefecture)   ← prefecture depends on zip

-- Split, and it can't contradict
customers(id, name, zip)
zipcodes(zip, prefecture)
```

> 💡 The motto is **"One fact, one place."** If the same fact appears in two places, someday only one
> gets updated and they contradict. Normalization prevents that structurally.

## Link Tables with Primary and Foreign Keys

Link the split tables with **keys**. This is the crux of design.

- **Primary key (PK)**: a column that uniquely identifies a row. A **surrogate key** (a serial or UUID
  `id`) is easiest to work with.
- **Foreign key (FK)**: a column pointing to another table's PK. It becomes impossible to point at
  something that doesn't exist (**referential integrity**).

```sql
CREATE TABLE orders (
  id          BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),  -- FK
  product_id  BIGINT NOT NULL REFERENCES products(id),
  quantity    INT    NOT NULL CHECK (quantity > 0)
);
```

It's tempting to use a natural key (a meaningful value like an email) as the PK, but **values that can
change don't belong as a PK**.

| | Surrogate key (id) | Natural key (email, etc.) |
| --- | --- | --- |
| Change | Never changes | Can change (a PK change ripples widely) |
| Relationships | FKs stay short and stable | FKs are long and unstable |
| Recommendation | **Default to this** | Protect uniqueness separately with a UNIQUE constraint |

> 🧭 When it becomes many-to-many (orders and products both relate to many), insert a **junction
> table** (`order_items`, etc.). A C# collection navigation property shows up in the DB as a junction table.

## Don't Over-Normalize — Deliberate Denormalization

Normalization is the baseline, but **overdoing it means JOINs everywhere and slowness**. Where reads
are heavy, deliberately hold some duplication.

- Hold aggregate values you'd JOIN for every list view (like a total amount) **in a column up front**
- Put a [cache](/en/posts/caching-cache-aside/) in front of hot reads
- Add an **index** to columns you search on (FK columns and filter columns are the classics)

> ⭐ The principle is **"Normalize first; break it only where you've measured slowness."** Denormalize
> from the start and you're back to the "contradicting table" from the intro. If you break it, do so
> having decided "I will sync the duplication myself."

> 💡 A schema is hard to change once built. When you do change it in production, use
> [expand-contract migration](/en/posts/db-schema-migration-expand-contract/) to avoid downtime.

## Summary

- Cramming into one table causes **update/insertion/deletion anomalies** — the cause is mixing facts
- **Split tables by entity** and normalize (1NF→3NF) so "one fact lives in one place"
- Link tables with **primary keys (prefer surrogate) and foreign keys**; referential integrity blocks contradictions
- Use a **junction table** for many-to-many; keep changeable values out of the PK and guard them with UNIQUE
- Don't over-normalize — **measure and denormalize only the slow spots** (paired with the duty to sync)

**Related:** [What is an RDBMS](/en/posts/rdbms-basics/) / [ACID properties](/en/posts/acid-properties/) / [Caching strategy](/en/posts/caching-cache-aside/) / [DB schema migration](/en/posts/db-schema-migration-expand-contract/)
