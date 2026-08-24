---
title: "値オブジェクト入門 — string と int をやめて意味のある型を作る"
date: 2026-08-24T10:00:00
summary: "「金額」を int で持つと通貨も検証も呼び出し側の責任になる。値オブジェクトの定義、Go での作り方（不変・自己検証・== での比較）、そしてどこまで作るべきかの線引きを整理する。"
tags: ["アーキテクチャ", "設計", "Go"]
level: beginner
---

`amount int64`、`email string`、`userID string` —— 動くが、**その値が正しいかを誰も保証していない**。
値オブジェクト（Value Object）は「意味のある値」を型にして、検証と振る舞いを値の側に閉じ込める道具だ。
この記事では値オブジェクトの定義、Go での実装（不変・自己検証・比較）、そして
どこまで作るかの線引きを押さえる。

[4層アーキテクチャ](/posts/four-layer-architecture/)のドメイン層に住む2種類の住人のうち、
エンティティではなく**値**のほうの話。

## 何が「値」なのか — エンティティとの違い

区別は1点だけ。**同一性（identity）が何で決まるか**だ。

| | エンティティ | 値オブジェクト |
| --- | --- | --- |
| 同一性 | **ID** で決まる | **持っている値**で決まる |
| 例 | ユーザー、注文、商品 | 金額、メールアドレス、期間、住所 |
| 変化 | 属性が変わっても同じもの | 変わったら**別のもの** |
| 等価判定 | `a.ID == b.ID` | 全フィールドが等しいか |

「田中さんが改名しても同じ田中さん」はエンティティ。一方「1000円」は、金額が1200円になったら
それは**別の値**であって「変化した1000円」ではない。

> ⭐ 迷ったら **「ID を振りたいか？」**で判断する。振りたいならエンティティ、
> 値そのものが正体なら値オブジェクト。

> 🧭 C# の `record` / `readonly record struct` が値等価を自動で持つのと同じ発想。Go の struct はもともと値型で `==` が構造的等価なので、**record 相当の挙動が既定**で手に入る。

## Go での最小形 — コンストラクタで検証する

型を定義し、**生成の入口を1つに絞って**そこで検証する。これだけで「不正な値が存在しない」が保証できる。

```go
package money

import (
	"errors"
	"fmt"
)

// フィールドは非公開。外から勝手に組み立てられない
type Money struct {
	amount   int64  // 最小単位（円なら1円、ドルならセント）
	currency string // "JPY", "USD"
}

func New(amount int64, currency string) (Money, error) {
	if amount < 0 {
		return Money{}, errors.New("money: amount must not be negative")
	}
	if currency != "JPY" && currency != "USD" {
		return Money{}, fmt.Errorf("money: unsupported currency %q", currency)
	}
	return Money{amount: amount, currency: currency}, nil
}

func (m Money) Amount() int64    { return m.amount }
func (m Money) Currency() string { return m.currency }
```

これで `Money` を受け取った側は**検証しなくていい**。存在している `Money` は必ず正しい、が型で言えている。

> ⚠️ 非公開フィールドでも **ゼロ値は作れる**（`money.Money{}` はパッケージ外でも書ける）。
> 完全には封じられないので、ゼロ値が「0円・通貨なし」として無害か、
> あるいは使う側で弾くかを決めておく。ここは Go の割り切りどころ。

> 💡 金額を `float64` にしないこと。`0.1 + 0.2 != 0.3` になるので、**最小単位の整数**で持つ。
> これは値オブジェクトにする以前の話だが、型に閉じ込めると間違えようがなくなる。

## 不変にする — 変更は新しい値を返す

値オブジェクトは**作った後で変えない**。振る舞いは「自分を書き換える」のではなく
「**計算結果を新しい値として返す**」形にする。

```go
func (m Money) Add(other Money) (Money, error) {
	if m.currency != other.currency {
		// 業務ルールが型の中にある。呼び出し側が通貨チェックを忘れられない
		return Money{}, fmt.Errorf("money: currency mismatch: %s vs %s", m.currency, other.currency)
	}
	return Money{amount: m.amount + other.amount, currency: m.currency}, nil
}
```

ポイントは**レシーバを値（`m Money`）にする**こと。ポインタレシーバにすると
`m.amount += ...` と書けてしまい、不変が崩れる。

| やること | 書き方 |
| --- | --- |
| 値を読む・計算する | 値レシーバ（`func (m Money) ...`）で新しい値を返す |
| 状態を変える | **作らない**。値オブジェクトに setter は置かない |

不変だと何が嬉しいかというと、**渡した先で書き換わらない**。マップのキーにもでき、
[並行処理](/posts/goroutine-channel-basics/)でも共有して安全だ。

## 等価性 — == が使える条件

Go の struct は、**全フィールドが比較可能なら `==` がそのまま構造的等価**になる。

```go
a, _ := money.New(1000, "JPY")
b, _ := money.New(1000, "JPY")
fmt.Println(a == b) // true。フィールドが全部等しい
```

ただし比較できない型を含むと `==` はコンパイルエラーになる。

| フィールドに含むもの | `==` |
| --- | --- |
| 数値・文字列・bool・配列・比較可能な struct | 使える |
| **スライス・マップ・関数** | コンパイルエラー |

スライスを持つ場合（住所の行など）は `Equal` メソッドを自分で用意する。

```go
type Address struct {
	lines []string // スライスがあるので == は使えない
}

func (a Address) Equal(other Address) bool {
	return slices.Equal(a.lines, other.lines)
}
```

> 💡 逆に言えば、**値オブジェクトはスライスを持たない設計にできるとお得**。
> `==` がそのまま使え、マップのキーにもなり、比較を書く手間も消える。

## 境界をまたぐ — DB と JSON

非公開フィールドは、そのままでは DB にも JSON にも出ない（外のパッケージから見えないため）。
境界のための変換を型側に持たせる。

```go
// database/sql 用: 読み（Scanner）は値を書き換えるのでポインタレシーバ
func (m *Money) Scan(src any) error {
	v, ok := src.(int64)
	if !ok {
		return fmt.Errorf("money: cannot scan %T", src)
	}
	m.amount, m.currency = v, "JPY"
	return nil
}

// 書き（Valuer）は値レシーバ
func (m Money) Value() (driver.Value, error) { return m.amount, nil }
```

```go
// JSON 用
func (m Money) MarshalJSON() ([]byte, error) {
	return json.Marshal(map[string]any{"amount": m.amount, "currency": m.currency})
}
```

> ⚠️ `UnmarshalJSON` と `Scan` は**検証をすり抜ける入口になる**。外部から来た値なので、
> ここでも `New` と同じチェックを通す（`New` を呼んで結果を代入するのが一番安全）。

> 🧭 C# の `IEquatable<T>` / `TypeConverter` / EF Core の `ValueConverter` に相当する層。Go では標準インターフェース（`sql.Scanner`、`json.Marshaler`）を型に実装するだけで済む。

## どこまで作るか — 効く場所と過剰な場所

全部の `string` を型にすると、変換コードだけが増えて読みにくくなる。**効くのは次の条件が揃う値**だ。

- **正しさの規則がある**（メールアドレス、電話番号、金額が負でない）
- **振る舞いがある**（通貨を揃えて足す、期間が重なるか判定する）
- **取り違えると事故る**（`userID` と `orderID` はどちらも文字列で、逆に渡しても動く）

3番目は型を作るだけで防げるので、コストがほぼゼロで効く。

```go
type OrderID string
type UserID string

func Find(id OrderID) (*Order, error) { /* ... */ }
// Find(userID) はコンパイルエラー。テストではなく型で防げる
```

逆に**作らなくていい**もの。

| ケース | 理由 |
| --- | --- |
| 素通しするだけの値（説明文、備考） | 規則も振る舞いもない。`string` で十分 |
| 外部 API のレスポンスをそのまま渡す | 境界の外の形。無理に型を作ると変換だけが増える |
| フィールドが1つで検証もない型 | 名前が付いただけ。得より変換コストが勝つ |

> ⭐ 判断基準は「**この検証を、呼び出し側が全員忘れずに書けるか？**」。書けないなら型にする。
> それが値オブジェクトを入れる唯一の理由と考えていい。

## まとめ

- **同一性が値で決まる**のが値オブジェクト。ID で決まるならエンティティ
- 生成の入口を**コンストラクタ1つに絞って検証**する。以降は「存在すれば正しい」が保証される
- **不変**にする。値レシーバで新しい値を返し、setter は置かない
- 全フィールドが比較可能なら `==` がそのまま使える。スライスを持つなら `Equal` を書く
- DB・JSON の入口（`Scan` / `UnmarshalJSON`）は**検証の抜け道**になるので同じチェックを通す
- 作る基準は「呼び出し側が検証を忘れずに書けるか」。素通しの値まで型にしない

## 次にやること

- 手元のコードで「同じ検証を2箇所以上で書いている値」を探し、そこから1つ型にしてみる
- ID 型（`UserID` / `OrderID`）を定義して、取り違えがコンパイルエラーになるか確かめる
- 作った型を[ドメイン層](/posts/four-layer-architecture/)に置き、DB 変換を境界側に寄せる
