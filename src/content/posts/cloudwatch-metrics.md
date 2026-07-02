---
title: "CloudWatchでメトリクスを集める — 標準メトリクスとAgent"
date: 2026-07-02T12:00:00
summary: "自作OSSの「収集・保存」をCloudWatchがどう担うか。EC2は標準メトリクスを自動で送るが、メモリ/ディスクはOS内部なので取れない。そこをCloudWatch Agentで補う。名前空間・ディメンション・push型を押さえる。"
tags: ["監視", "AWS", "運用"]
level: intermediate
---

監視カリキュラム (5/9)。[前回](/posts/build-monitoring-oss/)は収集→保存→クエリ→可視化の4役を
Prometheus系で自作した。今回はその「収集・保存」を、AWSマネージドの **CloudWatch** がどう担うかを見る。
配属先で実際に使う収集の入口。ここから push 型の世界に入る。

## 標準メトリクスとその限界

EC2 は起動するだけで、一部のメトリクスを**自動でCloudWatchに送る**（標準メトリクス）。

- `AWS/EC2` という**名前空間**に、`CPUUtilization`・`NetworkIn/Out`・ディスクI/O などが入る
- ただし **メモリ使用率とディスク（ファイルシステム）使用率は含まれない**

なぜ無いのか——これらは **OS内部の値**だから。CloudWatch の標準メトリクスは AWS 基盤（ハイパーバイザ）
側から見える値で、**OSの中の「メモリが実際どれだけ使われているか」「/ が何%埋まっているか」までは覗けない**。

> ⚠️ [前に `free` / `df` で手で見た値](/posts/observe-server-by-hand/)は、まさにこの「OS内部」。だから
> CloudWatch でも標準では出てこない。「メモリのグラフが無い！」の理由はこれ。

## 名前空間とディメンション

CloudWatch のメトリクスは、名前空間とディメンションで整理されている。

| 用語 | 役割 | 例 |
| --- | --- | --- |
| 名前空間(namespace) | メトリクスの**大きな入れ物** | `AWS/EC2`、`CWAgent` |
| ディメンション(dimension) | **どれの値か**を絞るキー | `InstanceId=i-0abc...` |

- 同じ `CPUUtilization` でも、ディメンション `InstanceId` でインスタンスごとに分かれる
- 名前空間で「AWSの標準か／自分でAgentが送ったか」などが分かれる

> 💡 [Prometheus のラベル](/posts/metric-types-and-collection/)に近い。「メトリクス名＋どれの値か（ディメンション）」で
> 1本の時系列が定まる、という考え方は共通。

## CloudWatch Agent でOS内部を集める

標準で取れないメモリ/ディスクは、**CloudWatch Agent（統合エージェント）**をEC2に入れて送る。

```text
EC2
 ├─ 標準メトリクス（CPU/ネットワーク）→ AWS/EC2 名前空間（自動）
 └─ CloudWatch Agent → メモリ/ディスク等 → CWAgent 名前空間（カスタムメトリクス）
```

- Agent を入れて設定すると、`free` / `df` 相当の値が**カスタムメトリクス**としてグラフになる
- Agent が送る先は既定で `CWAgent` 名前空間、`InstanceId` などのディメンションが付く

> ⚠️ カスタムメトリクスは**課金対象**（量に応じて費用がかかる）。何でも送らず、必要なものに絞る。
> コストの話は Step 8 でまとめて扱う。

## OSSの4役との対応 — ただし向きは逆

[Step 3](/posts/build-monitoring-oss/)で自作した役と対応づけると腑に落ちる。

| OSS（自作） | CloudWatch |
| --- | --- |
| node-exporter ＋ scrape（収集） | CloudWatch Agent／標準メトリクス |
| Prometheus 時系列DB（保存） | CloudWatch メトリクス |

- ざっくり **CloudWatch Agent ≒ exporter＋scrape、CloudWatch本体 ≒ Prometheusの時系列DB**
- ただし収集方式は逆。Prometheus は [pull（取りに行く）](/posts/metric-types-and-collection/)、**CloudWatch は push（送る側が送る）**

## まとめ

- EC2 は標準メトリクスを**自動で送る**（`AWS/EC2` 名前空間・CPU/ネットワーク）
- **メモリ/ディスクはOS内部なので標準では取れない**。`free`/`df` で見た値がこれ
- **名前空間＝入れ物、ディメンション＝どれの値かの絞り**（例 `InstanceId`）
- OS内部の値は **CloudWatch Agent** で `CWAgent` 名前空間へ（カスタムメトリクス＝課金対象）
- 対応は **Agent≒exporter+scrape / CloudWatch≒時系列DB**、ただし **push型**（Prometheusのpullと逆）

**前:** [監視の4役を自作する](/posts/build-monitoring-oss/)　**次:** [CloudWatchで可視化する](/posts/cloudwatch-dashboards/)（Step 5・ダッシュボード）
