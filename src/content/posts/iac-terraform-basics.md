---
title: "CI/CD と IaC② 手作業から Terraform へ"
date: 2026-06-25T10:00:00
summary: "コンソールでポチポチ作ったインフラは、再現も変更追跡もできない。インフラをコードで宣言する IaC の利点と、Terraform の resource / state という2つの核を押さえる。"
tags: ["IaC", "インフラ"]
level: beginner
---

> 📚 シリーズ「CI/CD と IaC」(2 / 3)

[VPC や SG](/posts/aws-security-groups/) を AWS コンソールで手作業で作ると、「誰が・いつ・何を変えたか」が残らず、
同じ環境をもう一つ作るのも一苦労。これを解決するのが **IaC（Infrastructure as Code）**。
代表格 Terraform の核 **resource** と **state** を押さえる。

## コンソール手作業の問題

ポチポチ作る手作業には、見えにくい代償がある。

- **再現性がない**: 同じ構成のステージング環境を作れ、と言われても手順が頭の中
- **変更追跡ができない**: 誰がいつ何を変えたか残らない。事故っても戻せない
- **レビューできない**: 変更前に第三者が確認する手段がない

> ⚠️ 「本番だけ設定が違う」「作った人しか分からない」は手作業の典型的な負債。
> インフラが大きくなるほど効いてくる。

## IaC とは

IaC は **インフラの構成をコードで宣言**し、そのコードから環境を作る考え方。

- コードなので Git で**変更追跡・レビュー・差し戻し**ができる（アプリのコードと同じ扱い）
- 同じコードから**何度でも同じ環境を再現**できる
- 「あるべき状態」を書くと、ツールが現実をそこに合わせる（宣言的）

> 💡 [単一の真実源(SoT)](/posts/single-source-of-truth/)の発想そのもの。インフラの真実をコードに一本化し、
> 手作業での"こっそり変更"を許さない。

## Terraform の核① resource

Terraform では、作りたいものを `resource` ブロックで**宣言的に**書く。「どう作るか」ではなく「何があるべきか」。

```hcl
# 「このVPCが存在すべき」と宣言する
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id   # 上のVPCを参照
  cidr_block = "10.0.1.0/24"
}
```

- `terraform plan` で「今との差分」を確認 → `terraform apply` で適用
- 手順を書くのではなく**結果（あるべき姿）**を書く。差分の埋め方はツールが考える

## Terraform の核② state

Terraform は **state（状態ファイル）** に「コードと実物の対応」を記録する。これが肝。

- どの `resource` が実際のどのAWSリソースに対応するかを state が覚えている
- だから次に `apply` すると、state と現実とコードを照合し、**差分だけ**を変更できる

> ⚠️ state は**真実の台帳**。チーム開発では共有の場所（S3 等）に置き、同時実行で壊れないよう
> [ロックをかける](/posts/aws-data-stores-explained/)（DynamoDB が state ロックに使われるのはこのため）。

> ⚠️ state には接続文字列などの**秘密情報が平文で入りうる**。state ファイルの扱いは
> [次回のシークレット管理](/posts/secrets-management/)で扱う重要ポイント。

## まとめ

- コンソール手作業は**再現性なし・変更追跡なし・レビュー不可**という負債を生む
- **IaC** はインフラをコードで宣言し、Git で追跡・レビュー・再現できるようにする
- Terraform の **resource** は「あるべき姿」を宣言的に書く（plan で差分確認→apply）
- **state** はコードと実物の対応台帳。差分適用の要。共有＋ロックが必要
- state には秘密が入りうるので扱いに注意（次回へ）

**← 前:** [① 手動デプロイから GitHub Actions へ](/posts/cicd-github-actions/)
**→ 次:** [③ なぜシークレットをハードコードしてはいけないか](/posts/secrets-management/)
