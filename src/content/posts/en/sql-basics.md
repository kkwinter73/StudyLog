---
title: "SQL Basics — Pulling Data Out with SELECT, JOIN, and Aggregation"
date: 2026-07-09T23:30:00
summary: "SQL is a declarative language: you write \"what you want,\" not \"how to get it.\" Cover four pillars — the SELECT skeleton, JOINs that link tables, GROUP BY aggregation, and INSERT/UPDATE/DELETE — and you'll be able to actually write queries."
tags: ["データベース", "基礎"]
level: beginner
lang: en
translationKey: sql-basics
---

The common tongue for operating an [RDBMS](/en/posts/rdbms-basics/) is **SQL**. Its hallmark is being
**declarative** — instead of a procedure for "how to get it," you write conditions for "what you want,"
and the DB decides the efficient way to fetch. Cover four pillars — the SELECT skeleton, JOINs,
aggregation, and writes — and you can write everyday queries.

The examples below use two tables: `users` and `orders`.

```text
users                      orders
+----+-------+-------+     +----+---------+--------+------------+
| id | name  | city  |     | id | user_id | amount | created_at |
+----+-------+-------+     +----+---------+--------+------------+
|  1 | Tanaka| Tokyo |     | 10 |    1    |  3000  | 2026-07-01 |
|  2 | Sato  | Osaka |     | 11 |    1    |  1500  | 2026-07-02 |
|  3 | Suzuki| Tokyo |     | 12 |    2    |  8000  | 2026-07-03 |
+----+-------+-------+     +----+---------+--------+------------+
```

## The SELECT Skeleton — Filter and Order

Reads center on `SELECT`. You declare **which columns (SELECT), from which table (FROM), which rows
only (WHERE), and in what order (ORDER BY)**.

```sql
SELECT id, name           -- the columns you want (* is all, but name them in production)
FROM users
WHERE city = 'Tokyo'       -- filter rows by a condition
ORDER BY id DESC           -- ordering (DESC = descending)
LIMIT 10;                  -- only the first 10 rows
```

- `WHERE` operators: `=` `<>` `<` `>=`, `IN (…)`, `BETWEEN a AND b`, `LIKE 'ab%'` (prefix match)
- Test for NULL with **`IS NULL` / `IS NOT NULL`**, not `= NULL`

> 🧭 The SQL that C#/.NET's LINQ ultimately translates into is exactly this. `Where`→`WHERE`,
> `OrderBy`→`ORDER BY`, `Select`→`SELECT` columns — it maps almost one-to-one.

## JOIN — Linking Multiple Tables

Tables split apart by normalization are combined with `JOIN`. You connect rows by a **key match** (`ON`).

```sql
SELECT u.name, o.amount, o.created_at
FROM orders o
JOIN users u ON u.id = o.user_id   -- match orders.user_id to users.id
WHERE o.amount >= 2000;
```

The difference between an inner join (`JOIN`) and an outer join (`LEFT JOIN`) matters most.

| Type | Meaning | A customer with no orders |
| --- | --- | --- |
| `JOIN` (inner) | Only rows matching in both tables | Doesn't appear |
| `LEFT JOIN` | Keeps all left rows; NULL where the right is missing | Appears (amount is NULL) |

> 💡 If you want "even customers with zero orders in the list," use `LEFT JOIN`. The gotcha is that an
> inner join **drops rows that exist in only one side**. Short aliases (`o`, `u`) make it readable.

## Aggregation — Rolling Up with GROUP BY

Aggregations like "total per customer" **split into groups with `GROUP BY` and collapse them with
aggregate functions**.

```sql
SELECT u.name, COUNT(*) AS cnt, SUM(o.amount) AS total
FROM orders o
JOIN users u ON u.id = o.user_id
GROUP BY u.name           -- roll up per name
HAVING SUM(o.amount) >= 3000   -- filter AFTER aggregation with HAVING
ORDER BY total DESC;
```

- Aggregate functions: `COUNT` / `SUM` / `AVG` / `MAX` / `MIN`
- **`WHERE` filters before aggregation; `HAVING` filters after** (easy to confuse)
- Non-aggregate columns in `SELECT` generally go into `GROUP BY`

> ⚠️ `WHERE` and `HAVING` play different roles. "Aggregate only orders ≥ 2000" is `WHERE`; "show only
> customers whose total ≥ 3000" is `HAVING`.

## Writes — INSERT / UPDATE / DELETE

The three non-read operations. **Forgetting `WHERE` on `UPDATE`/`DELETE`** is the biggest accident.

```sql
INSERT INTO users (name, city) VALUES ('Takahashi', 'Nagoya');

UPDATE users SET city = 'Yokohama' WHERE id = 1;   -- forget WHERE and it updates every row!

DELETE FROM orders WHERE created_at < '2026-01-01';
```

> ⚠️ An `UPDATE`/`DELETE` missing its `WHERE` hits **every row**. It's safer to `SELECT` with the same
> condition first and check the count. Bundle multiple updates in a [transaction](/en/posts/acid-properties/).

> 🧭 In Go you typically write SQL directly with `database/sql`. Never concatenate values into the
> string — always pass them via **placeholders (`?` or `$1`)**, or you get
> [SQL injection](/en/posts/sql-injection/).

## Summary

- SQL is **declarative** — write "what you want" with `SELECT / FROM / WHERE / ORDER BY`
- Test NULL with `IS NULL`, prefix-match with `LIKE`, cap rows with `LIMIT`
- Combine tables with `JOIN`; inner keeps only matches, **`LEFT JOIN`** keeps rows with no match
- Aggregate with `GROUP BY` + functions. **Filter before with `WHERE`, after with `HAVING`**
- `UPDATE`/`DELETE` **require `WHERE`**; pass values via **placeholders** ([SQLi defense](/en/posts/sql-injection/))

**Related:** [What is an RDBMS](/en/posts/rdbms-basics/) / [Database design](/en/posts/database-schema-design/) / [ACID properties](/en/posts/acid-properties/) / [SQL injection](/en/posts/sql-injection/)
