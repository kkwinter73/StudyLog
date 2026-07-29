---
title: "ログ設計入門 — log/slog で「後から読めるログ」を吐く"
date: 2026-07-29T10:00:00
summary: "ログは障害の後で読む一次資料。だから読む側の都合で書く必要がある。構造化ログとレベルの使い分け、Go の log/slog の書き方、そして書いてはいけないものを整理する。"
tags: ["監視", "運用", "Go"]
level: beginner
---

ログは書いた瞬間ではなく、**障害が起きた後に読まれる**。しかも読むのは数千行の中から
1リクエストの足跡を探している自分だ。だから「動作確認のための出力」ではなく
「**後から検索・集計できる記録**」として設計する。この記事では構造化ログとレベルの使い分け、
Go の `log/slog` での書き方、そしてログに入れてはいけないものを押さえる。

[三本柱](/posts/observability-basics/)のうち、集める側（[CloudWatch Logs](/posts/cloudwatch-logs/)）は
別記事に譲り、ここは**アプリが吐く側**に絞る。

## なぜ fmt.Println では困るのか

素朴に書くとこうなる。

```go
fmt.Println("order created:", orderID, "amount:", amount)
```

出力は `order created: 1042 amount: 1200`。手元で目で見る分には十分だが、本番では詰む。

| 困ること | 理由 |
| --- | --- |
| 絞り込めない | 「amount が 10000 超のものだけ」を機械的に取り出せない |
| いつ・誰のか分からない | 時刻もリクエストIDもない。並行処理だと行が混ざる |
| 出し分けできない | 詳細ログを本番だけ黙らせる、ができない |
| 集約基盤が読めない | 収集側は「1行=1イベント」の構造を期待している |

ログは**書き手ではなく読み手の都合**で形を決める。読み手は人間の目とクエリの両方だ。

> 🧭 C# の `Console.WriteLine` デバッグから `ILogger` + Serilog に移るのと同じ話。Go 1.21 で標準に入った `log/slog` が Go 版の答え。

## 構造化ログ — 1行を JSON にする

**構造化ログ**とは、ログ1行を「文章」ではなく**キーと値の集まり**として吐くこと。

```go
slog.Info("order created", "order_id", 1042, "amount", 1200)
```

JSON ハンドラを使うとこう出る。

```json
{"time":"2026-07-29T10:12:03.412Z","level":"INFO","msg":"order created","order_id":1042,"amount":1200}
```

こうしておくと収集基盤側でフィールド単位に扱える。`amount > 10000` で絞る、`order_id` で
1件の流れを追う、`level=ERROR` を数えてグラフにする —— どれもテキストの正規表現ではなく
クエリで済む。

> ⭐ 一番効くコツは **メッセージを固定文にして、変わる値は属性に出す**こと。
> `"order created"` は常に同じ文字列なので「このイベントが何件」を数えられる。
> `fmt.Sprintf("order %d created", id)` にすると ID ごとに別メッセージになり、集計できない。

## ログレベル — 4つで足りる

レベルは「**誰が・いつ見るか**」で決める。多くの現場はこの4つで回る。

| レベル | 意味 | 見る人 |
| --- | --- | --- |
| `DEBUG` | 開発時に流れを追うための詳細 | 書いた本人（本番では基本オフ） |
| `INFO` | 正常系の節目（受注した、ジョブが終わった） | 後から追跡する人 |
| `WARN` | 異常だが処理は続いた（リトライした、値が欠けたので既定値を使った） | 定期的に眺める人 |
| `ERROR` | 処理が失敗した。誰かが対応する必要がある | アラートを受ける人 |

境界で迷ったら **「これで人を起こすか？」** で判断する。起こすなら `ERROR`、
朝見れば十分なら `WARN`。この判断がそのまま[アラート設計](/posts/cloudwatch-alarms-and-alerting/)に繋がる。

> ⚠️ `ERROR` を乱発すると誰も見なくなる（アラート疲れ）。「リトライして成功した」は `WARN`、
> 「入力が不正で 400 を返した」はユーザー起因なので `INFO` か `WARN` で十分なことが多い。

## log/slog の実践

Go 標準の `log/slog` は、ハンドラ（出力形式）とロガー（呼び出し口）に分かれている。
起動時に既定ロガーを差し替えておけば、あとはどこからでも `slog.Info` が使える。

```go
package main

import (
	"log/slog"
	"os"
)

func main() {
	h := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level:     slog.LevelInfo, // これ未満（DEBUG）は捨てられる
		AddSource: true,           // 出力元の file:line を付ける
	})
	slog.SetDefault(slog.New(h))

	slog.Info("server started", "port", 8080)
}
```

開発中は `slog.NewTextHandler` にすると `level=INFO msg="server started" port=8080` と
人が読みやすい形になる。**形式だけ環境で切り替え、呼び出し側のコードは変えない**のが要点。

### 共通の属性は With で持たせる

リクエストIDのように「その処理の間ずっと付けたい値」は、毎回書かず子ロガーに埋める。

```go
func handleOrder(ctx context.Context, reqID string, orderID int) error {
	log := slog.With("request_id", reqID) // 以降の全ログに request_id が付く

	log.InfoContext(ctx, "order processing started", "order_id", orderID)

	if err := charge(ctx, orderID); err != nil {
		log.ErrorContext(ctx, "charge failed", "order_id", orderID, "error", err)
		return fmt.Errorf("handleOrder: %w", err)
	}

	log.InfoContext(ctx, "order processing done", "order_id", orderID)
	return nil
}
```

これで `request_id` を1つ指定すれば1リクエストの足跡が時系列で並ぶ。
サービスを跨いで追いたくなったら[分散トレーシング](/posts/distributed-tracing-otel/)の
trace ID を同じやり方で載せる。

> 🧭 C# の `ILogger.BeginScope` や Serilog の `LogContext.PushProperty` と同じ役割。
> ただし slog の `With` は**明示的に子ロガーを持ち回す**ので、どこまで効くかがコードで見える。

> 💡 エラーは `"error", err` として属性で渡す。文章に埋め込まず、
> [ラップして文脈を足した](/posts/error-handling-wrapping/) err をそのまま渡すのが一番情報が残る。

## 何を書かないか — 機密・重複・量

ログは**外に出る**。集約基盤に送られ、権限を持つ人が検索できる状態になる。

- **機密は出さない**: パスワード、トークン、カード番号、[シークレット](/posts/secrets-management/)。
  「一時的にデバッグで」も残るので出さない
- **個人情報は絞る**: メールアドレスや氏名は必要性を吟味し、ユーザーIDで代替できるならそうする
- **リクエストボディ丸ごとは避ける**: 何が入るか制御できない。必要なフィールドだけ選ぶ
- **ループの中で吐かない**: 1000件処理で1000行出ると、量もコストも検索性も壊れる。件数を集計して1行に

構造体をうっかり丸ごと出さないためには、`LogValue()` を実装して**出す姿を型側で決めておく**のが確実。

```go
type User struct {
	ID    int
	Email string
}

// slog はこの戻り値を出力する（Email は落ちる）
func (u User) LogValue() slog.Value {
	return slog.GroupValue(slog.Int("id", u.ID))
}
```

> ⚠️ ログの保管はストレージも転送も課金される。「全部出して後で考える」は費用と検索性を同時に悪化させる。
> 詳細が欲しいのは障害時だけなので、**通常は INFO、必要なときだけ DEBUG に上げる**運用にする。

## 出力先は標準出力に固定する

アプリはファイル名やローテーションを気にせず、**標準出力に1行ずつ吐くだけ**にする。
集めて回すのは実行環境の仕事だ。

```text
アプリ ──stdout──▶ コンテナランタイム ──▶ 収集エージェント ──▶ ログ基盤（検索・保管）
```

こうするとローカルでは端末に流れ、コンテナでは `docker logs` で見え、本番では
そのまま CloudWatch Logs に入る。**アプリのコードを一切変えずに**出力先だけが変わる。

> 💡 `stdout` と `stderr` の使い分けは[標準入出力の記事](/posts/stdin-stdout-stderr/)の通り。
> 構造化ログを1本のストリームで扱うなら、全レベルまとめて stdout に出すのが今の主流。

## まとめ

- ログは障害後に読まれる一次資料。**読み手（人とクエリ）の都合**で形を決める
- **構造化ログ**にする。メッセージは固定文、変わる値は属性へ
- レベルは「**これで人を起こすか**」で決める。`ERROR` を乱発するとアラートが死ぬ
- `log/slog` は起動時にハンドラを差し替え、共通属性は `With` で子ロガーに持たせる
- 機密・PII・ループ内の大量出力は書かない。出す姿は `LogValue()` で型側に固定できる
- 出力先は**標準出力**に固定し、集約は実行環境に任せる

## 次にやること

- 手元のアプリを `slog` の JSON ハンドラに差し替え、`request_id` を全ログに載せてみる
- 出したログを[Logs Insights で検索](/posts/cloudwatch-logs/)し、1リクエストを時系列で追えるか確かめる
- ログから拾ったエラー率を[メトリクス化](/posts/what-to-measure-metrics/)してアラートに繋げる
