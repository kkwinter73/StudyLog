---
name: new-log
description: Go 勉強ログの記事を、このブログの一貫した粒度・体裁で追加・公開する。次のどちらでも使う —— (A) ユーザーが「〜についてまとめて」とトピックだけ指定したとき（ゼロから入門記事を書く）、(B) Notion からの Markdown/テキストを渡されたとき（今の粒度に圧縮して記事化）。「記事にして」「まとめて」「new-log」「公開して」等が合図。
---

# new-log — 勉強ログを記事化して公開する

StudyLog ブログに記事を追加し、必要なら公開（push→自動デプロイ）するまでの手順。
**セッションや担当エージェントが変わっても、この手順と粒度を再現すること。**
記事の体裁ルールの真実源は [.claude/rules/content.md](../../rules/content.md)。まずそれに従う。

## 2つの入力モード

| モード | 合図 | やること |
| --- | --- | --- |
| **A. トピック指定** | 「〜についてまとめて」等、題材だけ渡される | そのテーマで**ゼロから入門記事を書く**。範囲が広い題材は**焦点を1つに絞る**（Go学習ブログ文脈で「まず押さえる所」に寄せる）。事実は正確に。 |
| **B. 素材あり** | Notion の Markdown/テキストを貼付 or `inbox/*.md` のパス | 素材を**今の粒度に圧縮**して記事化。冗長な検証ログ・重複は落とし、要点・コード例・つまずき所を残す。 |

どちらでも、**1記事=1トピック**。題材が広い／素材が複数トピックなら、**分割を提案**して
トピックごとに1記事ずつ作る（例: 過去の「アーキテクチャとテスト」は7記事に分割）。

## 粒度の基準（最重要・これを守る）

既存記事 `src/content/posts/*.md`（例: `goroutine-channel-basics.md`,
`deploying-go-apps.md`, `aws-basics-for-go.md`）が**正解の見本**。同じ粒度・体裁に揃える。

- 冒頭に**要約1〜2文**（何の話か）→ 本論 → 末尾に**「まとめ」箇条書き3〜5個**
- 見出しは `##` / `###`（`#` は使わない）。1記事あたり本文の節は **4〜6個** が目安
- コードブロックは**必ず言語指定**（```go / ```bash / ```dockerfile / ```json …）
- **要点は `>` 引用＋絵文字**（`💡` コツ / `⚠️` 注意 / `🧭` C#対応 / `⭐` 重要）
- 比較・対応は**表**にする
- ユーザーは **C#/.NET 経験者**。効く所で「C#ではこう、Goではこう」を `> 🧭` で1行添える
- 詰め込みすぎない。「濃い」と感じたら削るか分割する

## 手順

1. **既存タグを確認**（表記ゆれ防止。新語を増やす前に既存を優先）。
   ```bash
   grep -rh "^tags:" src/content/posts/ | sort -u
   ```
2. **slug を決める**。英小文字・ハイフン区切りの短い語。`ls src/content/posts/` で衝突確認。
3. **frontmatter を作る**（必須: title / date / summary、任意: tags / level / draft）。
   - `date`: **記事を一覧の先頭に出すため、既存の最新より新しい時刻**にする
     （同日でも `2026-06-19T22:00:00` のように**時刻**を付けて順序を安定させる。最新を1つ上に）。
   - `summary`: 一覧カードに出る1〜2文。`level`: 内容から推定（迷ったら beginner）。
4. **本文を書く／整形する**（上の「粒度の基準」に従う）。モードBでは Notion 由来のゴミ
   （空 callout・画像の絶対 URL・余分な改行）も掃除する。
5. **内部リンクは `/posts/<slug>/` `/tags/<tag>/` のルート絶対で書く**（base は自動付与される）。
   シリーズなら冒頭に `(n/総数)` 表示と、末尾に前後リンクを付ける。
6. **ファイルを書き出す**: `src/content/posts/<slug>.md`。
7. **検証**する（これが通るまで公開しない）。
   ```bash
   npm run check                       # 型 + frontmatter スキーマ
   npm run build 2>&1 | tail -5        # ビルド（リンク切れ等の最終確認）
   ```
8. 設計上の「あえての判断」が出たら、記事ではなく `docs/decisions/` に薄く1行で記録し
   `npm run decisions` で索引を再生成（[docs/README.md](../../../docs/README.md)）。

## 公開フロー（push→自動デプロイ）

ユーザーが公開を望んだら実行する（外部公開＝外向き操作なので、明示の合図を確認する）。

```bash
git add src/content/posts/<slug>.md          # 記事は内容ごとに分けて単独コミット
git commit -m "content: 「<タイトル>」を追加"   # 末尾に Co-Authored-By トレーラを付ける
git push
```

- push すると GitHub Actions（`.github/workflows/deploy.yml`）が自動でビルド・公開。
- 反映確認まで見届ける:
  ```bash
  rid=$(gh run list --workflow=deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')
  gh run watch "$rid" --exit-status
  curl -s -o /dev/null -w "%{http_code}\n" -L https://kkwinter73.github.io/StudyLog/posts/<slug>/
  ```
- 公開URL: https://kkwinter73.github.io/StudyLog/

## 品質チェックリスト

- [ ] 1記事1トピック（広い題材は焦点を絞る／素材が複数なら分割）
- [ ] 冒頭要約1〜2文＋末尾まとめ、節は4〜6個で詰め込みすぎない
- [ ] コードブロックすべてに言語指定、要点は `>` 引用＋絵文字
- [ ] 効く所に C#（🧭）対応を1行
- [ ] slug 自然、frontmatter 必須3項目、`date` は最新が先頭に来る時刻
- [ ] tags は既存と表記が揃っている
- [ ] `npm run check` と `npm run build` が通る
- [ ] （公開時）単独コミット→push→デプロイ成功と公開URLを確認
