---
title: "CSRF — トークンとSameSite Cookieで防ぐ"
date: 2026-07-09T11:00:00
summary: "CSRF はログイン中の被害者の Cookie に「便乗」して、意図しないリクエストを送らせる攻撃。仕組みを XSS と対比して整理し、anti-CSRF トークン・SameSite Cookie・Origin 検証という対策の原則と、Go での書き方を押さえる。"
tags: ["セキュリティ", "Go"]
level: beginner
---

CSRF（Cross-Site Request Forgery）は、ログイン中の被害者のブラウザを使って
**本人が意図しないリクエストをサーバに送らせる**攻撃だ。仕組みと、トークン／SameSite Cookie
による防御の原則を、Go の実装とあわせて整理する。

## 攻撃の仕組み — Cookie への「便乗」

ブラウザは、あるサイト向けの Cookie を**そのサイト宛のリクエストなら自動で付ける**。
CSRF はこの自動送信に便乗する。被害者が銀行サイトにログイン済み（セッション Cookie を持つ）の状態で、
攻撃者のページを開くと——

```html
<!-- 攻撃者のサイトに仕込まれた罠。開いた瞬間に送信される -->
<form action="https://bank.example/transfer" method="POST" id="f">
  <input type="hidden" name="to" value="attacker">
  <input type="hidden" name="amount" value="100000">
</form>
<script>document.getElementById('f').submit()</script>
```

このフォームは `bank.example` 宛なので、ブラウザは**被害者のセッション Cookie を勝手に添えて**送る。
サーバから見ると正規のログインユーザーからのリクエストと区別がつかず、送金が通ってしまう。

> 💡 ポイントは「攻撃者は Cookie の中身を読めない」こと。読めないのに**使わせる**のが CSRF。
> だから防御は「Cookie 以外の何かで、本当に本人の操作か」を確かめる方向になる。

[XSS](/posts/xss-cross-site-scripting/) と混同しやすいが狙いが逆だ。

| | CSRF | XSS |
| --- | --- | --- |
| やること | 被害者に**意図しないリクエストを送らせる** | 被害者のブラウザで**任意のスクリプトを実行させる** |
| 信頼の悪用 | サーバが**ブラウザ（Cookie）を信頼**すること | ブラウザが**サーバの返す HTML を信頼**すること |
| 攻撃者は Cookie を | 読めない（使わせるだけ） | 読める（盗める） |

## 対策の原則 — Cookie 以外の証拠を要求する

CSRF が成立するのは「Cookie だけで本人と判断する」から。よって、Cookie とは別の証拠を足す。

- **anti-CSRF トークン（synchronizer token）**: サーバがセッションごとに秘密トークンを発行し、
  フォームの hidden 値として埋める。送信時に照合する。攻撃者のページはこのトークンを知らないので作れない
- **double-submit cookie**: トークンを Cookie とリクエスト値の両方に入れ、サーバは**両者の一致**を見る。
  サーバ側にセッション保存が要らない亜種
- **SameSite Cookie**: 「他サイト起点のリクエストには Cookie を付けない」とブラウザに指示する。
  便乗の経路そのものを塞ぐ
- **Origin / Referer の検証**: リクエストの `Origin` ヘッダが自サイトかを確認する（多層防御の一枚）

> ⚠️ トークンは GET では守れない。**状態を変える操作（POST/PUT/DELETE）に付ける**のが原則。
> 逆に GET で副作用を起こす設計（GET で削除など）をやめることも CSRF 対策になる。

## Go での防御

まず土台の SameSite。`http.Cookie` の `SameSite` フィールドで指定する。

```go
http.SetCookie(w, &http.Cookie{
    Name:     "session",
    Value:    sessionID,
    HttpOnly: true,                    // JS から読めない（XSS 対策と兼ねる）
    Secure:   true,                    // HTTPS のみ
    SameSite: http.SameSiteLaxMode,    // 他サイトの POST には Cookie を付けない
})
```

- `SameSiteStrictMode` は最も堅いが、外部リンクから来たときも Cookie が付かず「未ログイン扱い」になる
- `SameSiteLaxMode` は**トップレベル遷移の GET には付き、クロスサイトの POST には付かない**。
  実用上の既定として扱いやすい

SameSite は強力だが「ブラウザ任せ」なので、状態変更操作には synchronizer token も併用する。
手書きの骨組みはこうなる。

```go
// フォーム表示時: トークンを発行してセッションに保存し、hidden で埋める
token := randomToken()
session.Set("csrf", token)
// テンプレートで <input type="hidden" name="csrf_token" value="{{.Token}}">

// POST 受信時: セッションの値と突き合わせる（定数時間比較で）
func verifyCSRF(w http.ResponseWriter, r *http.Request, session Session) bool {
    got := r.FormValue("csrf_token")
    want, _ := session.Get("csrf")
    if subtle.ConstantTimeCompare([]byte(got), []byte(want)) != 1 {
        http.Error(w, "CSRF token mismatch", http.StatusForbidden)
        return false
    }
    return true
}
```

実務では自作せず、`gorilla/csrf` のようなミドルウェアを挟むのが定石。トークンの発行・検証・
テンプレートへの注入をまとめて面倒見てくれる。

```go
CSRF := csrf.Protect([]byte("32-byte-long-auth-key"))
http.ListenAndServe(":8000", CSRF(router))
// テンプレートには csrf.TemplateField(r) でフィールドを埋める
```

> 🧭 C#/.NET では ASP.NET Core の Anti-Forgery が同じ役目。`<form>` に自動で
> `__RequestVerificationToken` が入り、`[ValidateAntiForgeryToken]` で検証する。
> Go では「その自動化を自分でミドルウェアとして挟む」と考えるとギャップが埋まる。

## まとめ

- CSRF は**ログイン中の Cookie に便乗**して意図しないリクエストを送らせる。XSS とは狙いが逆
- 防御の原則は「**Cookie 以外の証拠**」——トークン照合、SameSite、Origin 検証
- Go はまず `http.Cookie{SameSite: http.SameSiteLaxMode}` で土台を作る
- 状態変更操作には synchronizer token を併用。自作せず `gorilla/csrf` を使うのが定石
- トークンは**状態を変える操作（POST/PUT/DELETE）に付ける**。GET に副作用を持たせない

**関連:** [XSS — クロスサイトスクリプティング](/posts/xss-cross-site-scripting/) / [セッションハイジャックと固定化](/posts/session-hijacking-fixation/) / [SQLインジェクション](/posts/sql-injection/)
