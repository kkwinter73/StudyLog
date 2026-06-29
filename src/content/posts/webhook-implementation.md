---
title: "Webhook の実装 — 署名検証・即200・冪等な受け口"
date: 2026-06-29T16:00:00
summary: "決済の確定は PSP からの Webhook で後追いに届く。受け口で必須なのは署名検証・まず200を返す・重複/順序に冪等であること・リトライ前提の設計。Go で実装の型を押さえる。"
tags: ["アーキテクチャ", "設計"]
level: intermediate
---

[決済処理の流れ](/posts/payment-processing-flow/)で「真実源は PSP の確定イベント」と書いた。
その受け口が **Webhook**（PSP→アプリへの HTTP push）。安全で取りこぼさない受け口にするための
4点 —— 署名検証・即200・冪等・リトライ —— を実装に落とす。

## Webhook とは

ポーリング（こちらから定期的に問い合わせる）の逆。**イベント発生時に PSP が叩いてくる**。

- 決済確定・失敗・返金・チャージバックなどが `payment_intent.succeeded` のような形で届く
- アプリは公開エンドポイント（例: `POST /webhooks/psp`）を1つ用意して受ける

## 署名検証 — 偽イベントを弾く

公開URLは誰でも叩ける。**本物の PSP からか**を、ヘッダの署名で必ず検証する。

```go
func verify(payload []byte, sigHeader, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload) // 生のボディ（パース前）で計算する
    expected := hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(expected), []byte(sigHeader))
}
```

> ⚠️ 署名は**生のリクエストボディ**で検証する。JSON にパース→再シリアライズしたバイト列では
> 一致しない。先に body を読んで検証し、その後パースする順序にする。

> 🧭 Stripe SDK の `ConstructEvent` / .NET の `EventUtility.ConstructEvent` が中でこれをやる。
> 自前実装でも `hmac.Equal` のような**定数時間比較**を使い、タイミング攻撃を避ける。

## まず 200 を返す

PSP は**応答が遅い/返らないと失敗とみなし再送**する。重い処理を同期でやると再送地獄になる。

```text
1. 署名検証
2. イベントを永続化（受信記録）
3. すぐ 200 を返す
4. 実処理（発送可能化・通知など）は非同期で行う
```

- ハンドラ内で重い処理を完結させない。**受理→200→後続はキュー/ワーカー**
- 検証失敗は `400`、自分が処理対象外のイベントでも基本 `200`（再送させない）

## 冪等・重複・順序

Webhook は**重複して届く**し、**順序も保証されない**前提で組む。

- **重複**: 同じイベントが複数回来る。**イベントIDで既処理を弾く**（[冪等キー](/posts/idempotency-key-implementation/)と同じ発想）
- **順序**: `created`→`succeeded`→`refunded` が前後しうる。受信時刻でなく**イベントの状態**で判断する
- 既に進んだ状態に**戻す遷移は無視**する（refunded の後に succeeded が来ても巻き戻さない）

```go
if seen(event.ID) { // 既に処理済みなら何もせず 200
    w.WriteHeader(200); return
}
markSeen(event.ID)
enqueue(event) // 後続処理へ
```

## リトライとタイムアウト

「いつか届く」前提で、取りこぼしの保険も用意する。

- PSP は失敗時に**指数バックオフで再送**する。こちらは冪等なので何度来ても安全
- 受け口が落ちていた間のイベントは、PSP の**ダッシュボード/API で再送・一覧取得**できる
- 保険として、確定が来ない注文を**定期的に PSP へ問い合わせて突合**(reconciliation)する

## まとめ

- Webhook は PSP→アプリの push。**真実源**として確定を受ける
- **署名検証は生ボディ＋定数時間比較**で。偽イベントを弾く
- **まず 200 を返し、重い処理は非同期**へ。遅延は再送を招く
- **イベントIDで冪等化**し、重複・順序逆転に耐える（戻す遷移は無視）
- リトライ前提＋**定期突合**で取りこぼしを救う

**関連:** [決済処理の流れ](/posts/payment-processing-flow/) / [冪等キーの実装](/posts/idempotency-key-implementation/) / [HTTPステータスコード](/posts/http-status-codes/)
