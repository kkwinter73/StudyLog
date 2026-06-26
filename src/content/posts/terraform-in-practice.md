---
title: "Terraform 実践 — provider・変数・module と実行フロー"
date: 2026-06-26T09:00:00
summary: "resource と state の基礎の次へ。どのクラウドを操作するかの provider、値を出し入れする variable/output、構成を再利用する module、そして init→plan→apply の実行フローを押さえる。"
tags: ["IaC", "インフラ"]
level: intermediate
---

[Terraform の基礎（resource と state）](/posts/iac-terraform-basics/)の次の一歩。
実際に書いて回すために要る **provider・変数・module** と、**init→plan→apply** の実行フローを押さえる。

## provider — どのクラウドを操作するか

Terraform 自体は「差分を計算して適用するエンジン」で、AWS や GCP を直接知らない。
**provider** が各クラウドのAPIを叩くプラグインで、これを宣言して初めて [`aws_vpc`](/posts/aws-igw-and-subnet-mask/) などが使える。

```hcl
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = "ap-northeast-1"   # どのリージョンを操作するか
}
```

> 💡 `resource "aws_vpc"` の `aws_` という接頭辞が、どの provider のリソースかを表している。

## variable と output — 値の出し入れ

ベタ書きを避け、環境差や使い回す値を **variable（入力）** と **output（出力）** で扱う。

```hcl
variable "env" {
  type    = string
  default = "dev"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = { Name = "${var.env}-vpc" }   # var.env で参照
}

output "vpc_id" {
  value = aws_vpc.main.id              # 適用後に表示・他から参照できる
}
```

- 値の渡し方: `terraform apply -var="env=prod"`、または `*.tfvars` ファイルにまとめる
- 同じコードで `env=dev` / `env=prod` を切り替えられる＝**環境ごとに作り直さない**

> ⚠️ tfvars に DB パスワード等の秘密を書いて Git に入れない。[シークレットの扱い](/posts/secrets-management/)は IaC でも同じ原則。

## module — 構成をまとめて再利用

複数の resource をひとまとまりにして再利用できるのが **module**。「VPC＋サブネット＋[SG](/posts/aws-security-groups/)」を
1つの部品にして、環境ごとに呼び出す、という使い方をする。

```hcl
module "network" {
  source = "./modules/network"   # モジュールの置き場所
  env    = var.env               # モジュールへ変数を渡す
}
```

> 🧭 関数や再利用コンポーネントと同じ発想。入力(variable)を受け取り、出力(output)を返す“インフラの部品”。
> 同じ構成を何度も手で書かず、module を呼び出して使い回す。

## 実行フロー：init → plan → apply

Terraform は決まった順序で回す。**差分を見てから適用**するのが安全運用の肝。

| コマンド | 何をする |
| --- | --- |
| `terraform init` | provider/module をダウンロードし、[state](/posts/iac-terraform-basics/)の保存先を初期化 |
| `terraform plan` | コードと現実の**差分をプレビュー**（作る/変える/壊すを事前表示） |
| `terraform apply` | plan の内容を実際に適用する |
| `terraform destroy` | 管理下のリソースを全削除する |

```bash
terraform init      # 最初の一回（provider追加時も）
terraform plan      # 何が変わるか確認 ← ここを必ず読む
terraform apply     # 適用（再度差分を見て yes）
```

> ⚠️ `plan` で **意図しない「破棄(destroy)」が出ていないか**を必ず確認する。属性変更が作り直しを
> 引き起こすことがある。plan を読まずに apply しないのが事故防止の基本。

## まとめ

- **provider** は各クラウドを操作するプラグイン。宣言して `aws_*` 等のリソースが使える
- **variable/output** で値を出し入れし、同じコードで環境（dev/prod）を切り替える
- **module** は構成をまとめた再利用部品。入力を受け取り出力を返す“インフラの関数”
- 実行は **init → plan → apply**（破棄は destroy）。**plan の差分を必ず読む**
- 秘密は tfvars に書かず Git に入れない（[シークレット管理](/posts/secrets-management/)と同じ）

次にやること: [基礎編](/posts/iac-terraform-basics/)で作った VPC を variable で `env` 対応にし、module に切り出してみる。
