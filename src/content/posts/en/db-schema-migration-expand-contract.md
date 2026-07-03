---
title: "DB Schema Migration — Zero Downtime with Expand-Contract"
date: 2026-06-26T13:00:00
summary: "You can't flip the app and the DB schema at the same time. Add backward-compatibly, migrate, then drop the old thing — this three-step expand-contract approach lets you change a schema safely without stopping the service."
tags: ["データベース", "運用"]
level: intermediate
lang: en
translationKey: db-schema-migration-expand-contract
---

Even renaming a single column is trickier than it looks in production. That's because **you can't switch the app and the DB at the same time**. The trick is **expand-contract**: migrate in three steps while keeping backward compatibility, and change the schema without downtime.

## Why schema changes are dangerous

At the moment of deploy, old and new app versions briefly **coexist** (as in a [rolling update](/en/posts/aws-compute-explained/)).

- "Rename a column and switch the app at the same time" is impossible (the old app breaks in the gap during the switch)
- You have to assume the old app is still running throughout the migration

> ⚠️ Both "change the DB, then the app" and "change the app first" will **always break for a moment** if done in a naive order. The key is to keep every moment in a state where *either* the old or the new app can run.

## The three steps of expand-contract

"Expand → migrate → contract," always preserving backward compatibility.

| Step | What you do | State |
| --- | --- | --- |
| ① expand | **Add** the new shape (don't remove anything) | Both old and new apps work |
| ② migrate | Migrate the data + switch the app to the new shape | Gradually shift to the new |
| ③ contract | **Remove** the old shape once it's no longer needed | Only the new remains |

> 💡 The key is that in ① you **only add, never remove**. Backward compatibility is preserved, so nothing breaks even while the old app is running.

## Concrete example: renaming a column

Say you want to rename `name` to `full_name`. A one-shot rename is a no-go. Instead:

```text
① expand : add the full_name column (leave name as is)
② migrate: make the app "write to both / read from full_name first." Also copy existing rows into full_name
③ contract: once every app instance uses only full_name, drop name
```

- Insert a deploy between each step. **At every moment, both old and new apps can run**
- Split "add column → dual-write → read swap → drop" into separate releases

## Notes on failure and rollback

- If it fails partway and the migration ends up in a **half-applied (dirty) state**, it often can't be reverted automatically
- Schema changes [can't be rolled back with a simple undo](/en/posts/deploy-rollback-strategy/). That's exactly why you should **slice them small and assume moving forward**
- Do the destructive step (the drop in ③) only after you've confirmed everything works with just the new shape

## Summary

- During a deploy, old and new apps **coexist**, so you can't switch the schema and the app at the same time
- **expand-contract** = "① add (don't remove) → ② migrate → ③ remove," always keeping backward compatibility
- Rename a column not with a rename but by splitting it into "add → dual-write → read swap → drop"
- Insert a deploy between each step so that **both apps can run at every moment**
- Schema changes are [hard to undo](/en/posts/deploy-rollback-strategy/). Slicing small and moving forward is the safe path

**Related:** [Rollback Strategies](/en/posts/deploy-rollback-strategy/) / [RDS (Where Data Lives)](/en/posts/aws-data-stores-explained/)
