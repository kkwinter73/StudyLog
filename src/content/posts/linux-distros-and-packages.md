---
title: "Linux をちゃんと使う① ディストリビューションとパッケージ管理"
date: 2026-06-22T19:00:00
summary: "Docker の FROM やサーバー選びで最初に出会う「ディストリの違い」。Debian系・Red Hat系・Alpine の性格と、apt/yum/apk の使い分けを、イメージ選択に直結する形で押さえる。"
tags: ["Linux", "コンテナ", "基礎"]
level: beginner
---

> 📚 シリーズ「Linux をちゃんと使う」(1 / 6)

Docker の `FROM` 行やサーバー選びで最初にぶつかるのが「どの Linux にするか」。
Debian系・Red Hat系・Alpine の違いと、付随する **パッケージ管理（apt/yum/apk）** を、
[コンテナイメージ選び](/posts/deploying-go-apps/)に直結する形で押さえる。

## ディストリビューションとは

Linux の中核（カーネル）はどれもほぼ共通。違うのは、その周りに付ける **ツール・パッケージ管理・
標準ディレクトリ構成などの「詰め合わせ」**だ。この詰め合わせの流派が **ディストリビューション**。

> 💡 [カーネルは共通の土台](/posts/kernel-role-for-containers/)で、ディストリはその上の「お弁当の具」の違い。
> だからどのディストリでも基本コマンドや仕組みは共通し、差は主にパッケージ管理とデフォルト構成に出る。

## 3系統の性格

| 系統 | 代表 | パッケージ管理 | 性格 |
| --- | --- | --- | --- |
| Debian系 | Debian, Ubuntu | apt（`.deb`） | 情報・パッケージが豊富。迷ったら無難 |
| Red Hat系 | RHEL, CentOS, Rocky, Fedora | yum / dnf（`.rpm`） | 企業サーバーで定番。EC2 の Amazon Linux もこの系統 |
| Alpine | Alpine Linux | apk | 極小（数MB）。コンテナイメージで人気 |

## パッケージ管理（apt / yum / apk）

「ソフトを入れる・消す・更新する」をコマンドで一元管理するのがパッケージマネージャ。
系統ごとにコマンドは違うが、やることは同じ。

```bash
# Debian系（apt）
apt update && apt install -y curl

# Red Hat系（dnf / 旧 yum）
dnf install -y curl

# Alpine（apk）
apk add --no-cache curl
```

| やること | apt | dnf/yum | apk |
| --- | --- | --- | --- |
| 一覧更新 | `apt update` | （自動） | （自動） |
| 導入 | `apt install` | `dnf install` | `apk add` |
| 削除 | `apt remove` | `dnf remove` | `apk del` |

## Docker イメージ選択にどう効くか

ベースイメージの末尾のタグは、このディストリ選択そのもの。

```dockerfile
FROM node:22            # Debian系（大きいが無難）
FROM node:22-alpine     # Alpine（小さい）
```

- **Alpine は数MBで軽く** pull が速い・攻撃面が小さい。CI やコンテナで好まれる
- ただし Alpine は標準Cライブラリが **musl**（一般的な glibc と別物）。glibc 前提のバイナリが
  動かない・微妙に挙動が違う、というハマりがある

> ⚠️ Go は [`CGO_ENABLED=0` の静的バイナリ](/posts/deploying-go-apps/)にすれば libc 非依存になり、
> Alpine でも `scratch`/`distroless` でも安全に動く。musl 問題を回避できるのは Go の強み。

> 🧭 .NET も `mcr.microsoft.com/dotnet/runtime:8.0` と `...:8.0-alpine` のようにタグでディストリを選ぶ。
> 「ベースイメージのタグ＝ディストリ選択」という構図は言語をまたいで共通。

## まとめ

- カーネルは共通、ディストリは**周辺ツールと構成の詰め合わせ**の違い
- 3系統: **Debian系(apt) / Red Hat系(dnf,yum) / Alpine(apk)**。EC2 の Amazon Linux は Red Hat系
- パッケージ管理はコマンドが違うだけで「入れる・消す・更新」は同じ
- Docker のベースイメージのタグがディストリ選択そのもの。**Alpine は軽いが musl に注意**
- Go の静的バイナリなら musl 問題を避けつつ最小イメージにできる

**→ 次:** [② 基本コマンドとパイプ・リダイレクト](/posts/linux-basic-commands/)
