---
name: new-log
description: Notion からエクスポート/ペーストした Go 勉強ログの Markdown を、このブログの記事に整形して src/content/posts/ に追加する。ユーザーが「この勉強ログを記事にして」「Notion のメモを整形して」「new-log」と言ったときに使う。
---

# new-log — 勉強ログを記事化する

Notion などにある Go の学習メモ（Markdown／プレーンテキスト）を、StudyLog ブログの
記事フォーマットに整えて追加するための手順。**コンテンツの規約は
[.claude/rules/content.md](../../rules/content.md) が真実源**。まずそれに従う。

## 入力の受け取り方

ユーザーは次のどれかで素材を渡す。状況に応じて確認する。
1. チャットに Markdown / テキストを直接ペースト
2. リポジトリ内に置いた一時ファイル（例: `inbox/*.md`）のパス
3. 1記事分か、複数トピックまとめてか（複数なら**トピック単位で1記事ずつ**に分割提案）

## 手順

1. **既存タグを確認**する（表記ゆれ防止）。
   ```bash
   grep -rh "^tags:" src/content/posts/ | sort -u
   ```
2. **slug を決める**。英小文字・ハイフン区切り、内容を表す短い語。
   既存と衝突しないか `ls src/content/posts/` で確認。
3. **frontmatter を作る**（必須: title / date / summary、任意: tags / level / draft）。
   - `date` は学習日が分かればそれ、不明なら今日の日付。
   - `summary` は一覧カードに出る1〜2文。内容から要約して書く。
   - `level` は内容の難易度から推定（迷ったら beginner）。
4. **本文を整形**する（Notion 由来の崩れを直す）。
   - 見出しレベルを `##` / `###` に整える（`#` は使わない）。
   - コードブロックに**言語指定**を付ける（Go なら ```go）。
   - Notion 特有のゴミ（空 callout、画像の絶対 URL、コピー時の余分な改行）を掃除。
   - 冒頭に要約1〜2文、末尾に「まとめ」の箇条書きを付ける（無ければ内容から作る）。
   - 要点は `>` 引用＋絵文字、比較は表に。
5. **ファイルを書き出す**: `src/content/posts/<slug>.md`。
6. **検証**する。
   ```bash
   npm run check   # 型 + content schema（frontmatter）の検証
   ```
   - 必要なら `npm run dev` でローカルプレビューを案内（http://localhost:4321）。
7. 設計に関わる「あえての判断」が出てきたら、記事本文ではなく
   `docs/decisions/` に薄く1行で記録する（[docs/README.md](../../../docs/README.md)）。

## 品質チェックリスト

- [ ] slug が英小文字ハイフン、URL が自然
- [ ] frontmatter 必須3項目が揃い、level が許可値
- [ ] tags は既存と表記が揃っている
- [ ] コードブロックすべてに言語指定
- [ ] 冒頭要約と末尾まとめがある
- [ ] `npm run check` が通る

> 💡 元メモが長い・複数トピックなら、1記事に詰め込まず分割する。
> 「1記事1トピック」のほうが後から探しやすく、タグも効く。
