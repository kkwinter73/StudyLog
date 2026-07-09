---
title: "SQL の基本 — SELECT・JOIN・集計でデータを取り出す"
date: 2026-07-09T23:30:00
summary: "SQLは「どう取るか」でなく「何が欲しいか」を書く宣言的な言語。SELECTの基本形・複数テーブルを結ぶJOIN・GROUP BYでの集計・INSERT/UPDATE/DELETEの4点を押さえ、実際に書けるようになる。"
tags: ["データベース", "基礎"]
level: beginner
---

[RDBMS](/posts/rdbms-basics/) を操作する共通語が **SQL**。特徴は**宣言的**なこと——「どう取るか」の
手続きでなく「何が欲しいか」の条件を書くと、DBが効率的な取り方を決めてくれる。SELECT の基本形・
JOIN・集計・書き込みの4点を押さえれば、日々のクエリは書ける。

以下は `users`（顧客）と `orders`（注文）の2表を例に進める。

```text
users                      orders
+----+-------+-------+     +----+---------+--------+------------+
| id | name  | city  |     | id | user_id | amount | created_at |
+----+-------+-------+     +----+---------+--------+------------+
|  1 | 田中  | 東京  |     | 10 |    1    |  3000  | 2026-07-01 |
|  2 | 佐藤  | 大阪  |     | 11 |    1    |  1500  | 2026-07-02 |
|  3 | 鈴木  | 東京  |     | 12 |    2    |  8000  | 2026-07-03 |
+----+-------+-------+     +----+---------+--------+------------+
```

## SELECT の基本形 — 絞る・並べる

読み取りの中心は `SELECT`。**何の列を(SELECT)・どの表から(FROM)・どの行だけ(WHERE)・
どう並べて(ORDER BY)** を宣言する。

```sql
SELECT id, name           -- 欲しい列（* は全列だが本番では列を明示）
FROM users
WHERE city = '東京'        -- 条件で行を絞る
ORDER BY id DESC           -- 並び順（DESC=降順）
LIMIT 10;                  -- 先頭10件だけ
```

- `WHERE` の演算子: `=` `<>` `<` `>=`、`IN (…)`、`BETWEEN a AND b`、`LIKE 'ab%'`（前方一致）
- NULL の判定は `= NULL` ではなく **`IS NULL` / `IS NOT NULL`**

> 🧭 C#/.NET の LINQ が最終的に変換される先がこの SQL。`Where`→`WHERE`、`OrderBy`→`ORDER BY`、
> `Select`→`SELECT` 列 と、ほぼ1対1で対応する。

## JOIN — 複数テーブルを結ぶ

正規化で分けた表は `JOIN` で組み合わせる。**キーの一致**（`ON`）で行をつなぐ。

```sql
SELECT u.name, o.amount, o.created_at
FROM orders o
JOIN users u ON u.id = o.user_id   -- orders.user_id と users.id を突き合わせ
WHERE o.amount >= 2000;
```

内部結合(`JOIN`)と外部結合(`LEFT JOIN`)の違いが最重要。

| 種類 | 意味 | 注文のない顧客は |
| --- | --- | --- |
| `JOIN`（内部） | 両表で一致する行だけ | 出ない |
| `LEFT JOIN` | 左表は全部残し、右が無ければ NULL | 出る（amount が NULL） |

> 💡 「注文0件の顧客も一覧に出したい」なら `LEFT JOIN`。内部結合だと**片方にしかない行が消える**のが
> つまずき所。テーブルには短い別名(`o` `u`)を付けると読みやすい。

## 集計 — GROUP BY でまとめる

「顧客ごとの合計」のような集計は、**`GROUP BY` でグループに分け、集計関数で潰す**。

```sql
SELECT u.name, COUNT(*) AS 件数, SUM(o.amount) AS 合計
FROM orders o
JOIN users u ON u.id = o.user_id
GROUP BY u.name           -- name ごとにまとめる
HAVING SUM(o.amount) >= 3000   -- 集計後の絞り込みは HAVING
ORDER BY 合計 DESC;
```

- 集計関数: `COUNT` / `SUM` / `AVG` / `MAX` / `MIN`
- **`WHERE` は集計前・`HAVING` は集計後**の絞り込み（ここを混同しやすい）
- `SELECT` に出す非集計列は原則 `GROUP BY` に入れる

> ⚠️ `WHERE` と `HAVING` は役割が違う。「金額2000円以上の注文だけ集計」は `WHERE`、
> 「合計3000円以上の顧客だけ表示」は `HAVING`。

## 書き込み — INSERT / UPDATE / DELETE

読み取り以外の3操作。**`UPDATE`/`DELETE` の `WHERE` 忘れ**が最大の事故。

```sql
INSERT INTO users (name, city) VALUES ('高橋', '名古屋');

UPDATE users SET city = '横浜' WHERE id = 1;   -- WHERE を忘れると全行更新！

DELETE FROM orders WHERE created_at < '2026-01-01';
```

> ⚠️ `WHERE` を付け忘れた `UPDATE`/`DELETE` は**全行**に効く。実行前に同じ条件で `SELECT` して
> 件数を確かめるのが安全。複数更新は[トランザクション](/posts/acid-properties/)でまとめる。

> 🧭 Go では `database/sql` で SQL を直接書くのが基本。値は文字列連結せず必ず
> **プレースホルダ（`?` や `$1`）で渡す**——さもないと [SQLインジェクション](/posts/sql-injection/)になる。

## まとめ

- SQL は**宣言的**——「何が欲しいか」を `SELECT / FROM / WHERE / ORDER BY` で書く
- NULL 判定は `IS NULL`、部分一致は `LIKE`、件数制限は `LIMIT`
- 複数表は `JOIN`。一致行だけなら内部、片方が無くても残すなら **`LEFT JOIN`**
- 集計は `GROUP BY`＋集計関数。**絞り込みは集計前 `WHERE`／集計後 `HAVING`**
- `UPDATE`/`DELETE` は **`WHERE` 必須**。値は**プレースホルダ**で渡す（[SQLi 対策](/posts/sql-injection/)）

**関連:** [RDBMS とは](/posts/rdbms-basics/) / [データベース設計](/posts/database-schema-design/) / [ACID特性](/posts/acid-properties/) / [SQLインジェクション](/posts/sql-injection/)
