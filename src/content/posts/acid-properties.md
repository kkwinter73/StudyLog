---
title: "ACID特性 — トランザクションが守る4つの保証"
date: 2026-07-01T14:00:00
summary: "DBのトランザクションが「途中で壊れない・混ざらない・消えない」ことを支えるのが原子性・一貫性・分離性・永続性の4性質。それぞれの意味と、実務で効く分離レベルを押さえる。"
tags: ["データベース", "基礎"]
level: intermediate
---

複数の更新を「まとめて全部か、全部なしか」で扱うのがトランザクション。それを支える4つの保証が
**ACID**（Atomicity / Consistency / Isolation / Durability）。1文字ずつの意味と、実務で最も効く
**分離レベル**までを整理する。

## ACID とは

トランザクションが守る4つの性質。頭文字を取って ACID。

| 文字 | 性質 | ざっくり |
| --- | --- | --- |
| A | 原子性(Atomicity) | 全部成功か、全部なし（中途半端がない） |
| C | 一貫性(Consistency) | 制約を壊さない状態から状態へ移る |
| I | 分離性(Isolation) | 並行実行でも互いに混ざらない |
| D | 永続性(Durability) | commit したら消えない |

## 原子性と永続性（A / D）

この2つは直感的。トランザクションの「まとまり」と「確定」を担保する。

- **原子性**: 途中で失敗したら `ROLLBACK` で全部なかったことにする。送金で「引いたのに足されない」を防ぐ
- **永続性**: `COMMIT` が返ったら、直後に電源が落ちても残る（ログに書いてから応答する）

> 💡 [補償トランザクション](/posts/compensating-transaction/)が必要になるのは、この原子性が
> **1つのDBの中でしか効かない**から。外部サービスをまたぐと rollback できない。

## 分離性と分離レベル（I）

実務で一番つまずくのがここ。並行トランザクションを**どこまで隔離するか**は段階（分離レベル）で選ぶ。
隔離を強くすると安全だが遅く、弱くすると速いが異常が起きうる。

| 分離レベル | 防げない異常（例） |
| --- | --- |
| READ UNCOMMITTED | ダーティリード（未コミットを読む） |
| READ COMMITTED | 反復不能読み取り（再読で値が変わる） |
| REPEATABLE READ | ファントム（条件に合う行が増減） |
| SERIALIZABLE | （直列実行と同等・異常なし） |

- 多くのDBの既定は **READ COMMITTED**（PostgreSQL 等）。強い一貫性が要る所だけ上げる
- 在庫や残高の**同時更新**は、分離レベルか明示ロックで「二重に引かれる」を防ぐ

> ⚠️ 「トランザクションで囲めば安全」ではない。**分離レベル次第**で並行異常は起きる。決済・在庫の
> ような取り合いは特に注意。

## 一貫性（C）の位置づけ

ACID の C は「**整合性制約（外部キー・一意制約・残高が負にならない等）を壊さない**」という意味。
A・I・D と DB の制約が組み合わさって結果的に保たれる、やや性格の違う性質。

> ⚠️ この C は、後述の [CAP定理](/posts/cap-theorem/) の C（全ノードで同じ値が見える）とは**別物**。
> 同じ「一貫性」でも指すものが違うので混同しない。

## Go での扱い

`database/sql` では `Begin` → 処理 → `Commit` / `Rollback` の形。`defer` で戻す型が定番。

```go
tx, err := db.BeginTx(ctx, nil)
if err != nil { return err }
defer tx.Rollback() // Commit 済みなら no-op。失敗時の戻しを保証

if _, err := tx.ExecContext(ctx, /* ... */); err != nil {
    return err // defer が Rollback してくれる
}
return tx.Commit()
```

> 🧭 C# の `TransactionScope`（Complete しなければ自動ロールバック）と発想は同じ。
> Go は `defer tx.Rollback()` を先に置き、成功時に `Commit` する形で同じ安全網を作る。

## まとめ

- ACID＝**原子性・一貫性・分離性・永続性**、トランザクションの4保証
- 原子性は「全部か無か」、永続性は「commit したら消えない」
- 実務で効くのは**分離性＝分離レベル**。既定は READ COMMITTED、取り合う所だけ強める
- ACID の C は**制約を壊さない**意味で、CAP の C とは別物
- Go は `BeginTx` ＋ `defer tx.Rollback()` ＋成功時 `Commit` が定番

**関連:** [決済トランザクション](/posts/payment-transaction/) / [CAP定理](/posts/cap-theorem/) / [補償トランザクション](/posts/compensating-transaction/)
