---
title: "Linux をちゃんと使う⑤ シェル環境とスクリプト"
date: 2026-06-22T15:00:00
summary: "環境変数と $PATH、.bashrc がいつ読まれるか、そして小さなシェルスクリプトの読み書き。コマンドを「並べて自動化する」入り口を押さえる。"
tags: ["Linux", "基礎"]
level: beginner
---

> 📚 シリーズ「Linux をちゃんと使う」(5 / 6)

毎回手で打つコマンドを、**環境にまとめる・自動化する**段へ。環境変数と `$PATH`、設定ファイルの
読まれ方、そして小さなシェルスクリプトの基本を押さえる。

## 環境変数の設定と参照

環境変数は「シェルやプログラムが参照する名前付きの値」。`export` で設定、`$名前` で参照する。

```bash
export GREETING="hello"     # 設定（export で子プロセスにも引き継がれる）
echo "$GREETING"            # 参照 → hello
echo "$HOME"                # 既定の変数（ホームディレクトリ）

GREETING="hi" ./app         # そのコマンドの間だけ一時的に渡す
```

> 🧭 アプリの設定を[環境変数で外から注入する](/posts/deploying-go-apps/)のは 12-factor の定番。
> Go の `os.Getenv("PORT")`、C# の `Environment.GetEnvironmentVariable("PORT")` で同じ値を読む。

## $PATH — コマンドが見つかる仕組み

`ls` と打つだけで動くのは、`$PATH` に並んだディレクトリを順に探して実行ファイルを見つけているから。

```bash
echo "$PATH"          # /usr/local/bin:/usr/bin:/bin ... のように : 区切り
which go               # go の実行ファイルがどこにあるか表示
export PATH="$HOME/bin:$PATH"   # 自前の bin を先頭に足す
```

> ⚠️ 「command not found」の多くは **`$PATH` にそのディレクトリが無い**だけ。`which` で在処を確認する。

## 設定ファイルはいつ読まれるか

`export` はそのシェルを閉じると消える。**毎回効かせたい設定は `.bashrc` などに書く**。

| ファイル | いつ読まれる |
| --- | --- |
| `~/.bashrc` | 対話シェルを開くたび（新しいターミナル/タブ） |
| `~/.bash_profile` / `~/.profile` | ログイン時 |

```bash
# ~/.bashrc に書いておくと毎回有効になる
export PATH="$HOME/bin:$PATH"
alias ll='ls -la'           # よく使うコマンドの別名
```

編集後は新しいターミナルを開くか、`source ~/.bashrc` で今のシェルに反映する。

## シェルスクリプトの読み書き

コマンドを並べてファイルにすれば、それがスクリプト。先頭に **シバン**（`#!`）で実行するシェルを書く。

```bash
#!/bin/bash
set -euo pipefail            # 失敗で即停止・未定義変数をエラーに（安全策）

NAME="${1:-world}"           # 第1引数。無ければ "world"
echo "deploying $NAME ..."

for env in staging prod; do  # ループ
  echo " - target: $env"
done

if [ -f "config.yml" ]; then # 条件分岐（ファイルがあれば）
  echo "config found"
fi
```

```bash
chmod +x deploy.sh    # 実行権を付けて
./deploy.sh prod      # 実行（$1 に prod が入る）
```

> 💡 `set -euo pipefail` は実務スクリプトのほぼ定番。エラーを握り潰さず、早めに止めて事故を防ぐ。

## まとめ

- 環境変数は **`export` で設定・`$名前` で参照**。アプリ設定の注入に使う
- **`$PATH`** はコマンドを探すディレクトリ列。「not found」は `which` で在処確認
- 毎回効かせたい設定は **`~/.bashrc`** に書く（編集後は `source` で反映）
- スクリプトは先頭に **シバン `#!/bin/bash`**、安全のため **`set -euo pipefail`**
- 引数 `$1`、`if`、`for` が使えれば小さな自動化はすぐ書ける

**← 前:** [④ プロセス・ログ・サービス管理](/posts/linux-process-and-services/)
**→ 次:** [⑥ SSH 接続と鍵認証](/posts/ssh-and-key-auth/)
