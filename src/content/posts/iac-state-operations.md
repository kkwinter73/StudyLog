---
title: "IaC の state を安全に運用する — state操作と deploy衝突の回避"
date: 2026-06-26T16:00:00
summary: "state はコードと実物の対応台帳。リネームや既存リソースの取り込みで state を直接触る場面と、IaC とアプリデプロイが同じリソースを奪い合う衝突を ignore_changes で防ぐ方法を押さえる。"
tags: ["IaC", "運用"]
level: intermediate
---

[Terraform の基礎](/posts/iac-terraform-basics/)で見た **state**（コードと実物の対応台帳）は、運用が進むと
**直接触る**場面が出てくる。リネーム追従や既存リソースの取り込み、そして
IaC とアプリ[デプロイ](/posts/cicd-github-actions/)の衝突回避。事故りやすい所なので慎重に。

## state は「触ると危険」が前提

state は[差分適用の要となる台帳](/posts/iac-terraform-basics/)。ここが現実とズレると、ツールは
「作るべきものが無い／消すべきものが分からない」と誤動作する。

> ⚠️ state を壊すと、既存リソースを**二重作成**したり、管理外になって**消せなくなる**。
> state 操作は「最後の手段」で、実行前に必ず差分とバックアップを確認する。

## 代表的な state 操作

コードの書き換えだけでは追従できない時に使う。

| 操作 | 何をする | 使う場面 |
| --- | --- | --- |
| `state mv` | state内の名前を付け替える | リソースをリネーム/モジュールへ移動した時 |
| `state rm` | 管理から外す（実物は消さない） | IaC管理をやめるが現物は残したい時 |
| `import` | 既存の実物をstateに取り込む | 手で作った物をIaC管理下に入れる時 |

> 💡 `state rm` は**実物を消さず台帳から外すだけ**、`import` は**実物を作らず台帳に紐づけるだけ**。
> 「台帳の操作」と「現物の操作」を分けて考えると混乱しない。

## IaC とアプリデプロイの衝突

よくある事故が、**同じリソースをIaCとアプリデプロイの両方が更新する**ケース。
例えばコンテナの定義は、[アプリのデプロイ](/posts/cicd-github-actions/)が新しいイメージで毎回書き換える。
ところがIaCも同じ定義を管理していると、`apply` のたびに古いイメージへ**巻き戻してしまう**。

## ignore_changes で住み分ける

解決は「**その属性はIaCの管理外**」と宣言すること（`lifecycle.ignore_changes`）。

```hcl
resource "app_service" "web" {
  # ... CPU やメモリなど構成はIaCで管理 ...

  lifecycle {
    ignore_changes = [image]   # イメージはデプロイ側に任せ、IaCは触らない
  }
}
```

- **構成（CPU/メモリ/環境変数）はIaC**、**動かすイメージはデプロイ**、と責務を分ける
- イメージを意図的に変えたい時だけ、明示的に再作成する

> 💡 「誰がその属性の[真実源か](/posts/single-source-of-truth/)」を1つに決めるのが本質。
> 二重管理をやめれば、`apply` がデプロイを巻き戻す事故は起きない。

## 安全運用のマナー

- **破壊系（rm/mv/destroy）は実行前に共有・承認**を取る。1人で勝手に流さない
- [`plan` の差分を必ず読む](/posts/terraform-in-practice/)。意図しない作り直しが無いか確認
- `apply` 直後の失敗は**反映の遅延（eventual consistency）**のことがある。数十秒待って再試行

## まとめ

- **state は触ると危険**な台帳。操作は最後の手段、実行前に差分・バックアップ確認
- `state mv`（名前変更追従）/ `state rm`（管理から外す・実物は残す）/ `import`（既存を取り込む）
- IaCとデプロイが同じ属性を奪い合うと**巻き戻し事故**が起きる
- **`ignore_changes`** で「イメージはデプロイ、構成はIaC」と責務を分ける
- 破壊系は事前共有・承認、`plan` は必読、遅延は数十秒待つ

**関連:** [Terraform 基礎](/posts/iac-terraform-basics/) / [Terraform 実践](/posts/terraform-in-practice/)
