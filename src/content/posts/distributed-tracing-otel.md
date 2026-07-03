---
title: "分散トレーシング — OpenTelemetryとX-Rayで「どこで遅いか」を追う"
date: 2026-07-03T12:00:00
summary: "メトリクスは「APIが遅い」とは教えるが「どこで遅いか」は分からない。1リクエストが複数サービスをまたぐ経路を追うのがトレース。ベンダー非依存のOpenTelemetryで計装し、ADOTでX-Rayへ送る流れを押さえる。"
tags: ["監視", "AWS", "運用"]
level: intermediate
---

監視カリキュラム (8/9)。[前回](/posts/cloudwatch-logs/)まででメトリクスとログを扱った。だが
サービスが複数に分かれると「A→B→C のどこで遅い/失敗したか」は追いにくい。ここで **トレース**の出番。
計装は標準規格 **OpenTelemetry**、AWSでは **ADOT** で **X-Ray** に送る、という構成を押さえる。

## メトリクスでは「どこで」遅いか分からない

[三本柱](/posts/observability-basics/)の役割分担を思い出す。

- **メトリクス**: 「APIが遅い」と気づける（どれくらい）
- **ログ**: 「何が起きたか」の詳細
- **トレース**: A→B→C と内部を呼び合ううち、**どこで**時間がかかったか（経路）

メトリクスは「遅い」とは言うが「どこで」は教えてくれない。そこを埋めるのがトレース。

## トレースとスパン

トレースは入れ子の構造で1リクエストを表す。

| 用語 | 意味 |
| --- | --- |
| トレース(trace) | **1リクエスト全体**の記録（端から端まで） |
| スパン(span) | その中の**個々の処理**（1つのサービス呼び出しやDBクエリなど） |

```text
Trace: GET /order/42                 [============ 320ms ============]
  ├─ span: API handler               [== 20ms ==]
  ├─ span: call payment service         [====== 250ms ======]  ← ここが遅い
  └─ span: write DB                                    [== 40ms ==]
```

- スパンは**親子関係**を持ち、つなげると1リクエストの経路と各所の所要時間が見える
- 「決済サービスのスパンが250ms」→ **どこが遅いかが一目で特定**できる

## OpenTelemetry — ベンダー非依存の計装

トレースを取るにはアプリに**計装(instrumentation)**が要る。ここで標準規格の **OpenTelemetry(OTel)** を使う。

- **ベンダー非依存**: 計装は1回。送り先（X-Ray・CloudWatch・他社基盤）は後から選べる・変えられる
- サービスごとに独自SDKで計装するとバラバラになり、送り先を変えるたび作り直しになる。OTelはそれを防ぐ

```go
// OTel の計装イメージ：処理をスパンで囲む
ctx, span := tracer.Start(ctx, "call-payment")
defer span.End()
// ここで決済サービスを呼ぶ（このスパンに所要時間が乗る）
```

> 🧭 C#/.NET でも OpenTelemetry SDK（`System.Diagnostics.Activity` ベース）で計装でき、送り先に
> X-Ray を選べる。言語をまたいでも**同じ標準で計装**できるのが OTel の価値。

## ADOT で X-Ray へ送る

AWS でトレースを見るなら、集めたスパンを **X-Ray** に送る。その橋渡しが **ADOT（AWS Distro for OpenTelemetry）**。

```text
Goサービス(OTelで計装) → ADOT Collector → AWS X-Ray（ServiceLens のトレースマップ）
```

- X-Ray のトレースマップで **A→B→C** のスパンと所要時間を可視化できる
- ADOT は OTel のAWS向けディストリビューション。AWS外のシステムも含めて追える

## X-Ray SDK はメンテナンスモードへ

ここが**今から始めるなら重要**な点。従来の X-Ray 専用 SDK は役割を終えつつある。

- **X-Ray SDK／デーモンは 2026年2月25日にメンテナンスモード入り、2027年2月25日にサポート終了**（以後はセキュリティ修正のみ・新機能なし）
- AWS は計装の標準を **OpenTelemetry に移行**。新規は **OTel/ADOT ベースが推奨**
- ただし **X-Ray サービス自体は継続**（native な OTel 対応や CloudWatch Transaction Search も追加）。「送り先としての X-Ray」は現役

> ⚠️ 古い記事の「X-Ray SDK を直接使う」手順は真似しない。**最初から OpenTelemetry(ADOT)** で計装するのが、
> これから始める場合の正解。

## まとめ

- トレースは「**どこで**遅い/失敗したか」を埋める（メトリクス＝気づく、ログ＝何が、の続き）
- **トレース＝1リクエスト全体、スパン＝その中の個々の処理**（親子でつなぐ）
- 計装は**ベンダー非依存の OpenTelemetry**。1回計装すれば送り先を選べる
- AWSでは **ADOT** で **X-Ray** に送り、トレースマップで経路と所要時間を見る
- **X-Ray SDK はメンテナンスモード（2026/2）→ 新規は OTel/ADOT**。X-Ray サービス自体は継続

**前:** [CloudWatch Logsでログを集める](/posts/cloudwatch-logs/)　**次:** [SLOとエラーバジェット](/posts/slo-and-error-budget/)（Step 8・最終回）
