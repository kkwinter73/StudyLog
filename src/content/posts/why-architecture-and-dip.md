---
title: "なぜアーキテクチャが必要か — 依存と依存性逆転(DIP)"
date: 2026-06-19T20:00:00
summary: "コードが育つと「触るのが怖い」状態になる。それを防ぐ鍵は依存の方向の管理。良い依存・悪い依存と、その核心である依存性逆転(DIP)を整理する。"
tags: ["アーキテクチャ", "設計"]
level: beginner
---

> 📚 シリーズ「Goで学ぶアーキテクチャとテスト」(1 / 7)

ソフトウェアアーキテクチャの議論は、煎じ詰めると **「依存の方向をどうコントロールするか」** に尽きる。
まずは「なぜ必要か」と、その核心である依存性逆転(DIP)を押さえる。

## 小さいうちは要らない、大きくなると効いてくる

数百行のスクリプトに設計は要らない。だが1万行を超えるあたりから、設計のないコードは
**「触るのが怖いコード」** になる。

- 1箇所変えると別の場所が壊れる
- 新機能の追加にかかる時間がどんどん伸びる
- テストが書けない（書いても意味がない）
- 新メンバーが全体を理解できない

アーキテクチャはこれを次の4点で防ぐ。

| 狙い | 内容 |
| --- | --- |
| 変更に強くする | ビジネスロジックと DB / UI を別々に変更できる |
| テストしやすくする | DB や API に繋がなくてもロジックを試せる |
| 分担できる | 「あの人しか触れない」領域をなくす |
| 技術を差し替え可能に | DB を変えてもビジネスロジックは変わらない |

> 🧭 C#/.NET なら ASP.NET Core のレイヤード、DDD、CQRS で同じ課題に取り組む。Go でもやりたいことは同じで、ツールと慣習が違うだけ。

## 依存とは「影響の方向」

`A` が `B` を import する = **A は B に依存する**。B が変われば A が影響を受け、B が壊れれば A も壊れる。
依存の方向は、そのまま影響の方向になる。

### 悪い依存（高結合）

ビジネスロジックが DB の具体実装に直結している例。

```go
package usecase

import "myapp/infrastructure/mysql" // 具体的な技術に依存

func GetUser(id int) (*User, error) {
	db := mysql.Connect()            // MySQL に直結
	row := db.QueryRow("SELECT ...") // SQL が直書き
	// ...
}
```

これだと、MySQL を変えたら書き直し、テストに本物の DB が要り、DB の都合がロジックに漏れ出す。

### 良い依存（低結合）

「必要な能力」をインターフェースで要求し、具体実装はロジックの外に出す。

```go
package usecase

// 「ユーザーを取得する能力」だけを要求する
type UserRepository interface {
	FindByID(id int) (*User, error)
}

func GetUser(repo UserRepository, id int) (*User, error) {
	return repo.FindByID(id)
}
```

MySQL 実装もテスト用モックも、このインターフェースを満たすだけでよい。

```go
// 本番: MySQL 実装
type UserRepo struct{ db *sql.DB }
func (r *UserRepo) FindByID(id int) (*User, error) { /* MySQL 固有の処理 */ }

// テスト: モック実装
type MockRepo struct{ Users map[int]*User }
func (m *MockRepo) FindByID(id int) (*User, error) { return m.Users[id], nil }
```

## 依存性逆転の原則 (DIP)

通常は「上位（ロジック）→ 下位（DB実装）」と依存する。これを逆転させ、
**上位がインターフェースを定義し、下位がそれを満たす** 形にする。

```text
【逆転前】 usecase ──→ mysql            (usecase が mysql を知っている)

【逆転後】 usecase ──→ Repository(interface)
                            ↑
                          mysql         (mysql が usecase の定義を満たす)
```

依存の矢印が逆を向く。これが **Go の暗黙的インターフェース実装と相性抜群**。
`mysql` パッケージは `usecase` の `Repository` を import すらせず、メソッドが揃えば自動的に満たす。

> 💡 「実装」ではなく「抽象（インターフェース）」に依存する。これがレイヤード／ヘキサゴナル／クリーン、すべてのパターンの土台になる。

## まとめ

- アーキテクチャの核心は「依存の方向の管理」
- 依存の方向 = 影響の方向。実装に直接依存すると変更・テストに弱くなる
- インターフェースに依存させ、実装を外に出すと疎結合になる
- DIP = 上位が抽象を定義し下位が満たす。Go の暗黙インターフェースと好相性

次は、この原則を形にした代表的な3つのアーキテクチャパターンを比較する。

**→ 次:** [アーキテクチャパターン3種を比較する](/posts/architecture-patterns-compared/)
