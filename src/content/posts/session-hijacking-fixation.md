---
title: "セッションハイジャックと固定化 — Cookieを守り、ログイン時にIDを振り直す"
date: 2026-07-09T14:00:00
summary: "ログイン状態はセッションIDという1本の紐で保たれている。この紐を盗む「ハイジャック」と、攻撃者の知るIDを踏ませる「固定化」の違いを整理し、Cookieの守り方とログイン時のID振り直しをGoで実装する。"
tags: ["セキュリティ", "Go"]
level: intermediate
---

Webアプリのログイン状態は、たいてい**セッションID**という1本の紐で保たれている。
この紐を狙う2つの攻撃——**ハイジャック**（IDを盗む）と**固定化**（IDを踏ませる）——の
違いを押さえ、Cookieの守り方とログイン時のID振り直しをGoで実装する。

## 2つの攻撃 — 盗むか、踏ませるか

どちらも最終目的は「他人のセッションIDで正規ユーザーになりすます」こと。だが**IDを誰が用意するか**が逆になる。

| | セッションハイジャック | セッション固定化（fixation） |
| --- | --- | --- |
| **狙い** | 有効なIDを**盗む** | 攻撃者の**知っているID**を被害者に使わせる |
| **手口** | [XSS](/posts/xss-cross-site-scripting/)でCookie窃取・[盗聴](/posts/mitm-attack/)・IDの推測 | ログイン前にIDを固定させ、ログイン後に同じIDで乗る |
| **前提** | ログイン**後**のIDを入手する | ログイン**前**にIDを仕込んでおく |
| **決め手の対策** | Cookieを盗ませない・盗んでも使わせない | ログイン時にIDを**振り直す** |

固定化の流れはこうだ。攻撃者が自分で発行させたセッションID（例 `abc123`）を、URLパラメータや
細工したリンクで被害者のブラウザに握らせる。被害者はそのまま**ログインする**。サーバがIDを
変えなければ、`abc123` はログイン済みの紐になる。攻撃者は最初から `abc123` を知っているので、
そのまま正規ユーザーとして振る舞える。

> 💡 ハイジャックは「後から盗む」、固定化は「先に配る」。だから固定化はXSSも盗聴も要らず、
> **ログイン時にIDが変わらない**という一点だけを突いてくる。

## 対策の原則 — Cookieを守り、IDを使い捨てる

守りは「盗ませない」「盗まれても使えない」「踏まされても無効化する」の3層で考える。

- **Cookie属性を固める**: `HttpOnly`（JSから読めない＝XSSで盗めない）・`Secure`（HTTPSのみ送信）・
  `SameSite`（別サイトからの送信を制限し[CSRF](/posts/csrf-attack/)も抑える）
- **IDは高エントロピー**: 推測攻撃を潰すため、暗号論的乱数で十分長いIDを生成する（連番は論外）
- **ログイン・権限昇格でIDを振り直す**（regenerate）: これが**固定化の唯一かつ決定的な対策**。
  ログイン前のIDを捨て、新しいIDを発行すれば、攻撃者が仕込んだIDは無効になる
- **アイドル／絶対タイムアウト**: 無操作が続いたら失効（idle）、発行から一定時間で強制失効（absolute）。
  盗まれたIDの有効期間を縮める
- **常時HTTPS**: 盗聴によるID窃取を防ぐ。`Secure` 属性はHTTPSが前提

> ⚠️ IDの振り直しを忘れると、他のすべてを固めても固定化は通る。逆にCookie属性だけ完璧でも、
> ログイン前後で同じIDを使い回していれば穴は残る。**「守る」と「振り直す」はセットで効く**。

## Goでの防御 — Cookie属性と乱数ID

まずCookie属性。標準の `net/http` で3つのフラグを立てるだけだ。

```go
http.SetCookie(w, &http.Cookie{
    Name:     "session_id",
    Value:    sid,
    Path:     "/",
    HttpOnly: true,                    // JSから読めない（XSS対策）
    Secure:   true,                    // HTTPSでのみ送信
    SameSite: http.SameSiteLaxMode,    // 別サイトからの送信を制限
    MaxAge:   1800,                    // 絶対タイムアウト（秒）
})
```

セッションIDは `math/rand` ではなく **`crypto/rand`** で作る。予測不能であることが命なので、
暗号論的乱数以外は使わない。

```go
import (
    "crypto/rand"
    "encoding/base64"
)

func newSessionID() (string, error) {
    b := make([]byte, 32) // 256ビットの高エントロピー
    if _, err := rand.Read(b); err != nil {
        return "", err
    }
    return base64.RawURLEncoding.EncodeToString(b), nil
}
```

### ログイン時にIDを振り直す

固定化を潰す核心。**認証成功のたびに古いIDを捨て、新しいIDを発行する**。

```go
func login(w http.ResponseWriter, r *http.Request) {
    // ...パスワード検証が成功したあと...

    oldSID, _ := r.Cookie("session_id")
    if oldSID != nil {
        store.Delete(oldSID.Value) // 古いセッションを無効化
    }

    newSID, _ := newSessionID()    // 新しいIDを発行
    store.Save(newSID, userID)
    http.SetCookie(w, &http.Cookie{
        Name: "session_id", Value: newSID, Path: "/",
        HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode,
    })
}
```

`gorilla/sessions` を使う場合は、`session.Save()` 前に古いセッションを `Options.MaxAge = -1` で
失効させ、新しいセッションを保存すれば同じ効果になる（値をコピーして作り直すのが定石）。

> 🧭 C#では ASP.NET Core の Cookie 認証が `SignInAsync` でセッションを作り直し、
> `HttpOnly`・`Secure`・`SameSite` も既定で安全側に倒れている。Goでは同じことを**明示的に**書く。

## まとめ

- ハイジャックは**IDを盗む**、固定化は攻撃者の知る**IDを踏ませる**。目的は同じでも仕込む向きが逆
- Cookieは `HttpOnly` + `Secure` + `SameSite` で固め、IDは `crypto/rand` で高エントロピーにする
- **ログイン・権限昇格でIDを振り直す**のが固定化の決定的対策。守りと振り直しはセットで効く
- アイドル／絶対タイムアウトと常時HTTPSで、盗まれたIDの有効期間と経路を狭める
- Goでは属性・乱数・振り直しを明示的に書く。`gorilla/sessions` でも作り直しの発想は同じ

**関連:** [CSRF — 意図しないリクエストを踏ませる攻撃](/posts/csrf-attack/) / [XSS — クロスサイトスクリプティング](/posts/xss-cross-site-scripting/) / [中間者攻撃（MITM）](/posts/mitm-attack/)
