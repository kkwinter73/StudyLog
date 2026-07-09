---
title: "Docker を手で動かす① 全体像 — 結局なにをするツールか"
date: 2026-07-09T23:00:00
summary: "Docker は「自分の環境では動く」問題を消すためのツール。イメージ・コンテナ・レジストリの3語と、Dockerfile→build→run の一本道、そして CLI とデーモンの関係を押さえ、この先どこを深掘りすればいいかの地図を作る。"
tags: ["コンテナ", "基礎"]
level: beginner
---

> 📚 シリーズ「Docker を手で動かす」(1 / 3)

Docker が何をするツールなのかを、まず一段上から俯瞰する。難しい仕組みは
[別シリーズ](/posts/container-namespace-cgroup/)に任せ、ここでは **「登場人物3つ」と「一本の流れ」**だけ押さえて、
この先どこを掘ればいいかの地図を作る。

## Docker が消してくれる問題

「自分のPCでは動くのに、本番（や同僚のPC）では動かない」——原因はたいてい環境の差だ。
OSのバージョン、入っているライブラリ、環境変数。Docker は **アプリと必要なものをまとめて箱に詰め**、
どこでも同じ箱を動かすことで、この差を消す。

> ⭐ Docker の売りは「速さ」ではなく **再現性**。同じイメージなら手元・CI・本番で同じように動く。

## 登場人物は3つだけ

Docker の用語は多いが、まずこの3語で全体像が組める。

| 用語 | 正体 | たとえ |
| --- | --- | --- |
| **イメージ** | アプリ＋環境を固めた読み取り専用のテンプレート | 料理の**レシピ＋材料一式** |
| **コンテナ** | イメージを起動した、動いている実体 | レシピから作った**一皿** |
| **レジストリ** | イメージを保管・共有する倉庫 | レシピの**本棚**（Docker Hub / ECR 等） |

1つのイメージから、コンテナは何個でも起動できる。コンテナは使い捨てが基本で、
[データを残したいなら別の仕組み](/posts/container-network-and-data/)が要る。

## 一本の流れ — build して run するだけ

日常の操作は、突き詰めるとこの一本道になる。

```bash
# 1. レシピ(Dockerfile)からイメージを焼く
docker build -t myapp .
# 2. イメージからコンテナを起動する
docker run myapp
# 3. できたイメージを倉庫へ共有する（任意）
docker push registry.example.com/myapp
```

```text
Dockerfile ──build──▶ イメージ ──run──▶ コンテナ（動いてる）
                        │
                        └──push/pull──▶ レジストリ（共有）
```

レシピの書き方は[Dockerfile の基本](/posts/dockerfile-basics/)、
共有は[レジストリと compose](/posts/registry-and-compose/)で詳しく扱う。

## `docker` コマンドは誰に頼んでいるのか

`docker run` を打つと動くが、実は **打った `docker`（CLI）自身は動かしていない**。
裏で常駐する **Docker デーモン（Docker Engine）** に「これ動かして」と頼んでいるだけだ。

```text
docker run ...  ─(APIで依頼)─▶  Docker デーモン  ─▶ イメージ取得・コンテナ起動
   (CLI)                          (常駐する本体)
```

> 💡 だから「`docker` は動くのにエラーが出る」時、まず疑うのはデーモンが起きているか。
> Docker Desktop や `dockerd` が動いていないと CLI は何も頼めない。

> 🧭 .NET の `dotnet publish` が発行物を作り `dotnet app.dll` が動かすのと同じで、
> **作る係（build）と動かす係（run）は別**。Docker はそこにデーモン越しの依頼が挟まる。

## この先の地図

Docker を「完璧に」理解するには、使える＋中身が分かるの両輪がいる。

- **手で使えるように** → 本シリーズ②[日常のコマンド](/posts/docker-daily-commands/)、③[詰まった時のデバッグ](/posts/docker-troubleshooting/)
- **中身を理解する** → [コンテナの正体（namespace/cgroup）](/posts/container-namespace-cgroup/)から始まる5部作

## まとめ

- Docker は「自分の環境では動く」問題を、**環境ごと箱に詰めて再現性**で消すツール
- 登場人物は3つ: **イメージ（レシピ）/ コンテナ（動いてる実体）/ レジストリ（倉庫）**
- 流れは一本道: **Dockerfile → build → イメージ → run → コンテナ**、共有は push/pull
- `docker` コマンドは CLI で、実際の作業は裏の **Docker デーモン**が行う
- 使える力は②③で、仕組みは[内部シリーズ](/posts/container-namespace-cgroup/)で深掘りする

**→ 次:** [② 日常のコマンドとよく使うフラグ](/posts/docker-daily-commands/)
