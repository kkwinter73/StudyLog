---
title: "Goアプリのインフラ入門 — 単一バイナリからコンテナ・デプロイまで"
date: 2026-06-19T21:00:00
summary: "Go はランタイム不要の単一バイナリになるのが最大の強み。ビルド成果物の特徴から、マルチステージ Docker、設定の渡し方、デプロイ先、最低限の運用までを俯瞰する。"
tags: ["インフラ", "デプロイ", "Go"]
level: intermediate
---

「書いたあと、どう動かして・どう配るか」がインフラの話。Go はこの領域でとても扱いやすい。
理由は一つ ——**ランタイム不要の単一バイナリになる** から。そこを軸に全体像を押さえる。

## なぜ Go はインフラと相性がいいのか

Go はビルドすると、依存をすべて含んだ **1つの実行ファイル** になる。サーバーに Go を
インストールする必要も、ランタイムを揃える必要もない。バイナリを置いて実行するだけ。

- 配布が `scp` 1回で済む
- バージョン違いの「動かない」が起きにくい
- コンテナイメージを極端に小さくできる

> 🧭 .NET だとランタイム同梱の self-contained publish か、サーバーへのランタイム導入が要る。
> Go はそれが既定の挙動になっている、というのが感覚的な違い。

## ビルド成果物：静的バイナリとクロスコンパイル

`go build` で実行ファイルができる。さらに **環境変数だけで他OS/CPU向けにビルド** できる
（クロスコンパイル）。これが地味に強力。

```bash
# 手元のOS向け
go build -o app .

# Linux/amd64 向けに、別OSから作る（CGOを切ると完全に静的）
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o app .
```

- `GOOS` / `GOARCH` で対象を指定（`linux`/`darwin`/`windows`、`amd64`/`arm64` など）
- `CGO_ENABLED=0` で C 依存を切ると、libc にも依存しない**完全な静的バイナリ**になる

> 💡 静的バイナリは「OSのライブラリが無くても動く」。後述の `scratch` イメージで効いてくる。

## コンテナ化：マルチステージで小さく

Go の強みを活かすなら **マルチステージビルド**。ビルド用の重いイメージで作り、
成果物だけを空っぽのイメージへコピーする。

```dockerfile
# --- build stage ---
FROM golang:1.26 AS build
WORKDIR /src
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app .

# --- run stage（成果物だけ） ---
FROM gcr.io/distroless/static-debian12
COPY --from=build /app /app
ENTRYPOINT ["/app"]
```

- 最終イメージにコンパイラもソースも入らない → **数 MB〜十数 MB** に収まる
- 実行専用イメージは `scratch`（完全に空）か `distroless/static`（証明書やtzが入る）が定番
- 小さい = pull が速い・攻撃面が小さい

## 設定は環境変数で渡す

イメージは1つに保ち、**環境ごとの違い（DB接続先・ポート・APIキー）は環境変数で外から注入**する。
いわゆる 12-factor の考え方。

```go
port := os.Getenv("PORT")
if port == "" {
	port = "8080" // 既定値を用意しておく
}
http.ListenAndServe(":"+port, mux)
```

> ⚠️ 秘密情報（APIキー等）はイメージにも Git にも焼き込まない。環境変数か、
> クラウドのシークレット機構（Secrets Manager 等）から渡す。

## どこで動かすか（ざっくり比較）

| 選択肢 | 例 | 向き |
| --- | --- | --- |
| PaaS / サーバーレスコンテナ | Cloud Run, Render, Fly.io | 小〜中規模・運用を任せたい |
| コンテナオーケストレーション | Kubernetes (GKE/EKS) | 大規模・細かい制御が要る |
| VM / ベアメタル | EC2 + systemd | 単純構成・コスト重視 |

> 💡 単一バイナリなので「VM に置いて `systemd` で常駐」も十分現実的。
> 規模が小さいうちは凝った基盤を入れず、コンテナ + マネージドサービスで足りることが多い。

## 最低限の運用：ヘルスチェックとグレースフルシャットダウン

本番に置くなら、この2つは入れておきたい。

- **ヘルスチェック**: `/healthz` のような生存確認エンドポイント（基盤が監視・再起動に使う）
- **グレースフルシャットダウン**: 停止シグナルを受けたら、処理中のリクエストを捌いてから終了する

```go
func main() {
	// SIGINT/SIGTERM を受けると ctx がキャンセルされる
	ctx, stop := signal.NotifyContext(context.Background(),
		syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	srv := &http.Server{Addr: ":8080", Handler: mux}
	go srv.ListenAndServe()

	<-ctx.Done() // シグナルを待つ

	// 猶予時間内に処理中リクエストを捌いて終了
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(shutdownCtx)
}
```

ログは標準出力に出す（`log` / `log/slog`）。基盤側が拾って集約するので、ファイルに自前で
書かないのがコンテナの作法。

## まとめ

- Go の強みは「ランタイム不要の単一バイナリ」。配布・運用が軽い
- `CGO_ENABLED=0` + `GOOS/GOARCH` で静的バイナリをクロスコンパイルできる
- マルチステージ Docker + `distroless`/`scratch` で数 MB のイメージに
- 設定は環境変数で外から注入。秘密情報は焼き込まない
- 規模に応じて PaaS / k8s / VM を選ぶ。小さいうちはマネージドで十分
- 本番にはヘルスチェックとグレースフルシャットダウンを入れる
