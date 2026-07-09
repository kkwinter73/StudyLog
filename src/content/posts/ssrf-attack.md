---
title: "SSRF — サーバに内部リソースを叩かせない"
date: 2026-07-09T11:30:00
summary: "URLを受け取ってサーバ側で取得する処理は、攻撃者が内部サービスやクラウドのメタデータエンドポイントへサーバを踏み台にできる穴になる。SSRFの仕組みと、宛先の検証・プライベート範囲の拒否・リダイレクト無効化という防御の原則、そしてGoでの実装を押さえる。"
tags: ["セキュリティ", "ネットワーク"]
level: intermediate
---

「URLを渡すとサーバがその中身を取ってくる」機能は便利だが、宛先を検証しないと
**攻撃者がサーバを踏み台にして内部リソースを叩ける**穴になる。これが SSRF
（Server-Side Request Forgery）。仕組みと防御の原則、Go での実装を順に見る。

## 攻撃の仕組み — 「取ってくる」を悪用する

画像プレビュー・Webhook・URLプレビュー・PDF生成など、**ユーザーが指定したURLを
サーバが取得する**機能はどこにでもある。攻撃者はここに外部サイトではなく
**内部だけに見えるアドレス**を渡す。

- `http://169.254.169.254/latest/meta-data/` — クラウド（AWS/GCP/Azure）の
  **メタデータエンドポイント**。放置すると一時認証情報（IAMロールのクレデンシャル）が漏れる
- `http://localhost:8080/admin` — サーバ自身で動く、外からは見えない管理用API
- `http://10.0.0.5/` — 同じVPC内の内部サービス・DB管理画面

```text
攻撃者 ──(url=http://169.254.169.254/...)──▶ あなたのサーバ
                                              │ サーバは「内部」から見える
                                              ▼
                                    169.254.169.254（メタデータ）
                                    → 認証情報を取得して攻撃者へ返す
```

> ⚠️ 怖いのは、サーバは**ネットワーク的に内部**にいること。ファイアウォールで外から
> ブロックしている内部サービスも、サーバ経由なら「内側からのアクセス」として通ってしまう。

## 対策の原則 — 宛先を疑う

SSRF の本質は「取得先の宛先を信用してしまう」こと。防御は宛先の側で固める。

| 原則 | やること |
| --- | --- |
| **宛先の許可リスト** | 取得を許すホスト/ドメインを列挙。原則これが最強 |
| **プライベート範囲の拒否** | `10./172.16./192.168.`・`127.`・リンクローカル `169.254.` を弾く |
| **リダイレクト禁止** | `http://ok.example/` が `169.254.169.254` へ302で飛ぶ回避を防ぐ |
| **メタデータの保護** | AWSなら **IMDSv2**（トークン必須）を強制。ホップ制限も下げる |

- 許可リストが引けるユースケース（決まったAPIしか叩かない等）なら、まず許可リスト。
  「なんでも取ってくる」機能でも、少なくとも**プライベート/リンクローカルは全拒否**する
- [command-injection](/posts/command-injection/) と同じで、根っこは
  **信頼できない入力をそのまま危険な操作に渡さない**こと

## Goでの防御 — 名前解決してからIPを弾く

素朴に `http.Get(userURL)` すると SSRF になる。ホスト名を**自分で名前解決し、
解決後のIPがプライベート範囲なら拒否**してから取得する。

```go
func validateAddr(host string) error {
	ips, err := net.LookupIP(host)
	if err != nil {
		return err
	}
	for _, ip := range ips {
		// ループバック・プライベート・リンクローカルを全拒否
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() {
			return fmt.Errorf("blocked address: %s", ip)
		}
	}
	return nil
}
```

- IPの範囲判定は標準の `net.IP` に揃える。CIDRを自前で扱うなら
  [IPアドレスとCIDR](/posts/ip-address-and-cidr/) の考え方で `net.ParseCIDR` を使う
- `169.254.169.254`（メタデータ）は `IsLinkLocalUnicast()` で弾ける

### リダイレクトとDNSリバインディングに注意

チェック後も油断できない。**リダイレクト**と**DNSリバインディング**で検証をすり抜けられる。

```go
client := &http.Client{
	// リダイレクトを一切追わない（追うなら飛び先を再検証）
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		return http.ErrUseLastResponse
	},
	Transport: &http.Transport{
		// 実際に接続するIPをここで再検証（DNSリバインディング対策）
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			host, _, _ := net.SplitHostPort(addr)
			if err := validateAddr(host); err != nil {
				return nil, err
			}
			return (&net.Dialer{}).DialContext(ctx, network, addr)
		},
	},
}
```

> ⚠️ **DNSリバインディング**: 検証の瞬間は正常なIPを返し、実接続の瞬間に
> `169.254.169.254` を返すDNS応答。だから「検証したホスト名」ではなく
> **実際に接続するIP**（`DialContext`）で弾くのが確実。

> 🧭 C# でも発想は同じ。`HttpClient` に許可リスト検証を挟み、
> `SocketsHttpHandler.AllowAutoRedirect = false` でリダイレクトを止める。
> フレームワークが変わっても「宛先を疑う」原則は不変。

## まとめ

- SSRF は「ユーザー指定URLをサーバが取得する」機能で、**サーバを踏み台に内部リソースを叩かれる**
- 最重要の標的は**クラウドのメタデータ `169.254.169.254`**・localhost・内部サービス
- 防御の原則は **許可リスト・プライベート/リンクローカル拒否・リダイレクト禁止・IMDSv2**
- Go では**名前解決したIPを検証**し、`DialContext` で**実接続IPを再検証**して DNSリバインディングを塞ぐ
- 根っこは他の入力系脆弱性と同じ——**信頼できない入力を無検証で危険な操作に渡さない**

**関連:** [コマンドインジェクション](/posts/command-injection/) / [内部リソースへの安全なアクセス](/posts/secure-access-private-resources/) / [IPアドレスとCIDR](/posts/ip-address-and-cidr/)
