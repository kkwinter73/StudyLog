---
title: "Soft Delete — Marking Rows 'Gone' Instead of Deleting, and Its Pitfalls"
date: 2026-07-10T12:00:00
summary: "Against a physical delete that truly DELETEs a row, a soft delete raises a mark like deleted_at to treat it as 'gone.' It's used for restore, audit, and referential integrity, but it has plenty of traps — unique constraints, missed exclusions, cascades, and performance. Here's when to use it, how to implement it, and when you actually have to delete for real."
tags: ["データベース", "設計"]
level: intermediate
lang: en
translationKey: soft-delete
---

"Bring back the data I deleted," "track who deleted what and when" —— **soft delete** answers these needs.
Against a **physical delete** that truly `DELETE`s a row, a soft delete **raises a mark** like `deleted_at` to **treat the row as "gone."**
Handy, but it has **plenty of traps**: unique constraints, missed exclusions in queries, cascades, and performance.
Let's cover when to use it, how to implement it, and the cases where you actually have to delete for real.

## Physical vs soft delete — what's different

| | Physical delete | Soft delete |
| --- | --- | --- |
| Operation | `DELETE FROM ...` (row disappears) | `UPDATE ... SET deleted_at = now()` (raise a mark) |
| Restore | Basically impossible (backup only) | Clear the mark to bring it back |
| Referential integrity | Can break if a referenced row vanishes | Row stays, so nothing breaks |
| Space / performance | Shrinks, fast | Accumulates, can slow down |
| Default query | Nothing needed | Must **filter to "living" rows every time** |

- A soft delete is an **`UPDATE`** by the name of "delete." The row stays in the table forever
- It shines in domains needing restore, audit, or referential integrity (orders, users, accounting)
- The cost: **every read from now on is responsible for excluding the deleted rows**

## Why use soft delete

There are three main reasons to keep rather than erase. Without such a need, a physical delete is enough.

- **Restorable**: you can answer accidental deletes and "actually, put it back"
- **Audit / history**: "who deleted what, when" remains. Often mandatory in accounting or regulated areas
- **Doesn't break referential integrity**: physically deleting a user that past orders reference breaks history; keeping it is safe

> 💡 Most "just make it look gone" needs are met by soft delete. Conversely, the moment you have to **legally delete for real** (below),
> soft delete alone no longer satisfies the requirement. Asking "which kind of delete?" first is the starting point of the design.

## Implementation — raise a mark with deleted_at

A boolean `is_deleted` works, but a **`deleted_at` (timestamp)** is the standard. Beyond "is it deleted," it keeps "when."

```sql
-- Delete (just raise the mark)
UPDATE users SET deleted_at = now() WHERE id = 42;

-- A normal read must always filter to living rows
SELECT * FROM users WHERE deleted_at IS NULL;

-- Restore
UPDATE users SET deleted_at = NULL WHERE id = 42;
```

- NULL = alive, non-NULL = deleted (the deletion time). More informative than `is_deleted`
- To avoid forgetting the exclusion, centralize it with a **"living rows only" view or an ORM default scope**
- A partial index `WHERE deleted_at IS NULL` speeds up searches over living rows

> 🧭 In C#'s EF Core, defining **`HasQueryFilter(e => e.DeletedAt == null)`** once as a global filter makes every subsequent query
> exclude automatically (equivalent to Go `gorm`'s `gorm.DeletedAt`). If you mostly hand-write SQL, a **view** gives the same effect.

## Pitfalls

Soft delete's difficulty comes from the gap of "treating something as gone while it isn't." Four common ones.

- **Unique constraints**: make `email` UNIQUE and you **can't re-register** with a deleted row's same email.
  Fix it with a **partial unique index that includes `deleted_at`** (unique among living rows only)
- **Missed exclusions**: forget `deleted_at IS NULL` in one query and deleted rows surface. Prevent it by **excluding by default**
- **Cascades**: soft-deleting a user does **not** auto-remove their posts or sessions. Decide how related rows are handled (cascade the mark or not)
- **Performance decay**: deleted rows pile up, the table bloats, indexes fatten. Curb it with **partial indexes** + **periodic archive/physical purge**

> ⚠️ The scariest is **missed exclusions**. When deleted rows sneak into "easy-to-overlook" paths — aggregates, admin screens, JOIN targets —
> the numbers quietly go wrong. The iron rule: **centralize the exclusion in one place** across the whole app (view / ORM scope).

## When you actually have to delete for real

Soft delete only "hides." The data remains. Sometimes that conflicts with the requirement.

- **Legal deletion requests** (GDPR's "right to be forgotten," etc.): a mark isn't enough. You need a **physical delete or anonymization**
- **Space / cost**: pile up forever and it bites. Decide a lifecycle that physically purges after some period
- The practical answer is a **hybrid**: soft delete first (grace period, restorable) → after some time, **physically delete/anonymize** in a batch

> ⭐ "I soft-deleted it, so it's gone" is a misconception. Only when personal data is **eventually physically erased/anonymized after a grace period**
> can you truly say "deleted." Think of deletion not as a *state* but as a *lifecycle*.

## Summary

- Soft delete isn't a `DELETE` but an **`UPDATE` that raises `deleted_at`**. The row stays — good for restore, audit, integrity
- The cost is that **every read is responsible for excluding deleted rows**. Centralize it in **one place** (view / ORM scope)
- Pitfalls are **unique constraints, missed exclusions, cascades, performance**. Handle them with partial unique/partial indexes
- **Legal deletion and space** aren't covered by soft delete alone. Use a hybrid: **grace-period soft delete → physical erase/anonymize**
- The design starts by asking **which kind of delete you need** first

**Related:** [Database Design — Normalization and Keys](/posts/database-schema-design/) / [RDBMS Basics](/posts/rdbms-basics/) / [SQL Basics](/posts/sql-basics/)
