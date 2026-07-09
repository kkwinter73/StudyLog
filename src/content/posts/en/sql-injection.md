---
title: "SQL Injection — Defend With Placeholders"
date: 2026-07-09T10:00:00
summary: "A query built by string concatenation lets input rewrite the very meaning of the SQL. This post lays out how the attack works, the single principle 'separate code from data', and the defense: using placeholders in Go's database/sql."
tags: ["セキュリティ", "Go", "データベース"]
level: beginner
lang: en
translationKey: sql-injection
---

When you embed user input into SQL by string concatenation, the input can rewrite what the query means — that's SQL injection.
The conclusion up front: **never build a query by mixing SQL (code) with input (data).** If you separate the two with placeholders, almost every precaution derives from that one sentence.

## How the Attack Works — Why Input Changes the Query

Suppose a login handler builds its [SQL](/en/posts/rdbms-basics/) by dropping input straight into a string.

```go
// Dangerous. Never do this.
query := "SELECT * FROM users WHERE name = '" + name + "' AND pass = '" + pass + "'"
```

If `name` is `alice' --`, the assembled SQL becomes:

```sql
SELECT * FROM users WHERE name = 'alice' --' AND pass = '...'
```

Everything after `--` is treated as a comment, so **the password check vanishes**. Feed in `' OR '1'='1`
and the condition is always true, returning every row. Depending on the DB privileges, an attacker can even append
another statement like `; DROP TABLE users; --`, leading to destruction or a data breach.

> ⚠️ The core problem isn't "the input contains dangerous characters" — it's that **the input (data) gets interpreted as query (code)**.
> That's why the "strip dangerous characters" mindset (hand-rolled escaping) tends to leave holes and isn't a real fix.

## The Principle — Separate Code From Data

The one reliable principle: **fix the structure of the SQL statement first, then pass input afterward only as "values".**
Whatever string a value is, it stays data and never becomes part of the SQL.

| Approach | Code vs. data | Safety |
| --- | --- | --- |
| String concat (`+` / `fmt.Sprintf`) | Mixed | Dangerous |
| Hand-rolled escaping | Still mixed, just processed | Holes are easy to leave |
| **Placeholders / parameterization** | Separated | Safe (the default) |

The mechanism that provides this separation at the language/library level is placeholders (`?` or `$1`) and prepared statements.

## Defending in Go — database/sql Placeholders

Go's standard library `database/sql` has an API that takes the query and the arguments separately.
**Don't embed values into the SQL; leave a `?` and pass them as arguments.**

```go
// Safe. name is passed only as a value and never becomes part of the SQL.
row := db.QueryRow(
    "SELECT id, name FROM users WHERE name = ? AND pass = ?",
    name, pass,
)
var id int
var got string
if err := row.Scan(&id, &got); err != nil {
    // sql.ErrNoRows means no match
}
```

The placeholder syntax depends on the driver (MySQL uses `?`, PostgreSQL (`pq`/`pgx`) uses `$1, $2`).
`Query` / `QueryRow` / `Exec` all take arguments the same way.

```go
// Fetching multiple rows is the same. Values always go through arguments.
rows, err := db.Query("SELECT id FROM users WHERE age >= ?", minAge)
```

If you run the same query repeatedly, a prepared statement lets you prepare the statement once and reuse it (the separation still holds).

```go
stmt, err := db.Prepare("SELECT id FROM users WHERE name = ?")
if err != nil { /* ... */ }
defer stmt.Close()

row := stmt.QueryRow(userName) // only the value is swapped in on each call
```

> ⚠️ Building SQL with `fmt.Sprintf` and handing it to `db.Query(built)` is just as **dangerous** as concatenation.
> For parts you can't pass as a placeholder (table names, column names, the `ORDER BY` direction), don't build them from
> input at all — decide them with an **allow-list** (accept only the expected values via a switch).

> 🧭 C# vs. Go: it's the same idea as ADO.NET's `SqlCommand` with `Parameters.AddWithValue("@name", name)`,
> or Entity Framework's LINQ parameterizing automatically. In Go, the `?` placeholder plus arguments plays that role.

## ORMs Help but Don't Bring It to Zero

Layering GORM or sqlc over `database/sql` parameterizes query building automatically, cutting incidents way down.
But the **escape hatches for raw SQL** (`Raw`, `Exec`, string-based WHERE clauses) remain, and concatenating input there is injection all over again.

> 💡 An ORM only means "the default is safe" — it's not a free pass. Review the spots where raw SQL is written with extra care.
> The one checkpoint: is input being used to *build* the query, or is it going through `?`/arguments?

## Summary

- The essence of SQL injection: **input (data) gets interpreted as SQL (code)**
- The principle is the only one you need: **separate code from data**. Don't rely on hand-rolled escaping
- In Go, pass values as arguments to `database/sql` **placeholders** (`?` / `$1`). Never build SQL with `fmt.Sprintf`
- For repeated queries, prepare and reuse a **prepared statement**
- Parts that can't be values (table/column names) come from an **allow-list**, not from input
- ORMs reduce incidents, but the **raw-SQL escape hatch** remains — review only that with extra care

**Related:** [Command Injection](/en/posts/command-injection/) / [XSS — Cross-Site Scripting](/en/posts/xss-cross-site-scripting/) / [RDBMS Basics](/en/posts/rdbms-basics/)
