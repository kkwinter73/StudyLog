---
title: "DoSとDDoS — 枯渇攻撃をどう受け止めるか"
date: 2026-07-09T15:30:00
summary: "サービスを止める枯渇攻撃には、アプリのコードだけでは防ぎきれない層と、コードで受け止められる層がある。攻撃の種類を整理し、Goのhttp.Serverタイムアウト・ボディ上限・IPごとのレート制限でどこまで粘れるかを押さえる。"
tags: ["セキュリティ", "ネットワーク", "運用"]
level: intermediate
---

サービスを使えなくする「枯渇（DoS）攻撃」を、防御する側の視点で整理する。
結論を先に言うと、**帯域を埋める攻撃はコードでは防げない（上流に任せる）が、アプリ自体は
「資源を食い潰されない」ように作れる**——後半はGoでその作り方を見る。

## 攻撃の仕組み — DoS と DDoS

DoS（Denial of Service）は、資源を食い潰してサービスを応答不能にする攻撃。
これを**大量の端末（ボットネット）から分散して**行うのが DDoS（Distributed DoS）。
単一送信元なら遮断は簡単だが、分散されると「正規ユーザーと見分けがつかない」ため難しくなる。

攻撃はどの資源を枯渇させるかで大きく3層に分かれる。

| 層 | 例 | 枯渇する資源 |
| --- | --- | --- |
| **帯域（volumetric）** | UDPフラッド、DNS/NTP 増幅 | 回線の帯域幅 |
| **プロトコル** | SYN フラッド | 接続テーブル・ファイアウォールの状態 |
| **アプリ層** | slowloris、重いエンドポイント連打 | ワーカー・接続・CPU/メモリ |

- **増幅（amplification）**は、送信元を偽装（詐称）して小さな要求を投げ、
  応答サーバから被害者へ何十倍もの応答を返させる手口。少ない帯域で大きな攻撃を作れる
- **slowloris** は帯域を使わない。接続だけ大量に開き、リクエストを**わざとゆっくり**送り続けて
  サーバの接続枠を占有する。アプリ層攻撃はこの「安く効く」性質が厄介

> 💡 帯域攻撃は「太い水道で押し流す」、アプリ層攻撃は「安い一手でワーカーを塞ぐ」。
> 前者は上流で、後者はアプリの作り方で受け止める——受け持つ層が違う。

## 対策の原則 — 全部はコードで防げない

まず線引きが大事。**帯域を埋める攻撃は、あなたのサーバに届いた時点で手遅れ**。
自分のコードでは防げないので、上流で受け止める。

- **上流に任せる層**: CDN・DDoS スクラビング（洗浄）サービス・上流でのレート制限。
  トラフィックがアプリに届く前に吸収・遮断する
- **アプリが担う層**: 一撃で資源を食い潰されない「粘り強さ」。
  タイムアウト・ボディサイズ上限・接続数の上限・過負荷時の**優雅な劣化**（一部を捨てて生き残る）

> ⚠️ 「WAF/CDN を入れたから安心」ではない。上流をすり抜けたアプリ層攻撃や、
> 内部からのアクセスは結局アプリで受ける。**多層防御**——どの層も自分の役割だけは果たす。

## Goでの防御 — タイムアウトが最初の壁

Go の `http.Server` は**タイムアウト無指定だと無制限**。slowloris はまさにここを突く。
まず各タイムアウトを必ず設定する。

```go
srv := &http.Server{
	Addr:              ":8080",
	Handler:           mux,
	ReadHeaderTimeout: 5 * time.Second,  // ヘッダをだらだら送る攻撃を切る
	ReadTimeout:       10 * time.Second, // ボディ含む読み取り全体
	WriteTimeout:      10 * time.Second, // 応答書き込みの上限
	IdleTimeout:       60 * time.Second, // keep-alive 接続の遊休上限
}
log.Fatal(srv.ListenAndServe())
```

- `ReadHeaderTimeout` が slowloris の直接の対策。ヘッダを送り切らない接続を掴み続けない
- `IdleTimeout` は開きっぱなしの keep-alive 接続が接続枠を食うのを防ぐ

## Goでの防御 — ボディ上限とレート制限

巨大なリクエストボディでメモリを枯渇させる攻撃には `http.MaxBytesReader` で上限を掛ける。

```go
func handler(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1MiB で打ち切る
	var in Payload
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "payload too large or invalid", http.StatusRequestEntityTooLarge)
		return
	}
	// ...
}
```

同じ送信元からの連打には `golang.org/x/time/rate` のトークンバケットで、IP ごとにレート制限する。

```go
type ipLimiter struct {
	mu       sync.Mutex
	buckets  map[string]*rate.Limiter
}

func (l *ipLimiter) get(ip string) *rate.Limiter {
	l.mu.Lock()
	defer l.mu.Unlock()
	lim, ok := l.buckets[ip]
	if !ok {
		lim = rate.NewLimiter(10, 20) // 定常10req/s、バースト20
		l.buckets[ip] = lim
	}
	return lim
}

func (l *ipLimiter) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		if !l.get(ip).Allow() {
			http.Error(w, "rate limited", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}
```

> ⚠️ 上のマップは放置すると IP が溜まり続けメモリを食う（それ自体が枯渇攻撃の的）。
> 実運用では最終アクセス時刻を持って定期的に掃除するか、LRU を使う。
> また CDN 経由なら `r.RemoteAddr` はプロキシの IP になる——`X-Forwarded-For` を
> **信頼できる前段だけ**から取る設計にする。

> 🧭 C# / ASP.NET Core も対応は同じ。Kestrel のリクエストタイムアウトと
> `MaxRequestBodySize` でタイムアウト・ボディ上限を、レート制限は組み込みの
> Rate Limiting ミドルウェア（`AddRateLimiter`）で掛ける。層の考え方はそのまま移せる。

## まとめ

- DoS は資源の枯渇、DDoS はそれを**分散**して正規ユーザーと見分けにくくしたもの
- 攻撃は **帯域・プロトコル・アプリ層** の3層。増幅と slowloris は「安く効く」ので要注意
- **帯域攻撃はコードで防げない**。上流の CDN・スクラビング・レート制限に任せる
- アプリは **タイムアウト・ボディ上限・IPレート制限・優雅な劣化** で粘り強くする
- Go なら `http.Server` のタイムアウト4種＋`MaxBytesReader`＋`x/time/rate` が最初の一式

**関連:** [ブルートフォースとパスワードスプレー](/posts/brute-force-password-spray/) / [中間者攻撃（MITM）](/posts/mitm-attack/) / [デプロイのロールバック戦略](/posts/deploy-rollback-strategy/)
