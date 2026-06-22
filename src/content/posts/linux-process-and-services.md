---
title: "Linux をちゃんと使う④ プロセス・ログ・サービス管理"
date: 2026-06-22T16:00:00
summary: "動いているプロセスを見て(ps/top)・止めて(kill)、ログを追い(tail -f/grep)、サービスを操る(systemctl)。サーバーで「今どうなっている？」に答えるための運用コマンドを束ねる。"
tags: ["Linux", "運用", "基礎"]
level: beginner
---

> 📚 シリーズ「Linux をちゃんと使う」(4 / 6)

サーバーで「アプリは動いてる？」「なぜ落ちた？」に答えるための運用コマンド。
**プロセスを見る・止める → ログを追う → サービスとして管理する**、の流れで押さえる。

## 動いているプロセスを見る

`ps aux` で全プロセスの一覧、`top`（or `htop`）でリアルタイムの負荷を見る。

```bash
ps aux | grep myapp     # myapp のプロセスを探す（PID が分かる）
top                     # CPU/メモリ使用率を動的に表示（q で終了）
```

`ps aux` の各行は `USER PID %CPU %MEM ... COMMAND`。**PID（プロセス番号）**が後で止めるときの鍵になる。

> 💡 各プロセスは[専用のメモリ空間を持つ独立した実行単位](/posts/process-vs-thread/)。`ps` はそれを一覧しているだけ。

## プロセスを止める — kill とシグナル

`kill` は「指定 PID に**シグナル（合図）を送る**」コマンド。いきなり強制終了ではない。

```bash
kill 1234        # 既定は SIGTERM（行儀よく終了して、の合図）
kill -9 1234     # SIGKILL（問答無用で強制終了。最終手段）
```

| シグナル | 番号 | 意味 |
| --- | --- | --- |
| SIGTERM | 15 | 「片付けて終わって」。アプリが後始末できる |
| SIGKILL | 9 | 「即終了」。後始末させない。最終手段 |

> 🧭 まず `kill`(TERM)で[グレースフルシャットダウン](/posts/deploying-go-apps/)を促し、応じなければ `-9`。
> Go や .NET のアプリは SIGTERM を受けて処理中リクエストを捌いてから終わるのが行儀のよい作法。

## ログを追う

止まった・遅い、の調査はログから。**「流れを追う」tail -f** と **「絞る」grep** の合わせ技。

```bash
tail -f /var/log/app.log              # 末尾をリアルタイム追尾（Ctrl+C で停止）
tail -n 100 /var/log/app.log          # 末尾100行だけ
grep -i "error" /var/log/app.log      # エラー行だけ抜く
tail -f app.log | grep --line-buffered "ERROR"   # 追尾しながらエラーだけ
```

> 💡 コンテナでは[ログを stdout/stderr に出す作法](/posts/stdin-stdout-stderr/)なので、ファイルではなく
> `docker logs -f <container>` で同じことをする。「末尾を追う」発想は共通。

## サービスとして管理する — systemctl

常駐アプリ（Webサーバー等）は **systemd** がサービスとして管理する。操作は `systemctl`。

```bash
systemctl status nginx     # 状態確認（動いてる？落ちてる？）
systemctl start nginx      # 起動
systemctl stop nginx       # 停止
systemctl restart nginx    # 再起動
systemctl enable nginx     # OS 起動時に自動起動する設定
```

- まず見るのは `status`。`active (running)` か、エラーで `failed` かが分かる
- `enable` は「次回起動時にも自動で立てる」設定（今すぐ起動の `start` とは別）

> 🧭 Windows のサービス管理（`services.msc` / `sc`）に当たるのが systemd / systemctl。
> 「サービスを登録して常駐させ、起動・停止・自動起動を管理する」役割が同じ。

## まとめ

- プロセスは **`ps aux`**（一覧）と **`top`**（リアルタイム負荷）で見る。鍵は **PID**
- `kill` は**シグナルを送る**。まず SIGTERM、効かなければ `kill -9`(SIGKILL)
- ログは **`tail -f`**(追尾) と **`grep`**(絞り込み) の合わせ技。コンテナは `docker logs -f`
- 常駐アプリは **`systemctl`** で status/start/stop/restart/enable。まず `status`
- `enable`(自動起動設定) と `start`(今すぐ起動) は別物

**← 前:** [③ ファイル配置とパーミッション](/posts/linux-filesystem-and-permissions/)
**→ 次:** [⑤ シェル環境とスクリプト](/posts/shell-env-and-scripting/)
