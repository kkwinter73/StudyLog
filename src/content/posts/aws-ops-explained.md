---
title: "AWSをちゃんと理解する⑥ イメージ管理と運用・監視"
date: 2026-06-20T01:00:00
summary: "コンテナイメージの保管庫(ECR)・監視とログ(CloudWatch)・コスト管理(Budgets)。①〜⑤を日々支える運用の足回りを理解し、シリーズ全体を1枚で振り返る。"
tags: ["AWS", "クラウド", "運用"]
level: beginner
---

> 📚 シリーズ「AWSをちゃんと理解する」(6 / 6・最終回)

最後は、ここまでの構成を **日々動かし続けるための足回り**。地味だが無いと運用が回らない。

## ECR ＝ コンテナイメージの保管庫

[②](/posts/aws-compute-explained/)で作ったコンテナイメージを、本番で動かすには
どこかに置いて取り出せる必要がある。その **イメージ専用の倉庫（レジストリ）** が **ECR**。
Docker Hub の AWS 版で、非公開で持てる。

```text
CI でビルド → ECR に push → ECS/Fargate が pull して起動
```

## CloudWatch ＝ システムを見る目

動かしたら「ちゃんと動いているか」を見る必要がある。**CloudWatch** がその目。

- **メトリクス**: CPU・メモリ・レイテンシなどの数値
- **Logs**: 各サービスのログを集約
- **アラーム**: 閾値を超えたら通知（例: エラー急増で Slack へ）
- **ダッシュボード**: 状態を1画面で俯瞰

> 💡 [インフラ入門](/posts/deploying-go-apps/)で「ログは標準出力に出す」と書いたのは、
> こうして CloudWatch Logs が拾って集約してくれるから。アプリは出すだけでよい。

## Budgets ＝ 使いすぎの見張り番

クラウドは従量課金なので、**止め忘れや想定外の課金**が起きやすい。**Budgets** で予算を決め、
超えそうになったらアラートを出す。学習・dev 環境ほど早めに入れておきたい。

## シリーズ全体を1枚で

①〜⑥がどう噛み合うかをまとめると ——

```text
[①ネットワーク] ユーザー → Route53 → CloudFront → ALB
                                                  │
[②コンピュート]                            ECS/Fargate（Service Connect）
                                                  │
[③データ]                          RDS / ElastiCache / S3 / DynamoDB
[④メッセージング]   非同期: SQS / SNS / EventBridge   メール: SES
[⑤セキュリティ]   IAM・Secrets/Parameter・SSM・KMS で全体を守る
[⑥運用]           ECR(イメージ) / CloudWatch(監視) / Budgets(コスト)
```

## まとめ

- ECR はコンテナイメージの保管庫。CI→ECR→ECS の流れで本番へ
- CloudWatch はメトリクス・ログ・アラームでシステムを監視する目
- アプリはログを標準出力に出すだけ。集約は CloudWatch Logs に任せる
- Budgets で予算アラートを張り、使いすぎを早期に検知する
- ①〜⑥は「入口 → 計算 → データ → 連携 → 防御 → 運用」で一つの構成になる

これで「AWSをちゃんと理解する」シリーズは完結。個々のサービス名も、
「何の問題を解くか」で見れば怖くないはず。

**← 前:** [⑤ セキュリティと設定管理](/posts/aws-security-config-explained/)
**↩ シリーズ最初へ:** [① ネットワークと配信](/posts/aws-networking-explained/)
