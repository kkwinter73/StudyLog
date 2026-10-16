---
title: "移行ツールの中身 — 1 ドメイン = 1 トランザクションで組み立てる"
date: 2026-10-16T10:00:00
summary: "データ移行を「何をどう移すか」ではなく「ツールをどう組むか」から見る。テーブルごとのスクリプトを並べる代わりに、移行単位を interface にして依存を宣言させ、実行順をトポロジカルソートで導き、トランザクション境界を呼び出し側に持たせる。その構造を Go のコードで追う。"
tags: ["アーキテクチャ", "設計", "Go"]
level: intermediate
---

旧システムから新システムへデータを移す話は[別記事](/posts/data-migration/)で整理した。この記事は
その**実装の中身**——移行ツールそのものを、どういう構造のプログラムとして組むか。題材は
「旧 PostgreSQL を読んで新 PostgreSQL へ投入する CLI」を想定する。

## 1 本の巨大スクリプトが壊れる理由

最初に書きたくなるのは、上から順に全テーブルを処理する 1 本のスクリプトだ。これは序盤だけ速く、
すぐに次の 4 つで行き詰まる。

- **順番が暗黙になる**: `orders` を入れる前に `users` が要る、という前提がコードの行の並びにしか
  無い。並べ替えた瞬間に外部キーで落ちる
- **部分実行できない**: 「`orders` だけやり直したい」ができず、毎回全部流す羽目になる
- **失敗の巻き戻し単位が全か無か**: 1 本の巨大トランザクションにすると最後まで何も確定せず、
  トランザクションを張らなければ中途半端に入った状態が残る
- **テストできない**: 接続・設定・変換・投入が 1 つの関数に混ざると、変換だけを検証できない

対処はどれも同じ方向を向く。**移行の単位を切って、単位どうしの関係を宣言させる**。

## 移行の単位を interface にする

単位を何にするかだが、テーブル 1 つではなく**ドメイン**（まとめて移さないと意味が通らない
テーブル群）にすると収まりがいい。`orders` と `order_items` は別々に移しても使えないからだ。

```go
// Migrator は各ドメインが実装する。
type Migrator interface {
	Name() Name
	// Dependencies は外部キー上の依存先ドメイン名。実行順の算出に使う。
	Dependencies() []Name
	// Run は in.TargetTx の中で投入を完了させ、集計を返す。
	Run(ctx context.Context, in Inputs) (Result, error)
}
```

実装側は 1 パッケージ 1 ドメインで、`func New() Migrator` だけを公開する。

```go
func New() domain.Migrator { return &migrator{} }

type migrator struct{}

func (m *migrator) Name() domain.Name           { return "order" }
func (m *migrator) Dependencies() []domain.Name { return []domain.Name{"user", "product"} }
```

`Run` が受け取る `Inputs` には、そのドメインが使う依存を**全部引数で**入れる。接続も
トランザクションもロガーも、ここから渡す。

```go
type Inputs struct {
	SourcePG *pgxpool.Pool // 旧 DB への読み取り専用プール
	TargetTx pgx.Tx        // 呼び出し側が Begin 済みのトランザクション
	Logger   *slog.Logger  // ドメイン名を付与済み
	Options  RunOptions    // DryRun / BatchSize など CLI フラグ由来
}
```

> 💡 ここでパッケージ変数や `init()` の自己登録を使わないのが効く。「どのドメインを流すか」は
> `main` が明示的に列挙する 1 箇所だけになり、テストは好きな組み合わせの Migrator を直接渡せる。

> 🧭 C# なら `IMigrator` を DI コンテナに自動登録したくなるところ。移行ツールは**対象の列挙そのものが
> 仕様**なので、スキャンで集めるより `main` に手で並べた方が、足し忘れをテストで突き合わせられる。

## 実行順は宣言から導く

各ドメインが `Dependencies()` を宣言していれば、実行順はコードに書かずに計算できる。有向グラフの
トポロジカルソート（Kahn のアルゴリズム）で、入次数 0 のものから取り出していく。

```go
func topoSort(targets []domain.Migrator) ([]domain.Migrator, error) {
	indegree := map[domain.Name]int{}        // そのドメインが待っている依存先の数
	graph := map[domain.Name][]domain.Name{} // 依存先 → それを待っているドメイン

	for _, m := range targets {
		if _, ok := indegree[m.Name()]; !ok {
			indegree[m.Name()] = 0
		}
		for _, dep := range m.Dependencies() {
			graph[dep] = append(graph[dep], m.Name())
			indegree[m.Name()]++
		}
	}

	ready := readyNames(indegree) // 入次数 0 を名前の辞書順で並べる
	var out []domain.Migrator
	for len(ready) > 0 {
		n := ready[0]
		ready = ready[1:]
		out = append(out, byName[n])
		for _, next := range graph[n] {
			indegree[next]--
			if indegree[next] == 0 {
				ready = insertSorted(ready, next) // 辞書順を保って挿入
			}
		}
	}
	if len(out) != len(targets) {
		return nil, errors.New("cyclic dependency") // 取り切れずに残った = 循環
	}
	return out, nil
}
```

ポイントは 2 つある。

- **同じ階層は名前の辞書順でタイブレークする**。Go の map の反復順はランダムなので、何もしないと
  実行のたびに順序が変わる。本番で 1 度しか流さないツールほど、**毎回同じ順**であることが
  再現性の前提になる
- **循環はエラーにする**。取り出せた数が入力数に満たなければ、残りが互いに待ち合っている

> ⚠️ `--domain order` のように 1 つだけ流すとき、**依存先を自動で巻き込んで実行しない**設計にした。
> 「`order` を流したつもりが `user` まで作り直されていた」が一番こわい事故なので、入力に無い依存は
> 順序計算から無視し、足りなければ実行時に落とす方を選ぶ。

## トランザクション境界は呼び出し側が持つ

`Run` の中で `Begin` / `Commit` しない。トランザクションは**オーケストレーター側で張って、
`Inputs.TargetTx` として貸す**。

```go
func runDomain(ctx context.Context, m domain.Migrator, pool *pgxpool.Pool, ...) domain.Result {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return failed(m, started, err)
	}
	defer func() { _ = tx.Rollback(ctx) }() // Commit 済みなら no-op

	result, runErr := m.Run(ctx, domain.Inputs{TargetTx: tx, ...})
	if runErr != nil {
		return failed(m, started, runErr) // defer の Rollback が効く
	}
	if err := tx.Commit(ctx); err != nil {
		return failed(m, started, err)
	}
	return result
}
```

この形にすると、境界の粒度が「**1 ドメイン = 1 トランザクション**」に固定される。全ドメインを 1 本の
トランザクションにするより巻き戻し範囲が狭く、テーブルごとに commit するより中途半端な状態が
残りにくい、という間を取った位置だ。

> 💡 `defer tx.Rollback(ctx)` は「成功しても書いておく」のが定石。commit 済みのトランザクションへの
> Rollback は no-op なので、エラー経路ごとに書き分ける必要がない。

> 🧭 C# の `TransactionScope` / `DbContext` と役割分担は同じ。借りる側（ドメイン）が commit しない、を
> 徹底するほど、呼ぶ側が失敗の扱いを 1 箇所で決められる。

## 冪等にする — TRUNCATE してから COPY する

移行ツールは必ず何度も流す。リハーサル、やり直し、本番。**同じコマンドを 2 回流したら 2 倍入る**
ツールは、途中で落ちた後に誰も再実行できない。

いちばん単純な冪等化は、各ドメインが自分の担当テーブルを空にしてから入れ直すことだ。`UPSERT` で
差分を当てるより速く、状態も読みやすい。

```go
func (m *migrator) Run(ctx context.Context, in domain.Inputs) (domain.Result, error) {
	// 同じトランザクション内で TRUNCATE → COPY。失敗すれば両方巻き戻る。
	if err := pgio.TruncateCascade(ctx, in.TargetTx, "orders", "order_items"); err != nil {
		return domain.Result{}, err
	}
	...
}
```

投入は 1 行ずつの `INSERT` ではなく `COPY FROM STDIN` を使う。dry-run は、ここを呼ばずに
**変換だけ最後まで走らせて件数を返す**と、投入せずに変換の失敗を洗い出せる。

```go
func CopyRows(ctx context.Context, tx pgx.Tx, table string, columns []string,
	src pgx.CopyFromSource, dryRun bool) (int64, error) {
	if dryRun {
		return drainCopySource(src) // 読み切って件数だけ数える
	}
	return tx.CopyFrom(ctx, pgx.Identifier{table}, columns, src)
}
```

> ⚠️ 一括ロード中は **DB の制約を当てにできない**ことがある。PostgreSQL で監査トリガを止めるために
> `SET session_replication_role = replica` を使うと、同時に外部キーの検査トリガも止まる。
> 「DB が拒否するから不正な行は入らない」を前提にできなくなるので、**整合性の確認は移行後の
> 検証フェーズへ回す**（[preflight / migrate / validate](/posts/preflight-migrate-validate/)）。

## まとめ

- 移行ツールは「テーブルごとのスクリプト」ではなく、**ドメインを実装単位にした interface の集まり**に
  すると、部分実行・テスト・順序保証がまとめて手に入る
- **実行順はコードの並びではなく `Dependencies()` の宣言から計算する**。同階層は辞書順で固定して
  再現性を出し、循環はエラーにする
- **トランザクションは呼び出し側が張って貸す**。1 ドメイン = 1 トランザクションが、巻き戻し範囲と
  中途半端な状態のバランスとして扱いやすい
- **TRUNCATE → COPY で冪等**にする。何度流しても同じ結果になって初めて、本番で「止めて直して
  再実行」が選べる
- 一括ロードは制約検査を無効化することがある。**入ったことと正しいことは別の門で確かめる**

## 次にやること

旧 ID を新 ID へどう対応づけるか——値をそのまま使うか、対応表を持つか——は
[移行の ID マッピング](/posts/id-mapping-in-migration/)へ。
