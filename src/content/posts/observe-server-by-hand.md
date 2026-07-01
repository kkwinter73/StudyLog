---
title: "サーバーを手で観測する — OSが持つ生の数字を読む"
date: 2026-07-01T20:00:00
summary: "監視ツールが出す数字も、元をたどればOSとプロセスが持っている値。top・load average・free・df・ログを自分の手で読めるようにする。読めないものはダッシュボードに並んでいても読めない。"
tags: ["監視", "Linux", "基礎"]
level: beginner
---

監視カリキュラム (2/9)。[前回](/posts/observability-basics/)は全体像を掴んだ。今回はツールを入れる前に、
**サーバーの状態を自分の手で観測**する。CloudWatch が出す数字も元は OS が持つ値。まず生の値を
手で読めるようにする——読めないものは、ダッシュボードに並んでいても読めない。

## すべての数字は OS が持っている

監視基盤がやっているのは「OSやプロセスが持つ数字を、定期的に集めて記録・可視化する」こと。
だから出どころの生の値を読めることが土台になる。ここでは練習用の Linux で手を動かす前提で進める。

```bash
# 練習用の使い捨て環境の例
docker run -it --rm ubuntu bash
apt update && apt install -y procps stress   # ps/top/vmstat と負荷生成ツール
```

## CPU とロードアベレージ

まず `uptime` と `top`。ここで **CPU使用率とロードアベレージの違い**を押さえる。

```bash
uptime          # load average: 0.42, 0.35, 0.30 （1分/5分/15分の平均）
top             # CPU/メモリ/プロセス一覧（q で終了）
```

| 指標 | 何を表すか | 上限 |
| --- | --- | --- |
| CPU使用率(%) | ある瞬間、CPU時間をどれだけ使ったか | コア数×100% |
| ロードアベレージ | 実行中＋実行待ちのプロセス数の平均 | 上限なし |

- **CPU使用率**は「今どれだけ働いているか」。100%（1コア）で頭打ち
- **ロードアベレージ**は「どれだけ順番待ちが詰まっているか」。**コア数を超えたら処理が渋滞**している合図

> 💡 4コアなら load average 4.0 で「ちょうど満杯」。8.0 なら「捌ける倍の仕事が来て待たされている」。
> CPU% が 100% でも、load が低ければ渋滞はしていない。

## メモリ

`free -h` で、**used と buff/cache の違い**を読む。ここは誤解が多い。

```bash
free -h
#               total   used   free   shared  buff/cache   available
# Mem:           7.7Gi  2.1Gi  1.2Gi   100Mi      4.4Gi       5.2Gi
```

- **used**: プロセスが実際に使っているメモリ
- **buff/cache**: OSがディスク内容を**キャッシュに借りている**分。必要なら解放できる
- **available**: 実際にこれから使える見込み量。**空きの実力はここを見る**

> ⚠️ 「free が少ない！」で慌てない。buff/cache は借りているだけで、いざとなれば返る。
> 逼迫の判断は free でなく **available** を見る。仕組みは[物理メモリと仮想メモリ](/posts/physical-and-virtual-memory/)へ。

## ディスクとプロセス

```bash
df -h              # ファイルシステムごとの使用量（Use% が 100% に近いと危険）
ps aux | head      # プロセス一覧（%CPU・%MEM の高いものを探す）
vmstat 1 5         # 1秒間隔で5回。r（実行待ち）・si/so（スワップ）が要注意
```

- `df -h` は**ディスク逼迫**の確認。ログ肥大で `/` が満杯、はよくある障害
- `ps aux` で**犯人のプロセス**を特定。`vmstat` の `si/so`（スワップ発生）はメモリ不足の危険信号

負荷をかけて数字が動くのを体感しておく:

```bash
stress --cpu 1 --timeout 30s   # 別ターミナルの top でCPU%とloadが上がるのを見る
```

> 🧭 Windows のタスクマネージャや PerfMon で見ていた CPU/メモリ/ディスクを、Linux では
> これらのコマンドで読む。中身は同じ「OSが持つ数字」。

## ログを直接読む

数字だけでなく、出来事の記録＝ログも手で追えるようにする。

```bash
journalctl -f              # ログを追尾表示（systemd 環境）
tail -f /var/log/syslog    # ファイルを追尾（環境により）
journalctl -u nginx | grep error   # サービス単位＋語で絞る
```

- `-f`（follow）で流れるログを見ながら、別操作でイベントが出るのを観察する
- `grep` で語を絞る。詳しくは[プロセスとサービス](/posts/linux-process-and-services/)・[基本コマンド](/posts/linux-basic-commands/)へ

## まとめ

- 監視データの出どころは**OSとプロセスが持つ生の数字**。まず手で読めるようにする
- **CPU使用率＝今の働き**、**ロードアベレージ＝順番待ちの詰まり**（コア数超で渋滞）
- メモリ逼迫は free でなく **available** で判断。buff/cache は借りているだけ
- 「重い」と言われたらまず **top（CPU/load）・free（メモリ）・df（ディスク）** の3つ
- ログは `journalctl -f` / `tail -f` ＋ `grep` で追える

**前:** [監視と可観測性](/posts/observability-basics/)　**次:** 何を測るか（Step 2・4大シグナルとREDメソッド）
