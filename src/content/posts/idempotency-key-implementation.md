---
title: "冪等キーの実装 — 二重課金を防ぐサーバ側の作り方"
date: 2026-06-29T15:00:00
summary: "リトライや並行リクエストで決済が二重に走るのを防ぐのが冪等キー。キーの設計・DBでの一意制約・並行リクエストの競合・応答の保存と期限まで、サーバ側の実装を Go で押さえる。"
tags: ["アーキテクチャ", "設計"]
level: intermediate
---

[決済処理の流れ](/posts/payment-processing-flow/)で触れた**冪等キー(idempotency key)**を、
サーバ側でどう実装するかに踏み込む。狙いは「同じ操作が2回来ても、課金は1回・応答は同じ」。
キー設計・一意制約・並行競合・期限の4点が肝。

## 何が二重実行を生むか

二重課金は「クライアントが悪い」のではなく、**仕組み上避けられない**ものとして扱う。

- **リトライ**: タイムアウトや 5xx で再送。実は1回目が成功していることがある
- **並行**: ダブルクリックや複数タブで、ほぼ同時に同じ操作が飛ぶ

> ⚠️ ネットワークは「応答が返らない＝失敗」を保証しない。**成功したのに応答だけ落ちた**を常に疑う。

## キーの設計

クライアントが**一意キーを生成して送り、リトライでは同じキーを使い回す**のが前提。

- 粒度は「1つの意図」に1キー。例: 注文確定ボタン1回 = 1キー（注文IDなど安定値）
- **スコープを限定**する。キーは「このエンドポイント × このユーザー」内で一意に扱う
- キーが同じでも**本文(body)が違うなら拒否**する（使い回しの誤用を検知）

```go
type IdemRecord struct {
    Key       string
    ReqHash   string // リクエスト本文のハッシュ。不一致なら誤用
    Status    string // "in_progress" | "done"
    RespCode  int
    RespBody  []byte
}
```

## DB の一意制約で受ける

実装の中心は「**キーで行を1つだけ作れる**」こと。一意制約に任せるのが堅い。

```sql
CREATE TABLE idempotency_keys (
  key        text PRIMARY KEY,
  req_hash   text NOT NULL,
  status     text NOT NULL,
  resp_code  int,
  resp_body  bytea,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

```go
// INSERT が通れば自分が初回。重複なら誰かが先に処理中/処理済み
err := insertKey(ctx, key, reqHash) // status="in_progress"
if isUniqueViolation(err) {
    return loadAndReturnExisting(ctx, key, reqHash) // 既存応答を返す
}
res := charge(ctx, req)            // ここで初めて実際に課金
saveResult(ctx, key, res)          // status="done" に更新し応答を保存
return res
```

> 💡 「先に SELECT で存在確認 → 無ければ INSERT」は**並行で両方すり抜ける**。
> 確認ではなく**INSERT の一意制約違反で弾く**のが競合に強い。

## 並行リクエストの競合

ほぼ同時の2リクエストでは、片方が `in_progress` を作り、もう片方が一意制約で弾かれる。
弾かれた側の扱いを決めておく。

- **まだ `in_progress`**: 「処理中」を表す `409 Conflict` を返し、クライアントに再試行させる
- **`done`**: 保存済みの応答(コード＋本文)を**そのまま**返す

> 🧭 C# の `[Idempotent]` ミドルウェアや Stripe SDK の `IdempotencyKey` も内部は同じ発想。
> フレームワークが違っても「キーで1行・一意制約・応答キャッシュ」の骨格は共通。

## 応答の保存と期限

冪等性は「同じ応答を返す」ことまで含む。応答を保存し、保持期間を決める。

- 初回の**ステータスコードと本文を保存**し、再送には同じものを返す
- キーは永久に持たない。**TTL（例: 24h〜数日）**で消す。十分なリトライ猶予があればよい
- 期限切れ後に同じキーが来たら、別の新規操作として扱われる点は許容する

## まとめ

- 二重実行は**リトライと並行**で必然的に起きる前提で設計する
- クライアントは**一意キーを生成し、リトライで使い回す**。本文不一致は誤用として弾く
- サーバは **DB の一意制約**で初回を判定（SELECT 確認は競合ですり抜ける）
- 並行時は処理中なら `409`、完了済みなら**保存済み応答をそのまま返す**
- 応答(コード＋本文)を保存し、**TTL** で期限管理する

**関連:** [決済処理の流れ](/posts/payment-processing-flow/) / [Webhook の実装](/posts/webhook-implementation/) / [HTTPステータスコード](/posts/http-status-codes/)
