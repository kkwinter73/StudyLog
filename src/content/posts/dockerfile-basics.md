---
title: "コンテナをちゃんと理解する② Dockerfile の基本"
date: 2026-06-23T17:00:00
summary: "イメージを作るレシピが Dockerfile。ベースOS(debian/alpine)の選び方と、FROM/COPY/RUN/CMD の役割、混同しやすい RUN と CMD の違いを押さえ、自分でイメージを書けるようにする。"
tags: ["コンテナ", "基礎"]
level: beginner
---

> 📚 シリーズ「コンテナをちゃんと理解する」(2 / 5)

[コンテナの正体](/posts/container-namespace-cgroup/)が分かったら、次はその元になる **イメージの作り方**。
イメージを作るレシピが **Dockerfile**。ベースOS の選択と主要4命令を押さえれば、自分で書けるようになる。

## Dockerfile とは

Dockerfile は「このイメージをこう組み立てて」という手順書。上から順に実行され、各行が積み重なって
1つのイメージになる。`docker build` でこのレシピからイメージを焼く。

## FROM — どのベースOSから始めるか

最初の `FROM` で土台を選ぶ。ここが[ディストリビューションの選択](/posts/linux-distros-and-packages/)そのもの。

```dockerfile
FROM node:22            # Debian系ベース（大きいが無難）
FROM node:22-alpine     # Alpine ベース（小さい）
```

- **alpine** は数MBで軽いが、標準Cライブラリが musl で[ハマりがある](/posts/linux-distros-and-packages/)
- 迷ったら debian系、サイズを詰めたいなら alpine、というのが大まかな指針

## 主要4命令

最低限これだけで動くイメージが書ける。

| 命令 | 役割 | 例 |
| --- | --- | --- |
| `FROM` | ベースイメージを指定 | `FROM golang:1.26` |
| `COPY` | ホストのファイルをイメージへ | `COPY . /src` |
| `RUN` | **ビルド時**にコマンド実行（層を作る） | `RUN go build -o /app` |
| `CMD` | **起動時**に実行するコマンド（既定） | `CMD ["/app"]` |

```dockerfile
FROM golang:1.26
WORKDIR /src
COPY . .
RUN go build -o /app .     # ビルド時に1回だけ実行
CMD ["/app"]               # コンテナ起動のたびに実行
```

## RUN と CMD の違い（混同注意）

ここが最頻の勘違いポイント。**実行されるタイミングが違う**。

- `RUN` … **イメージを作るとき**に走る。結果はイメージに焼き込まれる（例: 依存インストール、ビルド）
- `CMD` … **コンテナを起動するとき**に走る。アプリ本体の起動コマンド

> ⚠️ `CMD` はイメージに1つ。`docker run myapp 別コマンド` で上書きできる。
> 似た `ENTRYPOINT` は「必ず実行する本体」を固定する用途で、引数だけ差し替えたい時に併用する。

> 🧭 .NET でも `FROM mcr.microsoft.com/dotnet/aspnet:8.0` → `COPY` 発行物 → `ENTRYPOINT ["dotnet","app.dll"]`
> と同じ構造。言語が違っても Dockerfile の組み立て方は共通。

## まとめ

- Dockerfile は**イメージを作るレシピ**。上から順に積み上がる。`docker build` で焼く
- `FROM` でベースOSを選ぶ＝[ディストリ選択](/posts/linux-distros-and-packages/)。alpine は軽いが musl 注意
- 4命令: **FROM(土台) / COPY(持ち込む) / RUN(ビルド時) / CMD(起動時)**
- **RUN はビルド時・CMD は起動時**。タイミングの違いが要点
- 本体を固定したいときは `ENTRYPOINT` を併用する

**← 前:** [① コンテナの正体](/posts/container-namespace-cgroup/)
**→ 次:** [③ イメージのレイヤーとマルチステージ](/posts/image-layers-multistage/)
