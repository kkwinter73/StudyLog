---
title: "権限昇格とIDOR — 他人のIDで覗かせない"
date: 2026-07-09T14:30:00
summary: "ログインさえ通せば安心、ではない。URLのIDを1つずらすだけで他人のデータが見えてしまうIDORの仕組みと、サーバ側で「そのユーザがそのオブジェクトを触っていいか」を毎回確認する防御をGoで整理する。"
tags: ["セキュリティ", "アーキテクチャ"]
level: intermediate
---

`GET /orders/123` を `/orders/124` に変えたら他人の注文が見えてしまう——これが IDOR。
結論を先に言うと、**認証（ログイン済みか）だけでは足りず、オブジェクトごとに認可（このユーザが触っていいか）をサーバで毎回確認する**——ほとんどの対策はこの一文から導出できる。

## 攻撃の仕組み — 権限昇格の2方向

攻撃者が本来持たない権限を得ることを**権限昇格（privilege escalation）**と呼ぶ。方向が2つある。

| 種類 | 何が起きるか | 例 |
| --- | --- | --- |
| **水平（horizontal）** | 同じ権限レベルの**他人**のデータにアクセスする | 一般ユーザAが一般ユーザBの注文を見る |
| **垂直（vertical）** | 自分より**上の権限**の操作にアクセスする | 一般ユーザが管理者用の削除APIを叩く |

水平方向の代表格が **IDOR（Insecure Direct Object Reference / 安全でない直接オブジェクト参照）**。

```text
1. 攻撃者は自分の注文を開く      GET /orders/123   → 200 自分の注文
2. URLのIDを1つずらす           GET /orders/124   → 200 他人の注文 (!!)
```

なぜ通るのか。サーバが「ログイン済みか（authN）」だけを見て、「**その注文 124 がこのユーザのものか**（authZ）」を確認していないから。ID が連番で推測しやすいと、総当たりで全件抜かれる。

> ⚠️ 「認証したユーザだけが叩けるエンドポイント」は安全ではない。認証はドアを開けるだけ。
> **どの部屋に入っていいか**を部屋（オブジェクト）ごとに確認しないと、鍵を持った全員が全部屋に入れる。

## 対策の原則

- **すべてのオブジェクトアクセスをサーバで認可する**。「ログイン済みか」ではなく「**この人がこの1件を触っていいか**」を毎回。フロントで隠すのは対策ではない
- **デフォルト拒否（deny by default）**。明示的に許可された場合だけ通し、判定漏れは拒否に倒す
- **推測しにくい ID に頼りきらない**。UUID は総当たりを難しくするが、漏れた ID をそのまま使われたら防げない。ID の秘匿は認可の代わりにならない
- **最小権限（least privilege）**。ユーザにもトークンにも、必要な範囲だけを与える

> 🧭 C# 経験者向け: ASP.NET Core の**リソースベース認可**（`IAuthorizationService.AuthorizeAsync(user, resource, policy)`）がまさにこれ。ロール属性 `[Authorize(Roles=...)]` だけだと「ログイン済み」しか見ず IDOR は防げない、という整理は Go でも同じ。

## Goでの防御 — 所有権チェックをハンドラで強制する

一番効くのは、**取得クエリに所有者条件を混ぜる**こと。「ID で引いてから持ち主を確認」ではなく「**自分のもの**という条件で引く」。

```go
// NG: 認証だけ。IDが合えば他人の注文でも返す
func getOrder(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")
    row := db.QueryRow(`SELECT id, total FROM orders WHERE id = $1`, id)
    // ... 誰のものかを見ていない → IDOR
}

// OK: 所有権をクエリに混ぜる。他人のIDなら0件 = 404
func getOrder(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")
    uid := currentUserID(r.Context()) // 認証ミドルウェアが入れた本人のID

    var o Order
    err := db.QueryRow(
        `SELECT id, total FROM orders WHERE id = $1 AND owner_id = $2`,
        id, uid,
    ).Scan(&o.ID, &o.Total)
    if errors.Is(err, sql.ErrNoRows) {
        http.NotFound(w, r) // 存在有無を漏らさないなら 404（403でなく）
        return
    }
    // ...
}
```

`WHERE id = $1 AND owner_id = $2` にしておけば、他人の ID を渡されても結果は 0 件。**認可がクエリの一部**になっているので「チェックを忘れる」余地が減る。

> 💡 存在するのに「あなたのじゃない」と 403 を返すと、ID の存在自体が漏れる（列挙のヒントになる）。
> 見せたくないリソースは **404 で統一**すると情報を与えない。

## 垂直方向はミドルウェアでロールを見る

管理者操作のような**垂直方向**は、オブジェクト単位ではなくロールで弾く。ミドルウェアに切り出す。

```go
// ロールを要求するミドルウェア（deny by default）
func RequireRole(role string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            u := currentUser(r.Context())
            if u == nil || !u.HasRole(role) {
                http.Error(w, "forbidden", http.StatusForbidden)
                return // 明示的に許可されなければ通さない
            }
            next.ServeHTTP(w, r)
        })
    }
}

// 適用: 管理者ルートだけロールを要求
r.With(RequireRole("admin")).Delete("/orders/{id}", adminDeleteOrder)
```

「ログイン済みか」を見るだけのミドルウェアとの違いは明確で、**認証（誰か）と認可（何をしていいか）を別の層で確認**している。水平（所有権＝ハンドラ内クエリ）と垂直（ロール＝ミドルウェア）は役割が違うので、片方だけでは守れない。

境界の考え方は[認可の境界 — エッジで弾くかアプリで守るか](/posts/auth-boundary-edge-vs-app/)にも通じる。ロールのような粗い判定はエッジ寄りでも、**オブジェクト単位の所有権はアプリ内でしか正しく判定できない**。

## まとめ

- 権限昇格には**水平**（他人の同レベルデータ）と**垂直**（上位権限の操作）があり、IDOR は水平の代表
- IDOR の原因は**認証だけ見て、オブジェクトごとの認可を見ていない**こと。ID を推測しにくくするだけでは防げない
- 原則は **すべてのアクセスをサーバで認可・デフォルト拒否・最小権限**
- Go では取得クエリに `WHERE ... AND owner_id = $currentUser` を混ぜ、**所有権チェックをクエリの一部**にする。無ければ 404
- 垂直方向は**ロールをミドルウェア**で deny by default に弾く。水平と垂直は層が違う

**関連:** [認可の境界 — エッジで弾くかアプリで守るか](/posts/auth-boundary-edge-vs-app/) / [SQLインジェクション](/posts/sql-injection/) / [セッションハイジャックとセッション固定](/posts/session-hijacking-fixation/)
