---
title: "Webを支える通信③ リクエストが届くまで"
date: 2026-07-09T20:00:00
summary: "アドレスバーにURLを打ってからページが出るまで、裏では DNS→TCP→TLS→HTTP が一直線に走る。この一連の流れを1本で通し、これまでの記事を1枚の地図に束ねる。"
tags: ["ネットワーク", "基礎"]
level: beginner
---

> 📚 シリーズ「Webを支える通信」(3 / 10)

ブラウザのアドレスバーに `https://example.com` と打ってページが表示されるまで、
裏では **URL解釈 → DNS → TCP → TLS → HTTP** が一直線に走る。
この回は各ステップを1本で通し、シリーズ全体を1枚の地図に束ねる**ハブ記事**にする。

## 全体像 — 5つのステップ

```text
① URLを分解        https://example.com:443/path?q=1
② DNSで名前解決    example.com → 93.184.216.34
③ TCP接続を確立    3ウェイハンドシェイク（:443へ）
④ TLSで暗号化      証明書の検証・鍵の合意
⑤ HTTPで会話       GET /path → 200 OK + HTML
```

上ほどアプリ寄り、下ほど土台。前回までの[階層モデル](/posts/network-layers-tcpip-osi/)がそのまま順番に効いてくる。

## ① URLを分解する

URLは「どのプロトコルで・どのホストの・どこに」を1行に畳んだもの。ブラウザはまずこれを部品に分ける。

```text
https :// example.com : 443 / path ? q=1 # top
scheme     host         port  path  query fragment
```

- **scheme** が `https` なら後で④のTLSが入り、既定ポートは443（`http` なら80）
- `port` 省略時は scheme の既定値が使われる
- `query` はサーバへ渡すパラメータ、`fragment`（`#`以降）は**ブラウザ内**だけで使われサーバには送られない

## ② DNSで名前を引く

`example.com` は人間用の名前。通信にはIPアドレスが要るので、[DNS](/posts/dns-basics-and-tools/) で
名前→IPを解決する。キャッシュに無ければ複数のDNSサーバへ問い合わせて答えを得る（多くはUDPで速く）。

> 💡 ここで失敗すると「名前解決できない（`Could not resolve host`）」。まだ相手サーバには一度も触れていない段階。

## ③〜④ TCPで繋ぎ、TLSで守る

IPが分かったら、そのIPの443番へ [TCPの3ウェイハンドシェイク](/posts/ports-and-tcp/) で接続する。
`https` なら続けて **TLSハンドシェイク**で相手の証明書を検証し、暗号鍵を合意する（詳細は[HTTPS/TLS回](/posts/https-tls-explained/)）。

```text
DNS完了 → [TCP] SYN/SYN+ACK/ACK → [TLS] 証明書検証・鍵合意 → 安全な通り道が開通
```

> ⚠️ 「DNSは通るのに繋がらない」なら③以降を疑う。`Connection refused`＝相手はいるがそのポートで待っていない、
> タイムアウト＝経路やファイアウォールで届いていない、証明書エラー＝④のTLSで弾かれている。

## ⑤ HTTPで会話する

通り道が開通したら、ようやく **HTTPリクエスト**を送る。サーバは**レスポンス**を返す。

```http
GET /path?q=1 HTTP/1.1
Host: example.com

HTTP/1.1 200 OK
Content-Type: text/html
...本文...
```

中身の構造（メソッド・ヘッダ・ボディ）は[次回](/posts/http-message-anatomy/)、`200`などの意味は
[HTTPステータス回](/posts/http-status-codes/)で扱う。HTMLを受け取ったブラウザは、その中のCSS/JS/画像について
**②〜⑤を必要なだけ繰り返す**。

> 🧭 C#で `HttpClient.GetAsync(url)` の1行が裏でやっているのが、まさにこの②〜⑤。Goの `http.Get(url)` も同じ。
> 普段は隠れているが、詰まった時はこの5段のどこで止まったかを見ると切り分けが速い。

## まとめ

- URL入力からページ表示までは **URL分解 → DNS → TCP → TLS → HTTP** の一直線
- `fragment`（`#`）はサーバに送られない、`https`の既定ポートは443 など、URL分解で決まることは多い
- 失敗した層で症状が変わる: 名前解決＝DNS、`refused`/タイムアウト＝TCP経路、証明書＝TLS、`4xx/5xx`＝HTTP
- これがシリーズの地図。以降の回は各ステップを深掘りする

**← 前:** [② TCPとUDPの違い](/posts/tcp-vs-udp/)
**→ 次:** [④ HTTPメッセージの構造](/posts/http-message-anatomy/)
