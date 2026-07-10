---
title: "push通知の仕組み — なぜ閉じたアプリに届くのか"
date: 2026-07-10T10:00:00
summary: "アプリを閉じていても届くpush通知は、OSが1本だけ張る常時接続とpush service（APNs/FCM/Web Push）が支える四者モデルで動く。仕組み・トークン・送る側の実装・そして『配信は保証されない』という設計上の勘所までまとめる。"
tags: ["ネットワーク", "アーキテクチャ"]
level: intermediate
---

[WebSocket / SSE](/posts/websocket-and-sse/) は「接続を張っている間」サーバから push する話だった。
push通知はその先 —— **アプリを閉じていても、端末がスリープでも届く**。なぜそんなことが可能なのか。
鍵は「アプリごとではなく **OS が1本だけ**張る常時接続」と、その相手の **push service** にある。
仕組み・登録トークン・送る側の実装・設計上の注意までを一気に押さえる。

## 四者モデル — 誰が誰に渡すのか

push通知は自分のサーバから端末へ**直接**送るのではない。間に **push service** が挟まる4者の伝言リレー。

```text
①アプリサーバ ─送信要求─▶ ②push service ─常時接続─▶ ③OS/ブラウザ ─▶ ④アプリ
 (自分の backend)         (APNs/FCM/…)      (1本だけ保持)      (通知表示 or 起動)
```

- **③ OS が push service へ常時接続を1本だけ**張り続ける。アプリが各自 TCP を張るのではない
- だからアプリが**終了していても** OS 側が受け取り、通知を出す／アプリを起こせる
- 個々のアプリの接続を OS が1本に**多重化**するので、電池も接続数も節約できる

> 💡 「なぜ閉じたアプリに届くのか」の答えはこれ。アプリではなく **OS が起きて待っている**。
> 自前で常時接続を張る WebSocket とは、接続の持ち主が根本的に違う。

## 主要チャネル — APNs / FCM / Web Push

相手の push service はプラットフォームごとに決まっている。送る側はそれぞれの API を叩く。

| チャネル | 対象 | 認証 | 送信先の識別子 |
| --- | --- | --- | --- |
| **APNs** | iOS / macOS | JWT（.p8 鍵）or 証明書 | device token |
| **FCM** | Android / iOS / Web | OAuth2（サービスアカウント） | registration token |
| **Web Push** | ブラウザ | VAPID 鍵 | subscription（endpoint URL＋鍵） |

- **FCM** は自身が窓口になり、iOS 宛は内部で APNs、ブラウザ宛は Web Push へ**中継**する。まず FCM 一本化が楽
- **Web Push** は W3C 標準。ブラウザの **Service Worker** がページを閉じていても push を受ける
- APNs/FCM はいずれも **HTTP/2** ベースの送信 API

> 🧭 .NET なら Azure **Notification Hubs** が APNs/FCM/Web Push の差を吸収してくれる（SignalR とは別物で、
> こちらは「閉じたアプリ向け」の抽象化）。Go では各社 SDK か HTTP を直接叩くのが定番。

## 登録とトークン — 宛先はどう決まるか

送る前に、**端末が自分を名乗る**必要がある。この住所書きが token / subscription。

```text
1. アプリ起動時に OS/ブラウザへ「push 受けたい」と登録
2. push service が一意の token（住所）を発行
3. アプリはその token を自分のアプリサーバへ送って保存
4. サーバは以後、その token 宛てに送信要求を出す
```

- token は**ユーザーではなく端末・アプリ単位**。1ユーザーが複数端末なら token も複数持つ
- Web Push の subscription には endpoint に加え**暗号鍵**(`p256dh`/`auth`)が含まれ、本文はこの鍵で暗号化する
- 送信には必ず**ユーザーの許可**が要る（ブラウザ/OS の許諾ダイアログ）。拒否されたら送れない

## 送る側の実装 — payload は「合図」に留める

送信自体は「token＋payload を push service に POST」するだけ。Go で FCM の例:

```go
// firebase.google.com/go/v4/messaging
msg := &messaging.Message{
    Token: deviceToken,
    Notification: &messaging.Notification{
        Title: "新着メッセージ",
        Body:  "田中さんからの返信があります",
    },
    Data: map[string]string{"threadId": "42"}, // アプリが使う付随データ
}
_, err := client.Send(ctx, msg) // 中で HTTP/2 + OAuth2 を処理
```

- **payload は小さい**（APNs/FCM/Web Push とも上限おおむね 4KB）。本文を詰め込まない
- 通知は**「新着があった」という合図**と割り切り、中身はアプリが起動後にサーバから取りに行く設計が堅い
- `Notification`（OS が自動表示）と `Data`（アプリが自分で処理）の使い分けを意識する

> ⚠️ payload は push service（第三者）を**素通り**する。APNs/FCM は本文を見られる前提で、
> パスワードや個人情報を載せない。Web Push はエンドツーエンド暗号化されるが、それでも最小限に。

## 設計上の注意 — 「届いて当然」で組まない

push通知の最大の落とし穴は、**配信が保証されない**こと。ここを理解して初めて堅い設計になる。

- **ベストエフォート**: push service はスリープ中の端末で遅延・間引き・集約をする。**即時も到達も保証されない**
- **トークン失効**: 再インストールや期限で token は変わる。送信レスポンスの `unregistered` 等を見て**死んだ token を掃除**する
- **集約（collapse）**: 同種の通知は collapse key で**最新1件に畳む**。連投で埋もれさせない
- **優先度と電池**: high 優先度は端末を起こせるが乱用は throttle される。通常優先度と使い分ける
- **サイレント push**: UI を出さずバックグラウンド同期する data-only 通知もあるが、OS に**強くレート制限**される
- **真実源は自分の DB**: 通知は補助的な合図。取りこぼしても、アプリ起動時のサーバ同期で必ず追いつける設計にする

> 💡 「push が来たら処理する」ではなく「**push は気づきを早めるだけ**、正はサーバ同期」。
> [Webhook の受け口](/posts/webhook-implementation/)で「真実源で突合する」としたのと同じ発想。

## まとめ

- push通知は**アプリサーバ→push service→OS→アプリ**の四者リレー。**OS が張る1本の常時接続**が閉じたアプリにも届ける
- チャネルは **APNs / FCM / Web Push**。まず **FCM 一本化**が iOS/Android/Web を跨げて楽
- 宛先は端末単位の **token / subscription**。ユーザーの**許可**が前提で、失効するもの
- payload は 4KB 前後の**合図**。機密を載せず、中身は起動後にサーバから取りに行く
- **配信は保証されない**。死んだ token を掃除し、集約・優先度を使い、**真実源は自分の DB** に置く

**関連:** [WebSocket / SSE](/posts/websocket-and-sse/) / [Webhook の実装](/posts/webhook-implementation/) / [HTTP のバージョン進化](/posts/http-versions-evolution/)
