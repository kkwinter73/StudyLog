---
title: "AWS入門 — 全体像とGoアプリでまず使うサービス"
date: 2026-06-19T22:00:00
summary: "AWS はサービスが多すぎて迷子になりがち。リージョン/AZ・IAM という土台と、Goアプリを動かすために最初に押さえる定番サービス（コンピュート/ストレージ/DB）に絞って俯瞰する。"
tags: ["AWS", "クラウド", "インフラ"]
level: intermediate
---

AWS は200を超えるサービスがあり、全部を追うのは無理。**「土台になる概念」+「まず使う数個」**
だけ押さえれば、Goアプリを動かすには十分。そこに絞って全体像を掴む。

## 土台：リージョンとアベイラビリティゾーン (AZ)

- **リージョン** = 物理的な地域（例: 東京 `ap-northeast-1`）。データの置き場所・遅延・料金に効く。
- **AZ** = リージョン内の独立したデータセンター群。複数 AZ に分散させると、片方が落ちても生き残る。

> 💡 まずは「近いリージョンを1つ選ぶ」でOK。可用性が要るサービスは複数 AZ にまたがらせる、
> という順で考える。

## 最初に押さえる定番サービス

| 分類 | サービス | ざっくり何か |
| --- | --- | --- |
| コンピュート | EC2 | 仮想サーバー（VM）。何でも動く基本形 |
| コンテナ | ECS / Fargate | コンテナ実行基盤（Fargate はサーバー管理不要） |
| 関数 | Lambda | イベント駆動で関数を実行（常駐サーバー不要） |
| ストレージ | S3 | オブジェクトストレージ。ファイル/画像/バックアップ |
| データベース | RDS / DynamoDB | RDS=マネージドな RDB、DynamoDB=NoSQL |
| ネットワーク | VPC / ELB | 仮想ネットワーク / ロードバランサ |
| 権限 | IAM | 「誰が何をできるか」（後述・最重要） |

> 🧭 .NET なら AWS SDK for .NET や Elastic Beanstalk から入ることが多いが、概念は共通。
> IAM・VPC・S3 はどの言語でも同じ。

## Goアプリをどこで動かすか

[前回のインフラ記事](/posts/deploying-go-apps/)で見た単一バイナリ／コンテナを、AWS の
どこに載せるか。

| 選択肢 | 向き | 手間 |
| --- | --- | --- |
| Lambda | 小さなAPI・イベント処理・低頻度 | 最小（サーバー管理なし） |
| ECS + Fargate | 常駐するWeb API・中規模 | 中（コンテナを置くだけ） |
| App Runner | コンテナを最速で公開したい | 小 |
| EC2 | 細かく制御したい・特殊要件 | 大（OS運用が必要） |

> 💡 迷ったら「コンテナ化して Fargate / App Runner」。Goは小さいイメージになるので相性がよい。
> イベント駆動や低頻度なら Lambda が安くて楽。

## IAM：誰が何をできるか（最重要）

AWS のセキュリティの中心。**最小権限（必要な操作だけ許可）** が原則。
アプリには「ロール」を割り当て、そのロールに必要なポリシーだけ付ける。

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": "arn:aws:s3:::my-bucket/*"
  }]
}
```

> ⚠️ アクセスキーをコードや Git に書かない。EC2/ECS/Lambda には **IAM ロール** を割り当て、
> SDK が自動で一時認証情報を取得する形にする（鍵の管理が要らなくなる）。

## Go から AWS を使う（SDK v2）

公式の `aws-sdk-go-v2`。認証は環境やロールから自動取得されるので、コードに鍵は書かない。

```go
import (
	"context"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func main() {
	ctx := context.Background()

	// 環境変数・IAMロール等から認証情報を自動ロード
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatal(err)
	}

	client := s3.NewFromConfig(cfg)
	out, err := client.ListBuckets(ctx, &s3.ListBucketsInput{})
	// out.Buckets を使う...
}
```

## 設定と秘密情報・料金の勘所

- **設定/秘密情報**: 環境変数のほか、**Parameter Store**（設定値）や **Secrets Manager**（機密）に置き、IAM 権限越しに読む。
- **料金**: ほぼ従量課金。**無料枠 (Free Tier)** がある。止め忘れの EC2 や、S3 の転送量で課金が伸びやすい。
- **コスト管理**: Budgets で予算アラートを設定し、Cost Explorer で内訳を見るのを早めに習慣化する。

> ⚠️ 一番ありがちな事故は「検証で立てた EC2 / NAT Gateway の止め忘れ」。タグを付け、不要なら消す。

## まとめ

- 土台は2つ ——「リージョン/AZ」と「IAM（最小権限）」
- まず使うのは EC2 / ECS+Fargate / Lambda / S3 / RDS・DynamoDB / VPC
- Go アプリはコンテナ化して Fargate / App Runner、軽量なら Lambda が手軽
- 認証はアクセスキーではなく IAM ロールに寄せ、鍵を持たない
- 秘密情報は Secrets Manager 等へ。料金は従量課金、止め忘れと予算アラートに注意
