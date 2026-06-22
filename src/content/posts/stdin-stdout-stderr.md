---
title: "標準入力・標準出力・標準エラー出力の違い — 「聞いたことはある」を使えるに"
date: 2026-06-22T13:00:00
summary: "stdin / stdout / stderr の3つは何で、なぜ出力が2本に分かれているのか。リダイレクトとパイプ、Go での扱いまでつなげて、名前だけ知っている状態を実際に使えるに変える。"
tags: ["インフラ", "基礎"]
level: beginner
---

`stdin` / `stdout` / `stderr`。名前は見るが、なぜ出力が2本あるのか・どう使い分けるのかは曖昧になりがち。
ここでは3つの正体と、リダイレクト・パイプ、Go での扱いまでをつなげ、**「聞いたことはある」を「使える」に**変える。

## 3つの標準ストリーム

プログラムには、起動時に最初から開いている3本の通り道（ストリーム）がある。それぞれ番号（ファイルディスクリプタ）を持つ。

| 名前 | 番号 | 向き | 何に使う |
| --- | --- | --- | --- |
| 標準入力 `stdin` | 0 | 入力 | キーボードや前段コマンドからデータを受け取る |
| 標準出力 `stdout` | 1 | 出力 | 本来の処理結果（プログラムの「成果物」） |
| 標準エラー出力 `stderr` | 2 | 出力 | エラー・ログ・進捗など「成果物ではない」メッセージ |

> 💡 既定ではどれも端末（ターミナル）に繋がっている。だから普段は stdout も stderr も画面に混ざって出る。
> でも実体は**別々の通り道**なので、あとから個別に振り分けられる。

## なぜ出力が2本に分かれているのか

ポイントは **「処理結果」と「それ以外」を分けておくと、後段で扱いやすい**こと。
結果(stdout)だけを次のコマンドに渡し、ログ(stderr)は画面やファイルに逃がす、という使い分けができる。

```bash
# 成果物(stdout)だけを grep に流す。進捗やエラー(stderr)は画面に残る
./mytool | grep "OK"

# 結果はファイルへ、エラーは画面で見たい
./mytool > result.txt
```

もし結果とログを両方 stdout に混ぜると、`| grep` した時にログまで紛れ込んで使い物にならない。
**分離してあるから、パイプやリダイレクトで自在に振り分けられる**。

## リダイレクトとパイプ

シェルでは番号を使って出力先を付け替えられる。

```bash
./app > out.txt        # stdout(1) を out.txt へ
./app 2> err.txt       # stderr(2) を err.txt へ
./app > out.txt 2>&1   # stdout を out.txt へ、stderr も「stdout と同じ先」へ
./app 2>/dev/null      # エラーを捨てる（よく使う）
cat data | ./app       # 前段の stdout を ./app の stdin(0) へ流す（パイプ）
```

> ⚠️ `2>&1` は「2 を 1 と同じ先に」という意味で、**順序が効く**。`> out.txt 2>&1` と
> `2>&1 > out.txt` は結果が違う(前者は両方ファイル、後者は stderr が元の画面に残る)。

## Go での扱い

Go では3つが `os` パッケージの変数として用意されている。**結果は stdout、ログ・エラーは stderr** が定石。

```go
fmt.Println("結果です")                       // os.Stdout へ（成果物）
fmt.Fprintln(os.Stderr, "進捗: 処理中…")        // os.Stderr へ（ログ）

// log パッケージは既定で stderr に出る
log.Println("これは stderr に出る")

// stdin から1行読む
sc := bufio.NewScanner(os.Stdin)
sc.Scan()
line := sc.Text()
```

> 🧭 C#/.NET の `Console.WriteLine` が stdout、`Console.Error.WriteLine` が stderr、
> `Console.ReadLine` が stdin に対応。**Out / Error / In の3本立ては言語をまたいで共通**。

[Go アプリのインフラ入門](/posts/deploying-go-apps/)で触れた「ログは標準出力(系)に出し、基盤に拾わせる」
のも、この仕組みが土台。コンテナはアプリの stdout/stderr を集約してログにするのが作法だ。

## まとめ

- 起動時から **stdin(0) / stdout(1) / stderr(2)** の3本が開いている
- **stdout＝処理結果、stderr＝ログ・エラー**。分けておくと後段で振り分けやすい
- シェルの `>` `2>` `|` `2>&1` で出力先・入力元を自在に付け替えられる（`2>&1` は順序が効く）
- Go は `os.Stdout / os.Stderr / os.Stdin`。`log` は既定で stderr。結果は stdout に出す
- C# の `Console.Out / Error / In` と同じ三本立て。コンテナのログ集約もこの上に乗っている

次にやること: 手元のコマンドで `cmd > out.txt 2> err.txt` を試し、何が stdout で何が stderr か観察する。
