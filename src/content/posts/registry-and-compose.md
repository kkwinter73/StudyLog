---
title: "コンテナをちゃんと理解する⑤ レジストリと docker compose"
date: 2026-06-23T14:00:00
summary: "イメージを共有するレジストリ(push/pull)と、複数コンテナをまとめて動かす docker compose。シリーズの総まとめとして「compose up が裏で何をしているか」を一気通貫で説明する。"
tags: ["コンテナ", "基礎"]
level: beginner
---

> 📚 シリーズ「コンテナをちゃんと理解する」(5 / 5)

最後はイメージを共有する **レジストリ** と、複数コンテナをまとめる **docker compose**。
シリーズの総まとめとして、目標だった **「`docker compose up` が中で何をしているか」**を一気に説明する。

## コンテナレジストリ — イメージの倉庫

ビルドしたイメージを置いて共有する場所が **レジストリ**。`push` で上げ、`pull` で取ってくる。

```bash
docker build -t myapp:1.0 .                       # イメージを作る
docker tag myapp:1.0 registry.example.com/myapp:1.0
docker push registry.example.com/myapp:1.0        # レジストリへ上げる
docker pull registry.example.com/myapp:1.0        # 別環境で取ってくる
```

- 代表は Docker Hub。クラウドでは AWS の **ECR**、Google の Artifact Registry など
- [レイヤー構造](/posts/image-layers-multistage/)のおかげで、push/pull は**変わった層だけ**転送され効率的

> 🧭 本番では「CIでビルド→レジストリ(ECR)へpush→[ECS/Fargate](/posts/aws-compute-explained/)がpullして起動」
> という流れが定番。レジストリはビルドとデプロイの受け渡し地点になる。

## docker compose — 複数コンテナをまとめて定義

実アプリは web・db・cache など複数コンテナの組み合わせになる。それを1ファイル
（`docker-compose.yml`）に宣言し、1コマンドで起動・停止するのが compose。

```bash
docker compose up -d     # 定義した全サービスを起動（-d はバックグラウンド）
docker compose down      # まとめて停止・後片付け
```

## 総まとめ：compose up は裏で何をしているか

ここまでの①〜④が、`docker compose up` の一行に全部詰まっている。

```text
1. イメージ準備   build 指定はその場でビルド／image 指定はレジストリから pull  → ③⑤
2. ネットワーク作成  サービス同士が名前で解決できる専用ネットワークを用意      → ④
3. ボリューム準備   定義された volume を作成・マウント                       → ④
4. コンテナ起動    各サービスを namespace と cgroup で隔離して起動            → ①
5. 名前解決で接続   web から db へ、サービス名で通信できる状態に              → ④
```

> ⭐ つまり `compose up` は魔法ではなく、**「pull/build → ネットワーク → ボリューム → 隔離起動 → 名前解決」**を
> 順に自動でやっているだけ。一つ一つは①〜④で見た仕組みそのもの。中身が説明できれば目標達成。

## まとめ

- **レジストリ**はイメージの倉庫。`push`/`pull` で共有。クラウドでは ECR 等
- push/pull は[レイヤー](/posts/image-layers-multistage/)単位で差分転送されるので効率的
- **docker compose** は複数コンテナを1ファイルで宣言し、まとめて起動・停止する
- `compose up` の正体は **pull/build → ネットワーク → ボリューム → 隔離起動 → 名前解決** の自動実行
- どれもシリーズ①〜④で見たカーネル機能・イメージ・通信/データの組み合わせ

**← 前:** [④ コンテナの通信とデータ](/posts/container-network-and-data/)

これで「コンテナをちゃんと理解する」シリーズは完結。OS基礎・ディストリ・ネットワークの土台の上で、
コンテナが「ただのプロセスを隔離して動かす仕組み」だと一本につながったはず。次は [AWS の ECS/Fargate](/posts/aws-compute-explained/) へ。
