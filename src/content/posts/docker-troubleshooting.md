---
title: "Docker を手で動かす③ 詰まった時のデバッグ"
date: 2026-07-09T22:00:00
summary: "コンテナがすぐ落ちる・つながらない・イメージが太る——Docker の三大詰まりを、状態の見方(ps -a/logs/inspect)から中に入る手順、症状別の早見表まで、切り分けの順番で押さえる。"
tags: ["コンテナ", "運用", "基礎"]
level: beginner
---

> 📚 シリーズ「Docker を手で動かす」(3 / 3)

[コマンド](/posts/docker-daily-commands/)を覚えても、詰まる時は詰まる。
大事なのは当てずっぽうで直さず、**「まず状態を見る → 中を調べる → 症状で切り分ける」**の順番。
Docker の三大詰まりを、この順番で潰していく。

## まず状態を見る — 落ちたのか、動いているのか

`docker ps` に出てこない＝もう止まっている。まず全部を見て、落ちた理由を拾う。

```bash
docker ps -a                 # 停止済みも表示。STATUS の Exited(コード) を見る
docker logs <name>           # 落ちる直前に何を吐いたか
docker inspect <name>        # 設定・終了コード・マウント等を全部見る
```

- `Exited (0)` … 正常終了。**そもそも常駐しないコマンド**だった（`CMD` の指定ミスが多い）
- `Exited (1)` や `(137)` … 異常終了。`137` は **SIGKILL＝メモリ超過([cgroup](/posts/container-namespace-cgroup/))**を疑う

> 💡 まず `logs` を読む。9割の原因はアプリ自身がエラーを吐いている。Docker のせいにする前にログ。

## 中に入って調べる — 入れる時と入れない時

動いているなら[`exec`](/posts/docker-daily-commands/)で入って中身を確認する。

```bash
docker exec -it <name> sh    # 中でファイル・環境変数・疎通を確認
docker exec <name> env       # 環境変数が渡っているか
```

問題は **落ちて入れない**時。`exec` は動いているコンテナにしか入れない。そのときは：

```bash
# 同じイメージを、コマンドを上書きして対話起動する
docker run -it --rm <image> sh
```

> ⚠️ 最小イメージ（alpine/distroless）は `bash` どころか `sh` すら無いことがある。
> その場合はビルド段階に `RUN`([Dockerfile 参照](/posts/dockerfile-basics/))でツールを入れるか、debug用イメージを別に用意する。

## つながらない — ポートと名前解決

「アクセスできない」は Docker で最頻の詰まり。切り分けは2段階。

1. **ホストから**つながらない → `docker run` の `-p ホスト:コンテナ` が正しいか、アプリが `0.0.0.0` で待受しているか
2. **コンテナ同士**でつながらない → 同じネットワークにいるか、相手を **IP でなくサービス名**で呼んでいるか

```bash
docker port <name>           # 実際のポート転送を確認
docker network inspect <net> # そのネットワークに誰がいるか
```

> ⚠️ アプリが `127.0.0.1` で待受していると、コンテナ内からしか見えず `-p` しても届かない。
> 詳しくは[コンテナの通信とデータ](/posts/container-network-and-data/)。

## イメージが太る・ビルドが遅い

原因はほぼ[レイヤーとキャッシュ](/posts/image-layers-multistage/)の使い方。

- **キャッシュが効かない** → 変わりにくい行（依存インストール）を上、変わりやすい行（ソースの COPY）を下に置く
- **イメージが巨大** → ビルド用の道具が最終イメージに残っている。[マルチステージビルド](/posts/image-layers-multistage/)で成果物だけ最終段へ

```bash
docker history <image>       # どの層が容量を食っているか可視化
```

## 症状別・最初に打つ一手

詰まった時にまず打つコマンドの早見表。

| 症状 | まず打つ | 疑う所 |
| --- | --- | --- |
| すぐ落ちる | `docker ps -a` → `logs` | CMD/アプリのエラー・終了コード |
| `docker` が応答しない | Docker Desktop / `dockerd` の起動確認 | デーモンが落ちている |
| ホストからつながらない | `docker port` | `-p` の順序・待受アドレス |
| コンテナ間でつながらない | `docker network inspect` | 同一ネットワーク・サービス名 |
| ディスクが一杯 | `docker system df` → `prune` | 溜まった停止コンテナ/イメージ |
| ビルドが毎回遅い | `docker history` | レイヤー順・キャッシュ |

> 🧭 「ログを見て切り分ける」順番は[症状別トラブルシューティング](/posts/symptom-based-troubleshooting/)と同じ。
> ツールが Docker に変わっただけで、**当てずっぽうで直さない**という原則は共通。

## まとめ

- 順番が命: **状態を見る（`ps -a`/`logs`/`inspect`）→ 中を調べる → 症状で切り分ける**
- 落ちた原因の9割はアプリのログに出ている。**まず `docker logs`**。`137` はメモリ超過を疑う
- 入れない時は `docker run -it --rm <image> sh` で同じイメージを対話起動する
- つながらない時は **`-p` の順序**と**待受アドレス／サービス名**を確認する
- 太る・遅いは[レイヤーとマルチステージ](/posts/image-layers-multistage/)で解決する

**← 前:** [② 日常のコマンド](/posts/docker-daily-commands/)

これで「Docker を手で動かす」シリーズは完結。使い方が身についたら、
なぜそう動くのかを[コンテナの正体（namespace/cgroup）](/posts/container-namespace-cgroup/)から深掘りしていこう。
