---
title: "Docker を手で動かす② 日常のコマンドとよく使うフラグ"
date: 2026-07-09T22:30:00
summary: "docker run の主要フラグ(-d/-p/-e/-v/--name/--rm/-it)を軸に、イメージ取得・起動・一覧/停止・中に入る・後片付けまで、毎日使うコマンドを一通り手になじませる。"
tags: ["コンテナ", "基礎"]
level: beginner
---

> 📚 シリーズ「Docker を手で動かす」(2 / 3)

[全体像](/posts/docker-big-picture/)が掴めたら、次は手を動かす番。
毎日使うのは実は10個ほどのコマンドで、山場は **`docker run` のフラグ**。ここを押さえれば大半は回る。

## イメージを取ってくる・見る

起動する前に、まず材料であるイメージを用意する。

```bash
docker pull nginx:1.27     # レジストリからイメージを取得（タグでバージョン指定）
docker images              # 手元にあるイメージ一覧
```

> 💡 タグ（`:1.27`）を省くと `:latest` になる。本番では **latest を避けて固定**するのが鉄則。
> どれが動いているか後から分からなくなる。

## コンテナを起動する — `docker run` と主要フラグ

`docker run` はフラグが主役。よく使うのはこれだけ。

| フラグ | 意味 | 例 |
| --- | --- | --- |
| `-d` | バックグラウンドで動かす（detached） | `-d` |
| `-p` | ホストのポートをコンテナへ転送 | `-p 8080:80` |
| `-e` | 環境変数を渡す | `-e TZ=Asia/Tokyo` |
| `-v` | ボリューム/ディレクトリをマウント | `-v data:/var/lib` |
| `--name` | コンテナに名前を付ける | `--name web` |
| `--rm` | 停止したら自動で削除 | `--rm` |
| `-it` | 端末をつないで対話的に | `-it` |

```bash
docker run -d --name web -p 8080:80 nginx:1.27
# → http://localhost:8080 でつながる
```

> ⚠️ `-p 8080:80` は **左がホスト・右がコンテナ**。逆に覚えると「つながらない」で必ず詰まる。
> ポート転送の仕組みは[コンテナの通信](/posts/container-network-and-data/)を参照。

## 動いているものを見る・止める

起動したら、状態確認と後始末。

```bash
docker ps            # 動いているコンテナ一覧
docker ps -a         # 停止済みも含めて全部
docker logs web      # そのコンテナの標準出力/エラーを見る
docker logs -f web   # -f で追従（tail -f 相当）
docker stop web      # 止める（SIGTERM → 猶予後 SIGKILL）
docker rm web        # 止めたコンテナを削除
```

> 💡 ログはアプリの[標準出力/標準エラー](/posts/stdin-stdout-stderr/)を Docker が拾っている。
> だからコンテナ内アプリは**ファイルではなく標準出力にログを出す**のが定石。

## コンテナの中に入って作業する

「中がどうなってるか」を見たい時は `exec` でシェルを起動する。

```bash
docker exec -it web bash     # 動いてるコンテナに入る（alpine なら sh）
docker exec web env          # 入らず1コマンドだけ実行することも可
```

`run` と `exec` は別物。**`run` は新しいコンテナを作る／`exec` は既に動いているコンテナに入る**。

## 後片付け（ディスクを食い潰さない）

イメージとコンテナは放っておくと溜まる。定期的に掃除する。

```bash
docker rm $(docker ps -aq)   # 停止コンテナを一括削除
docker rmi nginx:1.27        # イメージを削除
docker system prune          # 未使用のコンテナ/イメージ/ネットワークをまとめて掃除
docker system df             # 何がどれだけ容量を食っているか
```

> ⚠️ `prune` は未使用リソースを消す。`-a` を付けると使っていないイメージも全部消えるので、
> CI や共有マシンでは影響範囲を確認してから。

## まとめ

- 材料をそろえる: `pull` で取得、`images` で確認。**タグは固定**して latest を避ける
- 起動の山場は `docker run` のフラグ: **`-d`/`-p`/`-e`/`-v`/`--name`/`--rm`/`-it`**
- `-p` は **ホスト:コンテナ** の順。ここの取り違えが不通の定番原因
- 見る・止める: `ps` / `ps -a` / `logs [-f]` / `stop` / `rm`
- 中に入るのは `exec -it ... bash`。**run は新規作成・exec は既存に入る**
- ディスク対策に `system prune` / `system df` を習慣化する

**← 前:** [① 全体像](/posts/docker-big-picture/)
**→ 次:** [③ 詰まった時のデバッグ](/posts/docker-troubleshooting/)
