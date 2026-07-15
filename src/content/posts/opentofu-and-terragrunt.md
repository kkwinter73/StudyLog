---
title: "OpenTofu と Terragrunt — Terraform の『次』と、DRY に回す薄いラッパー"
date: 2026-07-15T18:00:00
summary: "Terraform を使い込むと2つの痛みに当たる。ライセンスが変わった問題と、環境ごとに設定がコピペで増える問題。OpenTofu は前者に対するオープンソースの fork（ほぼ差し替え互換）、Terragrunt は後者を解く薄いラッパー。なぜ生まれたか、それぞれ何を解決するか、terragrunt.hcl の書き方と両者の組み合わせ方までをまとめる。"
tags: ["IaC", "運用"]
level: intermediate
---

[Terraform](/posts/iac-terraform-basics/)を実務で使い込むと、2つの痛みに当たる。ひとつは**ライセンスが変わった**こと、もうひとつは環境が増えるたびに**設定がコピペで増える**こと。この2つにそれぞれ答えるのが **OpenTofu** と **Terragrunt** だ。何者で、何を解決するのかを押さえる。

## 背景 — Terraform の2つの痛み

Terraform は長く「IaC の標準」だったが、2つの課題を抱えていた。

| 痛み | 中身 | 答える道具 |
| --- | --- | --- |
| ライセンス | 2023年に OSS ライセンス（MPL）から**利用制限つき**の BSL へ変更 | **OpenTofu**（fork） |
| DRY | 環境・モジュールが増えると backend やプロバイダ設定を**コピペ**する羽目に | **Terragrunt**（ラッパー） |

この2つは別々の問題で、道具も別。だが「素の Terraform の外側」という点で一緒に語られることが多い。

## OpenTofu — Terraform のオープンソース fork

2023年、HashiCorp は Terraform のライセンスを MPL 2.0 から **BSL 1.1**（source-available だが商用利用に制限）へ変更した。これに反発したコミュニティが Terraform を fork し、**OpenTofu** として Linux Foundation の下でオープンソース（MPL）を維持している。

- **ほぼ差し替え互換**。CLI は `tofu`（`terraform` を `tofu` に置き換えるイメージ）。HCL・state 形式・プロバイダ（同じ Registry）をそのまま使える。
- 移行は基本的に**バイナリを差し替えるだけ**。`terraform.tf` などの設定はそのまま動くことが多い。
- fork 後は**独自機能**も入り始めた（例: state 内の秘密情報を暗号化する state 暗号化など）。

```bash
# terraform → tofu にコマンドを置き換えるだけ
tofu init
tofu plan
tofu apply
```

> 🧭 C# で言えば、あるライブラリのライセンスが変わってコミュニティが fork し、旧来の使い勝手のまま別実装を保つのに近い。呼び出し側（あなたの `.tf`）は基本そのまま。

> ⚠️ 「差し替えるだけ」でも、両者は少しずつ機能が分岐している。**新しい版でしか使えない機能**を書くと相手側で動かない。どちらに寄せるかはチームで決める。

## Terragrunt — 設定を DRY に保つ薄いラッパー

環境やモジュールが増えると、各ディレクトリの `.tf` に **backend（[state](/posts/iac-state-operations/)の置き場）設定やプロバイダ設定を毎回コピペ**することになる。バケット名を1つ直すのに全ファイルを触る、という事態が起きる。

**Terragrunt** は Terraform / OpenTofu を**呼び出す薄いラッパー**（by Gruntwork）。設定は `terragrunt.hcl` に書き、重複を親から継承させて DRY に保つ。中身では結局 `terraform`（か `tofu`）を実行しているだけ。

```hcl
# 親: terragrunt.hcl（backend 設定を1か所に集約）
remote_state {
  backend = "s3"
  config = {
    bucket = "my-tf-state"
    # 各モジュールのパスから key を自動生成 → 重複しない
    key    = "${path_relative_to_include()}/terraform.tfstate"
    region = "ap-northeast-1"
  }
}
```

```hcl
# 子: envs/prod/app/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()   # 親の設定を継承
}
terraform {
  source = "../../../modules/app"   # 使う module を指定
}
inputs = {
  instance_size = "large"           # この環境で変える値だけ
}
```

> 🧭 C# の `Directory.Build.props` に近い。共通の設定を親に1つ置き、各プロジェクト（各環境）は差分だけ書く発想。

## Terragrunt の効きどころ

Terragrunt が特に効くのは、モジュールが**たくさん**あるときだ。

- **backend / プロバイダの generate**: 定型の `backend.tf` を各所に置かず、親から生成して重複を消す。
- **モジュール間の依存**: あるモジュールの出力を別モジュールの入力に渡せる。

  ```hcl
  dependency "vpc" {
    config_path = "../vpc"
  }
  inputs = {
    vpc_id = dependency.vpc.outputs.vpc_id   # vpc の出力を受け取る
  }
  ```

- **まとめて実行**: `terragrunt run-all apply` で依存順を解決しつつ**複数モジュールを一括適用**。

> 💡 [マルチ環境](/posts/multi-env-iac/)で触れた「同じコード＋違う変数」を、ディレクトリ構成と `inputs` で機械的に徹底できるのが Terragrunt の勘所。

## どう組み合わせ、いつ使うか

3つは**排他ではなく積み重ね**られる。素の Terraform → OpenTofu に差し替え → その上に Terragrunt を被せる、という順で足していける。

- Terragrunt は裏で叩くバイナリを選べる（`tofu` を指定すれば **OpenTofu + Terragrunt** の組み合わせになる）。
- ただし**最初から全部入れない**。モジュールが数個なら素の Terraform / OpenTofu で十分。**コピペの痛みが出てから** Terragrunt を足すのが健全。

| 状況 | おすすめ |
| --- | --- |
| ライセンスを OSS に保ちたい | OpenTofu に寄せる |
| モジュール数個・環境も少ない | 素の Terraform / OpenTofu のまま |
| 環境・モジュールが増えコピペが痛い | Terragrunt を足す |

## まとめ

- Terraform の2つの痛み（**ライセンス**と**DRY**）に、別々に答えるのが OpenTofu と Terragrunt
- **OpenTofu** は BSL 化への反発から生まれた**オープンソース fork**。`tofu` でほぼ差し替え互換、独自機能も増加中
- **Terragrunt** は Terraform / OpenTofu を呼ぶ**薄いラッパー**。`terragrunt.hcl` で backend・依存・一括実行を DRY に回す
- 両者は**積み重ね可能**（OpenTofu + Terragrunt もできる）
- 道具は**痛みが出てから足す**。小規模なら素のままでよい

**次にやること:** [state の運用](/posts/iac-state-operations/)を押さえてから、[マルチ環境の分け方](/posts/multi-env-iac/)を Terragrunt で機械化してみる。

**関連:** [Terraform 入門](/posts/iac-terraform-basics/) / [Terraform 実践（module/変数）](/posts/terraform-in-practice/)
