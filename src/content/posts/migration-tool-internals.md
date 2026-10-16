---
title: "移行ツールの中身 — 1 ドメイン = 1 トランザクションで組み立てる"
date: 2026-10-16T10:00:00
summary: "古いシステムのデータを新しいシステムへ移す「移行ツール」は、どういう構造のプログラムなのか。1 本の長いスクリプトが必ず壊れる理由から始めて、移行の単位をどう切るか、実行順をどう決めるか、失敗したときどこまで巻き戻すか、何度流しても壊れないようにするには、を順番に見ていく。"
tags: ["アーキテクチャ", "設計", "Go"]
level: intermediate
---

古いシステムから新しいシステムへデータを移す話は[別記事](/posts/data-migration/)で整理した。
この記事は、その**作業をやるプログラム（移行ツール）そのもの**の話。どんな構造で書けば、
本番で安心して動かせるのかを順番に見ていく。

## そもそも移行ツールは何をするプログラムか

やることは 3 つしかない。**旧 DB から読む → 形を変える → 新 DB に入れる**。

```text
   旧 DB（読むだけ）         移行ツール（Go の CLI）          新 DB（入れる先）
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ app_user         │      │ ① 読む            │      │ users            │
│ app_order        │ ───> │ ② 形を変える       │ ───> │ orders           │
│ app_order_line   │      │ ③ 入れる          │      │ order_items      │
└──────────────────┘      └──────────────────┘      └──────────────────┘
   １行も書き換えない                                   何度でも作り直せる
```

真ん中の「形を変える」が具体的に何をしているかというと、こういうことだ。注文 1 件を例にする。

| 旧 `app_order` の列 | 旧の値 | 新 `orders` の列 | 新の値 | やっていること |
| --- | --- | --- | --- | --- |
| `uuid` | `a1b2c3…` | `id` | `a1b2c3…` | そのまま運ぶ |
| `state` | `WaitingPayment` | `status` | `WAITING_PAYMENT` | 区分値を対応表で変換 |
| `price` | `3000` | `amount` | `3000` | そのまま運ぶ |
| `memo` | `''`（空文字） | `memo` | `NULL` | 空文字の意味を決めて変換 |
| （旧には無い） | — | `currency` | `JPY` | 新しく増えた必須列を埋める |

**1 行ずつこれを判断して、新しい行を組み立て直す。** テーブルが 50 個あれば、この表が 50 枚ある。
それが移行ツールの中身だ。

> 💡 移行ツールは**本番では 1 回しか動かさない**のに、作っている間は**何十回も動かす**。リハーサル、
> やり直し、テスト。「1 回しか使わないから雑でいい」ではなく、「**何十回も流すから壊れにくく作る**」
> のが正しい。

## 最初に書きたくなる形と、それが壊れる所

素直に書くと、上から順に全テーブルを処理する 1 本の関数になる。

```go
func main() {
	migrateUsers()      // users を入れる
	migrateProducts()   // products を入れる
	migrateOrders()     // orders を入れる（users と products が先に要る）
	migrateOrderItems() // order_items を入れる（orders が先に要る）
	// ... これが 50 行続く
}
```

動きはする。ただ、4 つの形で確実に行き詰まる。

**① 順番のルールがコードの行の並びにしか無い**

`migrateOrders()` は `users` が先に入っていることが前提だ。でもその前提はどこにも書かれていない。
誰かが行を並べ替えたら、外部キー制約でエラーになって初めて気づく。

**② 一部だけやり直せない**

「`orders` の変換を直したから、そこだけ入れ直したい」ができない。`main()` を実行すれば全部が
走る。50 テーブル全部で 2 時間かかるなら、1 文字直すたびに 2 時間待つことになる。

**③ 失敗したときの戻し方が極端**

全部を 1 つのトランザクションで囲むと、最後まで終わるまで何も確定しない（途中で落ちたら全部消える）。
囲まないと、**途中まで入った中途半端な状態がそのまま残る**。どちらも扱いづらい。

**④ テストが書けない**

DB への接続・設定の読み込み・値の変換・投入が 1 つの関数に混ざっている。「`WaitingPayment` が
`WAITING_PAYMENT` になるか」だけを確かめたくても、そのために本物の DB が要る。

4 つとも、原因は同じ 1 つ。**処理が切り分けられていない**。だから次の節から、切り方を決めていく。

## 移行の単位を「ドメイン」に切る

ではテーブル 1 つを単位にするか——というと、それだと細かすぎる。`orders` だけ入れて
`order_items` が入っていない状態は、業務としては使いものにならないからだ。

**まとめて移さないと意味が通らないテーブルの束**を 1 単位にする。これをドメインと呼ぶことにする。

```text
order ドメイン ＝ { orders, order_items, order_payments }
user  ドメイン ＝ { users, user_addresses }
```

各ドメインは、この 3 つのメソッドだけを持つ型として書く。

```go
// Migrator は各ドメインが実装する。
type Migrator interface {
	Name() Name                                      // ① 自分の名前
	Dependencies() []Name                            // ② 先に入れておいてほしいドメイン
	Run(ctx context.Context, in Inputs) (Result, error) // ③ 本体
}
```

読み方はこう。

- **① `Name()`** — `"order"` のような短い名前。CLI の `--domain order` で指定する値でもある
- **② `Dependencies()`** — 「自分より先に入っていてほしいドメイン」を**自己申告**する。
  ここが後で効く（次の節）
- **③ `Run()`** — 読んで・変換して・入れる本体。戻り値の `Result` には「何行読んで何行書いたか」を入れる

実装は 1 パッケージ 1 ドメインにして、外に見せるのは `New()` だけにする。

```go
func New() domain.Migrator { return &migrator{} }

type migrator struct{} // 中身は空。状態を持たせない

func (m *migrator) Name() domain.Name { return "order" }

// orders は users(id) と products(id) に外部キーを持つので、両方を先に入れてほしい。
func (m *migrator) Dependencies() []domain.Name { return []domain.Name{"user", "product"} }
```

`Run()` が受け取る `Inputs` には、そのドメインが使う道具を**全部引数で**渡す。

```go
type Inputs struct {
	SourcePG *pgxpool.Pool // 旧 DB への接続（読み取り専用）
	TargetTx pgx.Tx        // 新 DB のトランザクション。呼び出し側が開始済み
	Logger   *slog.Logger  // ドメイン名を付けてあるロガー
	Options  RunOptions    // DryRun などの CLI フラグ
}
```

> 💡 ここで**グローバル変数や `init()` での自動登録を使わない**のが大事。「どのドメインを流すか」が
> `main` の 1 箇所に明示的なリストとして並ぶので、読めば分かるし、テストは好きなドメインだけを
> 渡して動かせる。

> 🧭 C# なら `IMigrator` を DI コンテナに自動登録したくなる場面。ただし移行ツールは
> **「どれを移すか」の一覧そのものが仕様書**なので、自動収集より `main` に手で並べた方がいい。
> 並べ忘れは、ディレクトリの一覧と突き合わせるテストで機械的に検出できる。

## 実行順は「宣言」から自動で決める

各ドメインが `Dependencies()` を申告していれば、**実行順はプログラムが計算できる**。人が順番を
書く必要がなくなる。

申告を集めると、こういう矢印の図（有向グラフ）になる。

```text
user ────┐
         ├──> order ──> payment
product ─┘

（矢印は「こっちが先」。payment は order を待ち、order は user と product を待つ）
```

この図から順番を出すアルゴリズムが**トポロジカルソート**。考え方は単純で、

1. 各ドメインについて「**自分が待っている相手の数**」を数える（`user` は 0、`order` は 2、`payment` は 1）
2. **0 のもの**を実行キューに入れる → `user`, `product`
3. 1 つ取り出したら、それを待っていた相手の数を 1 減らす
4. 0 になったものをキューに足す → `order` が 0 になるので入る
5. キューが空になるまで繰り返す

コードにするとこうなる（Kahn のアルゴリズム）。

```go
func topoSort(targets []domain.Migrator) ([]domain.Migrator, error) {
	indegree := map[domain.Name]int{}        // そのドメインが待っている相手の数
	graph := map[domain.Name][]domain.Name{} // 依存先 → それを待っているドメインの一覧

	for _, m := range targets {
		if _, ok := indegree[m.Name()]; !ok {
			indegree[m.Name()] = 0
		}
		for _, dep := range m.Dependencies() {
			graph[dep] = append(graph[dep], m.Name())
			indegree[m.Name()]++ // 待つ相手が 1 つ増えた
		}
	}

	ready := readyNames(indegree) // 待ち数 0 のものを名前の辞書順で並べる
	var out []domain.Migrator
	for len(ready) > 0 {
		n := ready[0]
		ready = ready[1:]
		out = append(out, byName[n])

		for _, next := range graph[n] {
			indegree[next]-- // 待っていた相手が 1 つ片付いた
			if indegree[next] == 0 {
				ready = insertSorted(ready, next) // 辞書順を保ったまま足す
			}
		}
	}

	if len(out) != len(targets) {
		// 全部取り出せなかった = 残りが互いに待ち合っている（循環）
		return nil, errors.New("cyclic dependency")
	}
	return out, nil
}
```

細かいが効いてくるのが次の 2 点。

- **同じ段のものは名前の辞書順で並べる**。`user` と `product` はどちらが先でもいいが、Go の map を
  そのまま回すと**実行のたびに順序が変わる**（Go は map の反復順をわざとランダムにしている）。
  移行は「前回と同じ結果になること」が命なので、順序は固定する
- **循環は実行前にエラーにする**。取り出せた数が入力数より少なければ、残りは互いに待ち合っている。
  「A は B を待ち、B は A を待つ」は宣言のミスなので、動かす前に止める

> ⚠️ `--domain order` のように 1 つだけ指定したとき、**依存先を自動で巻き込んで実行しない**。
> 「`order` だけ入れ直すつもりが `user` まで作り直されていた」が一番こわい事故だからだ。
> 入力に無い依存は順序計算から無視して、足りなければ実行時にエラーにする方を選ぶ。

## 失敗したらどこまで戻すか — 境界は呼ぶ側が持つ

**トランザクション**は「ここからここまでを、全部成功か・全部無かったことにするか、のどちらかにする」
という DB の仕組み。移行では、この**範囲の決め方**が設計そのものになる。

選択肢は 3 つあり、真ん中を取る。

| 範囲 | 失敗したとき | 問題 |
| --- | --- | --- |
| 全ドメインで 1 つ | 全部消える（きれい） | 2 時間かけて最後の 1 件で落ちると全部やり直し |
| **ドメインごとに 1 つ** | **そのドメインだけ消える** | **← これを採る** |
| テーブルごとに 1 つ | そのテーブルだけ消える | `orders` は入って `order_items` は無い状態が残る |

実装のポイントは、**`Run()` の中でトランザクションを開始・確定しない**こと。呼び出し側（オーケスト
レーター）が開始して、`Inputs.TargetTx` として貸す。

```go
func runDomain(ctx context.Context, m domain.Migrator, pool *pgxpool.Pool) domain.Result {
	tx, err := pool.Begin(ctx) // ① 呼ぶ側が開始する
	if err != nil {
		return failed(m, err)
	}
	defer func() { _ = tx.Rollback(ctx) }() // ② 失敗時の巻き戻しを先に予約しておく

	result, runErr := m.Run(ctx, domain.Inputs{TargetTx: tx /* ... */}) // ③ 貸す
	if runErr != nil {
		return failed(m, runErr) // ② の Rollback がここで効く
	}

	if err := tx.Commit(ctx); err != nil { // ④ 呼ぶ側が確定する
		return failed(m, err)
	}
	return result
}
```

> 💡 ② の `defer tx.Rollback(ctx)` は**成功する場合も含めて必ず書く**のが Go の定石。
> 確定済みのトランザクションに対する `Rollback` は何もしない（no-op）ので、「エラーで抜ける経路
> ごとに Rollback を書く」という面倒が消える。

> 🧭 C# の `TransactionScope` や `DbContext` と役割分担は同じ。**借りた側は確定しない**を徹底する
> ほど、失敗したときの扱いを呼び出し側の 1 箇所で決められる。

## 何度流しても同じ結果にする（冪等）

移行ツールは必ず何度も流す。**同じコマンドを 2 回流したら 2 倍のデータが入る**ツールは、途中で
落ちたときに誰も再実行できない。「同じ操作を何度繰り返しても結果が同じ」という性質を**冪等**
（べきとう、idempotent）と呼ぶ。

いちばん単純な冪等化は、**各ドメインが自分の担当テーブルを空にしてから入れ直す**こと。

```go
func (m *migrator) Run(ctx context.Context, in domain.Inputs) (domain.Result, error) {
	// 空にする → 入れ直す を同じトランザクションの中でやる。
	// 途中で落ちれば TRUNCATE ごと巻き戻るので、データが消えたまま残ることはない。
	if err := pgio.TruncateCascade(ctx, in.TargetTx, "orders", "order_items"); err != nil {
		return domain.Result{}, err
	}
	// ... 読んで、変換して、COPY で入れる
}
```

「既にある行は更新、無ければ挿入（`UPSERT`）」で差分を当てる手もあるが、移行では**全消し → 全入れ**
の方が速く、結果も読みやすい。新 DB は移行中まだ誰も使っていないので、消して困る人がいない。

投入は 1 行ずつの `INSERT` ではなく `COPY` を使う。

```text
INSERT を 50 万回  → 1 行ごとに DB と往復する。遅い
COPY で 50 万行    → まとめて 1 回のストリームで流し込む。桁違いに速い
```

そして `--dry-run`（実際には書かずに動かす）は、`COPY` を呼ばずに**変換だけ最後まで走らせて
件数を返す**ように作る。これで「1 行も書かずに、変換が壊れていないか」を確かめられる。

```go
func CopyRows(ctx context.Context, tx pgx.Tx, table string, columns []string,
	src pgx.CopyFromSource, dryRun bool) (int64, error) {
	if dryRun {
		return drainCopySource(src) // 最後まで読んで、件数だけ数えて返す
	}
	return tx.CopyFrom(ctx, pgx.Identifier{table}, columns, src)
}
```

> ⚠️ 一括ロード中は **DB の制約が当てにならない**ことがある。PostgreSQL で
> `SET session_replication_role = replica` を使うと（監査用トリガを止めるためによく使う）、
> **同時に外部キーの検査も止まる**。「DB が弾いてくれるから変な行は入らない」が成り立たなくなるので、
> 整合性の確認は移行後の検証フェーズへ回す
> （[preflight / migrate / validate](/posts/preflight-migrate-validate/)）。

## まとめ

- 移行ツールの中身は「**1 行ずつ読んで、新しい行に組み立て直す**」処理の集まり。テーブルの数だけ
  対応表がある
- 単位は**テーブルではなくドメイン**（まとめて移さないと意味が通らない束）。`Name` /
  `Dependencies` / `Run` の 3 つだけの interface にすると、部分実行もテストもできるようになる
- **実行順は書かずに計算する**。各ドメインの依存申告からトポロジカルソートで導き、同じ段は辞書順で
  固定して「毎回同じ順序」にする
- **トランザクションは呼ぶ側が開始して貸す**。1 ドメイン = 1 トランザクションが、巻き戻す範囲として
  ちょうどいい
- **全消し → `COPY` で全入れ**にして冪等にする。何度流しても同じ結果になって初めて、本番で
  「止めて、直して、もう一度」が選べる

## 次にやること

旧 ID を新 ID へどう対応づけるか——そのまま使うか、対応表を持つか——は
[移行の ID マッピング](/posts/id-mapping-in-migration/)へ。
