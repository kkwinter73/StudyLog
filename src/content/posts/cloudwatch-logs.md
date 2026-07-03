---
title: "CloudWatch Logsでログを集める — 構造化ログとLogs Insights"
date: 2026-07-02T14:00:00
summary: "複数サービスのログを1か所に集めて横断検索する。散らばった足跡を追うには、まずログをJSONで構造化する。ロググループ/ログストリーム、Logs Insightsのクエリ、そしてメトリクスとログの使い分けを押さえる。"
tags: ["監視", "AWS", "運用"]
level: intermediate
---

監視カリキュラム (7/9)。[前回](/posts/cloudwatch-dashboards/)はメトリクスを可視化した。だが「エラー率が
上がった、で**何が**起きた？」はメトリクスでは分からない。ここで **ログ**の出番。複数サービスの
ログを1か所に集めて横断検索する **CloudWatch Logs** と、[三本柱](/posts/observability-basics/)の
メトリクスとログの使い分けを押さえる。

## ログが散らばる問題

サービスが複数になると、ログはあちこちに散る。

- どのサーバ・どのコンテナのログを見ればいいか分からない
- **1リクエストの足跡**が複数サービスに散らばり、追えない

だから各所のログを**1か所に集めて、まとめて検索**できる仕組みが要る。

## 構造化ログ(JSON)

集める前に、ログ自体を検索しやすい形にする。ただの文字列でなく **JSON（構造化ログ）**で出す。

```json
{"level":"ERROR","requestId":"abc-123","message":"payment failed","userId":42}
```

- 最低限、**リクエストID・ログレベル・メッセージ**のキーを持たせる
- キーで検索・集計できる。「`level=ERROR` だけ」「`requestId=abc-123` で串刺し」が一発

> 🧭 C# の Serilog や `ILogger` の構造化ログと同じ発想。文字列を `string.Format` で組むのでなく、
> **キー付きの値**で出すと、後段の検索・集計が段違いに楽になる。

## ロググループとログストリーム

CloudWatch Logs は2階層でログを持つ。

| 用語 | 役割 | 例 |
| --- | --- | --- |
| ロググループ | ログの**入れ物**（アプリ/用途ごと） | `/myapp/api` |
| ログストリーム | 1つの発生源の**連続した流れ** | あるコンテナ/インスタンスのログ |

- ロググループ = 「このアプリのログ全部」、ログストリーム = 「その中の、この1インスタンス分」
- CloudWatch Agent やアプリのSDKでここへ送る

## Logs Insights でクエリ

集めたログは **Logs Insights** で検索・集計する。クエリは **`|`（パイプ）でつなぐ**流れ。

```text
fields @timestamp, level, requestId, message
| filter level = "ERROR"          # まず絞る
| filter requestId = "abc-123"    # 特定リクエストで串刺し
| sort @timestamp desc
| limit 20
```

- `@timestamp` などの**システムフィールド**は自動で付く。JSONログのキーはそのまま条件に使える
- **`filter` は早めに**置く。先に絞るほど後段が速い
- 集計もできる: `stats count(*) by level` で「レベル別の件数」

> 💡 まず `level` で絞り、次に `requestId` で1リクエストを串刺しにする——これが散らばった足跡を
> 追う基本動作。構造化しておけば `filter requestId = ...` の一行で済む。

## メトリクスとログの使い分け

[前回のダッシュボード](/posts/cloudwatch-dashboards/)と組み合わせると、障害対応の流れが1本になる。

```text
1. メトリクスで気づく   ダッシュボードのエラー率が上がった（どれくらい）
2. 時間帯を特定         いつ上がったか
3. ログで何が           同じ時間帯を Logs Insights で絞る（何が起きた）
```

- **メトリクス**＝「異常に気づく・どれくらい」、**ログ**＝「何が起きたかの詳細」
- 「エラー率が上がった時間帯」→「その時間のERRORログ」へ、と往復する

## まとめ

- 複数サービスのログは**1か所に集めて横断検索**する（CloudWatch Logs）
- まず**構造化ログ(JSON)**にする。キーで検索・集計でき、`requestId` で串刺しできる
- **ロググループ＝入れ物、ログストリーム＝1発生源の流れ**
- **Logs Insights** は `fields | filter | stats` のパイプライン。**filter は早めに**
- 使い分けは**メトリクスで気づく→ログで何が**。時間帯で往復して原因に迫る

**前:** [CloudWatchで可視化する](/posts/cloudwatch-dashboards/)　**次:** [分散トレーシング](/posts/distributed-tracing-otel/)（Step 7・X-Ray / OpenTelemetry）
