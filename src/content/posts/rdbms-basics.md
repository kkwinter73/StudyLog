---
title: "RDBMS とは — 関係モデルとSQLで「壊れない」データを持つ"
date: 2026-07-01T16:00:00
summary: "表と表の関係でデータを持ち、SQLで操作し、制約とトランザクションで整合性を守るのがRDBMS。関係モデル・SQL・スキーマ制約・トランザクションの4点と、NoSQLとの使い分けを押さえる。"
tags: ["データベース", "基礎"]
level: beginner
---

**RDBMS（リレーショナルデータベース管理システム）**は、データを表(テーブル)と表の関係で持ち、
SQLで操作するデータベース。強みは**制約とトランザクションで整合性を守る**こと。関係モデル・SQL・
スキーマ制約・トランザクションの4点と、NoSQLとの使い分けを押さえる。

## 関係モデル — 表と関係で持つ

データを**テーブル（行×列）**で表し、テーブル同士を**キーで関連づける**のが関係モデル。

```text
users                 orders
+----+-------+        +----+---------+--------+
| id | name  |        | id | user_id | amount |
+----+-------+        +----+---------+--------+
|  1 | 田中  |        | 10 |    1    |  3000  |  ← user_id=1 が users.id=1 を指す
|  2 | 佐藤  |        | 11 |    2    |  1500  |
+----+-------+        +----+---------+--------+
```

- 各行を一意に識別するのが**主キー(primary key)**（`users.id`）
- 別テーブルを指すのが**外部キー(foreign key)**（`orders.user_id`）
- データを重複なく分けて持ち、必要な時に**結合(JOIN)**で組み合わせる

## SQL で操作する

RDBMS は **SQL** という宣言的な言語で扱う。「どう取るか」でなく「何が欲しいか」を書く。

```sql
SELECT u.name, o.amount
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.amount >= 2000;
```

- 取得(SELECT)・追加(INSERT)・更新(UPDATE)・削除(DELETE)が基本
- 手続きを書かず**条件を宣言**すると、DBが効率的な取り方を決めてくれる

> 🧭 C#/.NET 経験者なら SQL Server や EF Core でおなじみの世界。LINQ が最終的に SQL に変換される、
> あの SQL が RDBMS の共通語。Go では `database/sql` ＋ドライバで生の SQL を書くことが多い。

## スキーマと制約 — ここが整合性の要

RDBMS は**あらかじめ構造(スキーマ)を決める**。列の型・必須・一意・関連を**制約**として宣言し、
DBが破るデータを拒否する。これが「壊れないデータ」の土台。

| 制約 | 役割 |
| --- | --- |
| NOT NULL | 空を許さない |
| UNIQUE | 重複を許さない（メールアドレス等） |
| PRIMARY KEY | 行の一意な識別子 |
| FOREIGN KEY | 存在しない相手を指せない（参照整合性） |
| CHECK | 条件を満たさない値を拒否（残高 ≥ 0 等） |

> 💡 アプリのバグで変なデータを入れようとしても、**DBが最後の砦**として弾く。整合性をアプリだけに
> 頼らないのが RDBMS の思想。

## トランザクションで守る

複数の更新を「全部か無か」でまとめるのが**トランザクション**。RDBMS はこれに [ACID](/posts/acid-properties/)
の保証を与える。送金や在庫の増減のように**途中で壊れると困る操作**の要。

```sql
BEGIN;
UPDATE accounts SET balance = balance - 3000 WHERE id = 1;
UPDATE accounts SET balance = balance + 3000 WHERE id = 2;
COMMIT;  -- 途中で失敗すれば ROLLBACK で両方なかったことに
```

> ⚠️ [決済トランザクション](/posts/payment-transaction/)や在庫の同時更新で効くのがこれ。ただし
> ロールバックが効くのは**1つのDBの中だけ**（外部連携をまたぐと[補償](/posts/compensating-transaction/)が要る）。

## いつ使う / NoSQL との違い

RDBMS が万能ではない。構造と整合性が要る所に強く、超大規模・柔軟スキーマは NoSQL が向く。

| | RDBMS | NoSQL(例) |
| --- | --- | --- |
| データ構造 | 事前に決めたスキーマ | 柔軟・スキーマレス寄り |
| 強み | 整合性・JOIN・トランザクション | 水平スケール・大量書き込み |
| 一貫性 | 強整合が得意 | [結果整合](/posts/cap-theorem/)寄りが多い |
| 例 | PostgreSQL, MySQL, SQL Server | KVS, ドキュメントDB |

> 💡 迷ったら **まず RDBMS** が定番。関係・整合性・トランザクションが要る業務データの大半はこれで足りる。

## まとめ

- RDBMS は**表と関係**でデータを持ち、**SQL**（宣言的）で操作する
- **主キー/外部キー**でテーブルを関連づけ、必要時に **JOIN** で組み合わせる
- **スキーマと制約**（NOT NULL/UNIQUE/FK/CHECK）でDBが不正データを弾く
- **トランザクション＋[ACID](/posts/acid-properties/)**で「壊れない更新」を保証（1DB内）
- 整合性が要る業務データは RDBMS、超大規模・柔軟スキーマは NoSQL と使い分ける

**関連:** [ACID特性](/posts/acid-properties/) / [データの置き場所(AWS)](/posts/aws-data-stores-explained/) / [DBスキーマ移行](/posts/db-schema-migration-expand-contract/)
