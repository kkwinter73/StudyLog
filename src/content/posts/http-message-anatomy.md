---
title: "Webを支える通信④ HTTPメッセージの構造"
date: 2026-07-09T19:30:00
summary: "HTTPは結局ただのテキストのやり取り。リクエストとレスポンスの中身を「開始行・ヘッダ・ボディ」に分解し、メソッドと主要ヘッダの役割を押さえる。"
tags: ["ネットワーク", "基礎"]
level: beginner
---

> 📚 シリーズ「Webを支える通信」(4 / 10)

前回の[リクエストの旅](/posts/how-a-web-request-travels/)の最後、通り道が開通してから流れる **HTTPメッセージ**そのものを開けてみる。
HTTPは特別な魔法ではなく、**開始行・ヘッダ・空行・ボディ**という決まった形のテキスト。ここが読めると、
APIのデバッグもブラウザの開発者ツールも一気に読み解ける。ステータスコードの意味は[HTTPステータス回](/posts/http-status-codes/)を参照。

## メッセージの基本形

リクエストもレスポンスも同じ構造。1行目（開始行）だけが役割違いで、あとは共通。

```http
<開始行>
<ヘッダ名>: <値>
<ヘッダ名>: <値>
            ← 空行（ヘッダとボディの境目）
<ボディ>
```

- **開始行**: リクエストは「メソッド パス バージョン」、レスポンスは「バージョン ステータス」
- **ヘッダ**: メタ情報を `名前: 値` で任意個
- **空行**: ここで「ヘッダ終わり」を示す（必須）
- **ボディ**: 実データ（JSON・HTML・画像など）。無いこともある

## リクエストの例

```http
POST /api/users HTTP/1.1
Host: example.com
Content-Type: application/json
Authorization: Bearer eyJhbGc...
Content-Length: 27

{"name":"kkwinter","age":30}
```

- 1行目 = **メソッド `POST`** ＋ **パス `/api/users`** ＋ バージョン
- `Host` は必須（1つのIPで複数サイトを相乗りさせるため、どのサイト宛かを示す）
- `Content-Type` はボディの形式、`Content-Length` はバイト数

## レスポンスの例

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/users/42
Cache-Control: no-store

{"id":42,"name":"kkwinter"}
```

- 1行目 = バージョン ＋ **ステータス `201 Created`**（意味は[ステータス回](/posts/http-status-codes/)）
- `Location` は新規作成したリソースの場所、`Cache-Control` はキャッシュの可否

## メソッド — 「何をしたいか」

パスが「どのリソースか」なら、メソッドは「それをどうしたいか」。代表的なものと性質:

| メソッド | 意味 | 安全※1 | 冪等※2 |
| --- | --- | --- | --- |
| GET | 取得 | ○ | ○ |
| POST | 作成・送信 | × | × |
| PUT | 置換（丸ごと更新） | × | ○ |
| PATCH | 部分更新 | × | × |
| DELETE | 削除 | × | ○ |

※1 安全＝サーバの状態を変えない　※2 冪等＝何回送っても結果が同じ

> 💡 冪等性は再送・リトライ設計の要。ネットワークが不安定でも、GET/PUT/DELETEは安心して再送できる。
> POSTを安全に再送する話は[冪等キー実装](/posts/idempotency-key-implementation/)で扱っている。

> 🧭 ASP.NETの `[HttpGet]`/`[HttpPost]` 属性や、Goの `r.Method == http.MethodPost` 分岐は、この開始行のメソッドを見ているだけ。
> フレームワークが違ってもワイヤ上のメッセージは同一。

## 主要ヘッダの地図

ヘッダは種類が多いが、役割で束ねると覚えやすい。

| 分類 | 例 | 役割 |
| --- | --- | --- |
| 内容 | `Content-Type`, `Content-Length` | ボディの形式・サイズ |
| 認証 | `Authorization`, `Cookie` | 誰か・状態（[⑦](/posts/cookie-session-token/)で詳説） |
| キャッシュ | `Cache-Control`, `ETag` | 再利用の可否 |
| 交渉 | `Accept`, `Accept-Language` | 欲しい形式・言語 |
| CORS | `Origin`, `Access-Control-*` | オリジン間許可（[⑧](/posts/cors-explained/)で詳説） |

## まとめ

- HTTPメッセージは **開始行・ヘッダ・空行・ボディ** の決まった形のテキスト
- 開始行はリクエスト＝「メソッド パス バージョン」、レスポンス＝「バージョン ステータス」
- **メソッド**は操作の意図。GET/PUT/DELETEは冪等、POST/PATCHは非冪等 → リトライ設計に効く
- ヘッダは内容・認証・キャッシュ・交渉・CORSなど**役割で束ねる**と読める
- `Host` は必須（1IPで複数サイトを相乗りさせるための宛先指定）

**← 前:** [③ リクエストが届くまで](/posts/how-a-web-request-travels/)
**→ 次:** [⑤ HTTP/1.1→2→3 の進化](/posts/http-versions-evolution/)
