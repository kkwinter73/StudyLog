---
title: "パストラバーサル — ../ でファイルを抜かせない"
date: 2026-07-09T12:00:00
summary: "ユーザーが渡したパスに ../ を混ぜると、意図したディレクトリの外へ抜けて任意のファイルを読み書きされる。攻撃の仕組みを押さえ、Goの filepath.IsLocal や os.Root で「この基点の下から出さない」防御を組む。"
tags: ["セキュリティ", "Go"]
level: beginner
---

ファイル名やパスをユーザー入力から受け取るとき、`../` を混ぜられると意図したディレクトリの外へ
抜け出されてしまう——これがパストラバーサル。結論を先に言うと、**ユーザーのパスは信用せず、
正規化した結果が基点ディレクトリの下に収まっているかを必ず確認する**。

## 攻撃の仕組み — `../` でディレクトリを抜ける

たとえば `./uploads/` の下だけを見せるつもりで、ユーザーが指定したファイル名をそのまま連結すると
こうなる。

```text
基点:      /app/uploads/
入力:      report.pdf         → /app/uploads/report.pdf        ✅ 意図通り
悪意の入力: ../../etc/passwd   → /app/etc/passwd を経て解決 → /etc/passwd  ❌ 抜けた
```

`../` は「一つ上の階層」を意味するので、並べれば基点をいくらでも遡れる。読み取りなら
`/etc/passwd` やアプリの秘密ファイルが盗まれ、書き込みなら設定ファイルや `.ssh/authorized_keys` を
上書きされる。URLエンコード（`%2e%2e%2f`）や絶対パス（`/etc/passwd`）を混ぜる変種もある。

> ⚠️ 「拡張子をチェックしているから安全」は誤り。`../../etc/passwd` に拡張子は要らないし、
> `secret.pdf` を狙われれば拡張子チェックはすり抜ける。**問題はパスの中身ではなく、
> 到達先がどこか**。

## 対策の原則 — 入力ではなく「結果」を検証する

守りの発想は3つ。

- **ユーザーのパスを信用しない**: 受け取った文字列をそのまま `open` に渡さない。
- **正規化してから確認する**: `../` を解決した後の**絶対パス**を求め、それが基点ディレクトリの下に
  収まっているかを検証する。文字列に `..` が含まれるかを見るだけの検査は、エンコードや記号で
  かんたんに破られる。
- **できれば許可リスト**: 自由なパスを許さず、`{"report", "invoice"}` のような**既知の名前だけ**を
  受け付ける。列挙できるなら一番堅い。

> 🧭 C#/.NET でも定石は同じ。`Path.GetFullPath` で正規化し、結果が基点で始まるかを
> `StartsWith` で確かめる。「入力を弾く」より「解決後の到達先を確かめる」が本筋。

## Goでの防御（1）— 正規化してプレフィックス確認

古典的な方法は、`filepath.Clean` で `../` を畳んでから絶対パスに直し、基点の下かを確かめる。

```go
func safeJoin(base, userPath string) (string, error) {
	// base は事前に絶対パス化しておく
	full := filepath.Join(base, filepath.Clean("/"+userPath)) // 先頭に / を足して基点脱出を無効化
	if !strings.HasPrefix(full, base+string(os.PathSeparator)) {
		return "", errors.New("path escapes base directory")
	}
	return full, nil
}
```

- `filepath.Join` は結果を `Clean` するので `../` は畳まれるが、**畳んだ結果が base の外へ出る**
  ことは防げない。だから最後の `HasPrefix` 検証が要。
- ただしシンボリックリンク（baseの下のリンクが外を指す）はこの検査だけでは防げない。

Go 1.20 以降は判定を一段ラクにする `filepath.IsLocal` がある。**基点から出ず、絶対パスでもない**
パスかを一発で判定する。

```go
if !filepath.IsLocal(userPath) {
	return errors.New("not a local path") // ../ や /etc/... や C:\... を弾く
}
```

## Goでの防御（2）— os.Root で「基点の外を開けなくする」

Go 1.24 で入った `os.Root` は、**開いた時点でディレクトリに閉じ込める**仕組み。検査のし忘れを
仕組みで潰せるのが強い。

```go
root, err := os.OpenRoot("/app/uploads") // ここが「檻」になる
if err != nil {
	return err
}
defer root.Close()

f, err := root.Open(userPath) // ../ でも シンボリックリンクでも root の外へは出られない
```

`root.Open` / `root.Create` は、`../` はもちろん**外を指すシンボリックリンクも拒否**する。
自前のプレフィックス検査より漏れにくい。新規に書くなら第一候補。

| 手段 | Go バージョン | 守る範囲 |
| --- | --- | --- |
| `filepath.Clean` + プレフィックス確認 | 全バージョン | `../` は防げるが symlink は別途対処 |
| `filepath.IsLocal` | 1.20+ | 入力が基点内かの判定（開く前のバリデーション） |
| `os.Root` / `Root.Open` | 1.24+ | `../` も外向き symlink も物理的に遮断 |

> 💡 `http.FileServer` + `http.Dir` はよく使うが、`http.Dir` は `../` を防いでも
> **symlink 越えは防がない**。任意の base 下を配信するなら `os.Root` ベースの自前ハンドラか、
> 配信ディレクトリに外向きリンクを置かない運用が要る。

## まとめ

- パストラバーサルは `../` などで**意図したディレクトリの外**へ抜け、任意のファイルを読み書きさせる攻撃。
- 守りは「入力を弾く」ではなく、**正規化した到達先が基点の下か**を確認する。列挙できるなら許可リストが最強。
- Go では `filepath.Clean` + プレフィックス確認が基本、開く前判定に `filepath.IsLocal`（1.20+）。
- 新規なら `os.Root` / `Root.Open`（1.24+）で**基点の外を開けなくする**のが一番堅い（symlink 越えも遮断）。
- `http.Dir` は `../` は防ぐが symlink 越えは防がない点に注意。

**関連:** [コマンドインジェクション](/posts/command-injection/) / [SQLインジェクション](/posts/sql-injection/) / [Linuxのファイルシステムと権限](/posts/linux-filesystem-and-permissions/)
