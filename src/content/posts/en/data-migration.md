---
title: "Data Migration — Moving Old-System Data into the New One, Correctly"
date: 2026-07-14T11:00:00
summary: "Cutover strategy was covered before. This is the substance: moving the data piled up in the old system into the new one 'correctly.' Here's the bulk vs continuous-sync patterns, mapping and transforming data whose shape and meaning differ between old and new, reconciling and verifying after the move, and the cutover choreography. Data can't be rebuilt — so this is the scariest part of a migration."
tags: ["データベース", "運用"]
level: intermediate
lang: en
translationKey: data-migration
---

When replacing an old system with a new one, the **cutover method** (big-bang / phased / parallel) was covered
[elsewhere](/posts/system-migration-strategy/). This post is the substance —
**moving the data piled up in the old system into the new one, correctly.** Code can be rebuilt, but
**data cannot**. That's why this is the scariest part of a migration.

## Why data migration is the scariest part

An app migration is "rebuildable," but data is the only copy of "that one record." Break it and there's no getting it back.
And old-system data is rarely tidy.

- **Different shape**: one old table splits into two in the new — or the reverse, merged. Columns and types don't line up
- **Different meaning**: the same "status = 3" points to different things in old and new. You need a code-value mapping
- **It's dirty**: production data piled up over years always hides missing values, duplicates, out-of-spec values, and mojibake
- **Implicit rules**: assumptions written in neither code nor docs sleep in there — like "if this column is empty, treat it specially"

> ⭐ Data migration isn't a "copy" but a "**translation**." You **transform** old-world data into new-world meaning and carry it over.
> So a migration script is essentially a pile of old→new transformation rules.

## The patterns — bulk, or continuous sync

Two broad options. Which you pick corresponds to the [cutover method](/posts/migration-strategy-selection/).

| Pattern | How | Fits when | Downtime |
| --- | --- | --- | --- |
| Bulk migration | stop → extract, transform, load everything → resume | small data volume / can stop briefly | required (during the move) |
| Continuous sync | move the history, then keep streaming later changes | can't stop / want parallel running | almost none |

Continuous sync has two moves: **dual-write** (the app writes to both old and new) and **CDC** (capture the old DB's
change log and stream it to the new). The basic form: **backfill the history in bulk first**, then **keep streaming** the deltas.

> 💡 Continuous sync's strength is creating a state where "old and new stay in agreement." Verify the new one while running in parallel,
> then point reads at the new when ready — you can **shift over gradually**.

## Mapping and transforming — old and new differ in shape and meaning

Most of the migration design is spent building this "mapping table." The transformation points that commonly bite:

- **Schema mapping**: which new column each old column goes to. How to split, merge, or default a new required column
- **Code values**: a mapping from old category values to new ones. How to handle values with no mapping (reject / fall back to a default)
- **Encoding and format**: Shift_JIS → UTF-8, a custom date format → ISO, full-width/half-width drift
- **NULL / empty / zero**: is the old "empty string" NULL in the new? A default? **Decide the meaning before** transforming
- **Deduplication**: is one person scattered across multiple rows? Decide the merge rule up front
- **Cleansing**: what to do with dirty, out-of-spec data — **classify** into fix / drop / hold

> 🧭 If the old system is Shift_JIS or a legacy date format, even *reading* it in C#/.NET trips on `Encoding` and `DateTime` parsing.
> A migration script is a pile of type conversions — **don't swallow a record that fails to convert**; always log it as an error row.

## Reconciliation and verification — the move isn't the end

"The load succeeded" and "it moved correctly" are different things. The real work of a migration is **verification**.

- **Row-count check**: do old and new counts match, factoring in the transformation rules (for a 1→2 split, divide the expected value and compare)
- **Sum check**: do the **totals** of amounts and quantities match between old and new? It catches breakage without inspecting every row
- **Sampling spot-check**: pull representative, boundary, and anomalous records and compare old vs new by eye, one by one
- **Referential integrity**: after the move, is any foreign key's counterpart missing?

> ⚠️ Don't relax at "loaded without errors." A transformation bug **quietly inserts wrong values without raising an error**.
> Make the three-way check — counts, totals, samples — run **automatically** on every migration.

## Cutover choreography — rehearsal, deltas, and a way back

Don't make production a one-shot gamble. Kill the risk with choreography.

1. **Rehearse**: run the migration end-to-end on a copy of production. Keep scripts **idempotent** (same result no matter how many times you run them)
2. **Freeze or delta**: for bulk, freeze the old to read-only and move it. For continuous sync, **drain the final delta** right before cutover
3. **Switch over**: point references at the new. If you can go reads-first, then writes, do it in stages
4. **Don't delete the old data**: keep the old **as-is** for a while after cutover, as insurance to roll back to (same idea as [soft delete](/posts/soft-delete/))

> ⭐ Don't "delete the old immediately once migration finishes." **Leaving a way back** applies to data, not just the cutover method.
> Problems in the new system most often surface right after cutover. Delete the old data only after the watch period.

## Summary

- Data migration isn't a "copy" but an old→new **translation**. Unlike code, **data can't be rebuilt** — that's the core fear
- The patterns are **bulk** (stop, move everything) and **continuous sync** (dual-write / CDC streaming). Pick to match the cutover method
- Most of the design is **mapping and transforming**: schema, code values, encoding, NULL, deduplication, cleansing
- **Reconciliation and verification** are the real work. Automate the counts/totals/samples three-way check. "Load succeeded ≠ moved correctly"
- Cutover is **rehearse → delta sync → staged switch**. And **don't delete the old data** — leave a way back

**Related:** [Migrating from Old to New System](/posts/system-migration-strategy/) / [Choosing a Migration Method](/posts/migration-strategy-selection/) / [DB Schema Migration (expand-contract)](/posts/db-schema-migration-expand-contract/)
