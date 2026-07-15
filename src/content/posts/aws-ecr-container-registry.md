---
title: "ECR — AWS のコンテナイメージ置き場（レジストリ）"
date: 2026-07-15T13:00:00
summary: "ビルドしたコンテナイメージをどこに置き、本番はどこから取ってくるのか。その置き場が ECR（Elastic Container Registry）、AWS のマネージドなコンテナレジストリだ。レジストリの役割、build→tag→login→push→pull の流れ、そして IAM 認証・ライフサイクルポリシー・イメージスキャンといった ECR ならではの点を、デプロイの起点として押さえる。"
tags: ["AWS", "コンテナ"]
level: intermediate
---

コンテナをビルドすると**イメージ**（アプリ＋依存を固めた箱）ができる。これを**どこかに置いて**、
本番の実行環境が**取ってくる（pull）**必要がある。その置き場が **ECR（Elastic Container Registry）**——
AWS のマネージドな**コンテナレジストリ**だ。イメージそのものは[コンテナ記事](/posts/image-layers-multistage/)、ここはその**置き場と受け渡し**の話。

## レジストリとは — なぜ置き場が要るのか

ビルドした環境と、実際に動かす環境（ECSやサーバ）は別。間に**共有の置き場**が要る。それがレジストリ。

- **push**: ビルドしたイメージをレジストリに**上げる**
- **pull**: 実行環境がレジストリから**落として**起動する
- Docker Hub が公開レジストリの代表。**ECR はその AWS 版（主にプライベート）**で、自社イメージを安全に置ける

> ⭐ レジストリは「ビルド」と「実行」をつなぐ**受け渡し場所**。CIがpushし、本番がpullする。
> だから「[ECR に push 済み](/posts/cron-scheduled-jobs/)」＝「本番が取りに行ける状態になった」＝**デプロイの起点**を意味する。

## push / pull の流れ

ECR にイメージを上げるのは、build → tag → login → push の順。実行側は pull する。

```bash
# 1. ビルド
docker build -t myapp .
# 2. ECR のリポジトリURI でタグ付け（<アカウント>.dkr.ecr.<リージョン>.amazonaws.com/<repo>）
docker tag myapp:latest 123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/myapp:latest
# 3. ECR にログイン（IAM 権限で一時トークンを取得して docker login）
aws ecr get-login-password --region ap-northeast-1 \
  | docker login --username AWS --password-stdin 123456789012.dkr.ecr.ap-northeast-1.amazonaws.com
# 4. push
docker push 123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/myapp:latest
```

- イメージは `リポジトリ:タグ` で識別する。`latest` だけでなく、**コミットハッシュや版番号**でタグ付けすると戻せる
- 実行側（ECS等）は同じURIを指定して **pull**。CI からの push は[鍵レス認証(OIDC)](/posts/ci-oidc-keyless-auth/)にすると安全

## ECR ならではの点

汎用レジストリと違い、AWS に統合されているのが ECR の価値。

- **IAM 認証**: パスワードではなく **IAM 権限**でアクセス制御。ログインは一時トークン（固定鍵を配らない）
- **プライベート既定**: 自社イメージを非公開で保持。実行環境の**タスク実行ロール**に pull 権限を与える
- **ライフサイクルポリシー**: 古い/未タグのイメージを**自動削除**。放置で膨らむ保管コストを抑える
- **イメージスキャン**: push 時に**脆弱性スキャン**をかけられる（[依存の脆弱性](/posts/dependency-vulnerabilities/)対策の一環）
- **ECS/EKS/Lambda 統合**: これらが ECR から直接 pull して起動する。デプロイの標準経路

> 🧭 .NET でいう NuGet や Azure Container Registry (ACR) に相当する立ち位置。ECR は**AWS版の私設コンテナ置き場**で、
> 認証が IAM に寄っているのが最大の違い。「鍵を配る」のではなく「ロールに許可する」発想。

## まとめ

- ECR は AWS のマネージド**コンテナレジストリ**。ビルドしたイメージの置き場で、**push/pull** でビルドと実行をつなぐ
- 流れは **build → tag（リポジトリURI）→ login（IAMで一時トークン）→ push**。実行側は同じURIで **pull**
- タグは `latest` 任せにせず**版番号/コミットハッシュ**で。戻せるようにしておく
- ECR固有の強みは **IAM認証・プライベート・ライフサイクルポリシー・イメージスキャン・ECS等との統合**
- 「ECR に push 済み」＝本番が pull できる状態＝**デプロイの起点**。CIからの push は OIDC で鍵レスに

**関連:** [レジストリと docker compose](/posts/registry-and-compose/) / [イメージのレイヤーとマルチステージ](/posts/image-layers-multistage/) / [cron — 定期実行](/posts/cron-scheduled-jobs/) / [CIの鍵レス認証（OIDC）](/posts/ci-oidc-keyless-auth/)
