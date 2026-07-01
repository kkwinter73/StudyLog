---
title: "監視の4役を自作する — Prometheus + node-exporter + Grafana"
date: 2026-07-01T23:00:00
summary: "収集→保存→クエリ→可視化という監視の中身を、一度だけ手で組んで体感する。Prometheus・node-exporter・Grafanaの3つを立てるだけ。これで後にCloudWatchが内部で何を肩代わりしているかが腑に落ちる。"
tags: ["監視", "運用"]
level: intermediate
---

監視カリキュラム (4/9)。[前編](/posts/what-to-measure-metrics/)・[後編](/posts/metric-types-and-collection/)で
「何を・どう測るか」を押さえた。今回は監視の中身＝**収集→保存→クエリ→可視化**を、一度だけ自分の手で
組んで体感する。狙いは CloudWatch をブラックボックスにしないこと。**ここは最小限。深入りしない。**

## 監視の4役

どんな監視基盤も、突き詰めるとこの4つの役割の組み合わせ。

| 役割 | やること | OSSの担当 |
| --- | --- | --- |
| 収集(scrape) | 各所から値を集める | node-exporter ＋ Prometheus |
| 保存 | 時系列DBに貯める | Prometheus |
| クエリ | 貯めた値を問い合わせる | PromQL |
| 可視化 | グラフ・ダッシュボード | Grafana |

- **node-exporter**: OSの値（CPU/メモリ/ディスク）をメトリクスとして公開する係
- **Prometheus**: それを[pull型で取りに行き](/posts/metric-types-and-collection/)、時系列DBに保存し、PromQLで問い合わせる
- **Grafana**: Prometheus に問い合わせて描画する

## 3つを立てる

最小の `docker-compose.yml` で3つだけ起動する。

```yaml
services:
  prometheus:
    image: prom/prometheus
    ports: ["9090:9090"]
    volumes: ["./prometheus.yml:/etc/prometheus/prometheus.yml"]
  node-exporter:
    image: prom/node-exporter
    ports: ["9100:9100"]
  grafana:
    image: grafana/grafana
    ports: ["3000:3000"]
```

- Prometheus は 9090、node-exporter は 9100、Grafana は 3000 で待ち受ける

## 収集を設定する

Prometheus に「どこを取りに行くか（ターゲット）」を教える。これが scrape 設定。

```yaml
# prometheus.yml
scrape_configs:
  - job_name: node
    static_configs:
      - targets: ['node-exporter:9100']
```

- `http://localhost:9090` の **Status → Targets** が `UP` になれば収集が動いている証拠
- 「取りに行けている＝相手が生きている」も同時に分かるのが pull 型の性質

## クエリと可視化

貯まった値を PromQL で問い合わせ、Grafana で描く。

```promql
# CPU(user)の使用率。カウンタなので rate で「秒あたり」に変換
rate(node_cpu_seconds_total{mode="user"}[1m])
```

- Prometheus の式入力欄でこれを打ち、[手で見たCPU](/posts/observe-server-by-hand/)と対応づける
- Grafana のデータソースに Prometheus（`http://prometheus:9090`）を追加し、CPU使用率のパネルを1枚だけ作る

> 💡 前回の「カウンタは rate で使う」がそのまま出てくる。`node_cpu_seconds_total` はカウンタなので、
> 生の値でなく `rate(...)` にして初めて「今どれだけ使っているか」になる。

## CloudWatch が何を肩代わりするか

ここで組んだ4役を、次のステップから CloudWatch がどう担うかを見ていく。対応はこう:

| OSS（今回） | CloudWatch（この先） |
| --- | --- |
| node-exporter ＋ scrape | CloudWatch Agent／標準メトリクス（**push**） |
| Prometheus 時系列DB | CloudWatch メトリクス |
| PromQL | メトリクス検索・metric math |
| Grafana | CloudWatch ダッシュボード |

> ⚠️ ここで作った環境は**このステップ限り**。Alertmanager や Loki 等のOSS構築には踏み込まない。
> 以降は CloudWatch に集中し、各機能を「この4役のどれか」に必ず紐づけて理解する。

## まとめ

- 監視は突き詰めると **収集・保存・クエリ・可視化** の4役
- 最小構成は **node-exporter（公開）＋ Prometheus（収集・保存・クエリ）＋ Grafana（可視化）**
- Prometheus は **pull 型**。Targets が `UP` なら収集できている＝相手が生きている
- カウンタは **rate** で「秒あたり」に変換して読む
- この4役を CloudWatch がどう肩代わりするかが、次からの軸。**深入りはしない**

**前:** [メトリクスの型と収集方式](/posts/metric-types-and-collection/)　**次:** CloudWatchでメトリクスを集める（Step 4）
