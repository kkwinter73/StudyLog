---
title: "Webを支える通信⑧ CORS（オリジン間リクエスト）"
date: 2026-07-09T17:30:00
summary: "『CORSでブロックされた』を正しく読む。同一オリジンポリシーという前提、なぜブラウザだけが止めるのか、プリフライトの意味、そしてサーバが返すべきヘッダを整理する。"
tags: ["ネットワーク", "基礎"]
level: intermediate
---

> 📚 シリーズ「Webを支える通信」(8 / 10)

フロントとAPIを別ドメインに置くと必ず出会う **CORSエラー**。これは「バグ」ではなく、
ブラウザの安全機構が**意図どおり働いた**サインだ。前提の**同一オリジンポリシー**から解きほぐし、
プリフライトの意味と、サーバが返すべきヘッダまでを整理する。[⑦](/posts/cookie-session-token/)の認証情報の扱いにも直結する。

## 前提 — 同一オリジンポリシー

**オリジン** = スキーム＋ホスト＋ポートの3点セット。1つでも違えば「別オリジン」。

```text
https://app.example.com:443
scheme   host              port   ← この3つが全部一致して初めて「同一オリジン」

https://api.example.com   ← ホストが違う → 別オリジン
http://app.example.com    ← スキームが違う → 別オリジン
```

ブラウザは既定で「**あるオリジンのページのJSは、別オリジンへのリクエスト結果を勝手に読めない**」という
同一オリジンポリシーを課す。悪意あるサイトが、あなたのログイン済みの銀行APIを裏で叩いて結果を盗む、を防ぐためだ。

> ⚠️ 止めるのは**ブラウザ**だけ。サーバ同士やcurl、モバイルアプリからのリクエストにCORSは関係ない。
> だからCORSは「サーバのセキュリティ」ではなく「**ブラウザ上の他サイトからの読み取り**」を制御する仕組み。

## CORS — 別オリジンを「許す」宣言

CORSは同一オリジンポリシーを**サーバの許可があれば緩める**仕組み。鍵は、許可を出すのは**リクエスト先のサーバ**だという点。

```http
# ブラウザが送る
Origin: https://app.example.com

# サーバが「そのオリジンは許可」と返す
Access-Control-Allow-Origin: https://app.example.com
```

- ブラウザは応答の `Access-Control-Allow-Origin` を見て、一致すればJSに結果を渡す。無ければブロック
- つまり**エラーが出る場所はブラウザ**だが、**直すのはサーバ**（許可ヘッダを返す）

## プリフライト — 本番前の問い合わせ

`GET`や単純なフォーム送信は昔から送れてしまうので「単純リクエスト」として即送る。だが
`PUT`/`DELETE`や`Content-Type: application/json`、独自ヘッダ付きなど**副作用が怖いもの**は、
本番の前に **OPTIONS で「送っていい？」と先に確認**する。これがプリフライト。

```http
# ① ブラウザ → サーバ（プリフライト）
OPTIONS /api/users
Origin: https://app.example.com
Access-Control-Request-Method: DELETE

# ② サーバ → ブラウザ（許可の返答）
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 600        # この許可を10分キャッシュ

# ③ OKなら本番のDELETEを送る
```

> 💡 開発者ツールのNetworkに、本番リクエストの直前に同じURLの`OPTIONS`が並んでいたらそれがプリフライト。
> `Access-Control-Max-Age`で結果をキャッシュでき、毎回2往復になるのを防げる。

## Cookieを跨いで送るとき

別オリジンへ[Cookie](/posts/cookie-session-token/)や`Authorization`を付ける場合は、両側で追加の同意が要る。

- ブラウザ側: `fetch(url, { credentials: "include" })`
- サーバ側: `Access-Control-Allow-Credentials: true` ＋ **`Allow-Origin` はワイルドカード`*`不可**（具体的なオリジン必須）

> 🧭 ASP.NETの`AddCors`/`UseCors`ポリシーも、Goの`rs/cors`やnet/httpで許可ヘッダを付けるのも、やっていることは同一。
> **「どのオリジンに・どのメソッド/ヘッダ/クレデンシャルを許すか」**をサーバが宣言しているだけ。

## まとめ

- **オリジン**＝スキーム＋ホスト＋ポート。1つ違えば別オリジン
- **同一オリジンポリシー**で、ブラウザは別オリジンへのリクエスト結果をJSに勝手に渡さない
- 止めるのは**ブラウザだけ**。サーバ間やcurlは無関係。だから**直すのはサーバ**（許可ヘッダ）
- 副作用のあるリクエストは**プリフライト(OPTIONS)**で事前に許可を確認する
- Cookie/認証を跨ぐには両側の同意が必要で、`Allow-Origin: *` は使えない

**← 前:** [⑦ Cookie / セッション / トークン](/posts/cookie-session-token/)
**→ 次:** [⑨ Webサーバ / リバースプロキシ / LB / CDN](/posts/web-server-proxy-lb-cdn/)
