# CLAUDE.md — StudyLog

Go（Golang）の勉強ログを、技術ブログ寄りで遊び心もある **Astro** 製サイトにまとめるリポジトリ。
このファイルは毎セッション必ず読まれる前提で、ここだけで作業が回るよう自己完結させている。

## 最重要ルール（ここはインライン。リンク先に逃がさない）

1. **生成物を編集しない**。`dist/` と `.astro/` はビルドで再生成される。元の `src/` を直す。
   （`guard-generated` hook が物理的に止める）
2. **記事は1記事=1ファイル**で `src/content/posts/<slug>.md` に置く。frontmatter 必須は
   `title` / `date` / `summary`。スキーマの真実源は `src/content.config.ts`。
3. **設計上の "あえての判断" は記事ではなく `docs/decisions/` に薄く1行**で残す。
   コード・スキーマ・記事を見れば分かることは書かない。
4. **コミット/プッシュはユーザーに言われたときだけ**。勝手に push しない。

## このプロジェクトでやること

Go の学習を、一貫した粒度・体裁の記事にして公開する。**記事化の依頼が来たら必ず
`new-log` スキル（`.claude/skills/new-log/SKILL.md`）に従う**。合図は2系統あり、どちらも同じ手順:

- **「〜についてまとめて」**（題材だけ指定）→ ゼロから入門記事を書く（広い題材は焦点を絞る）
- **Notion の Markdown/テキストを渡される** → 今の粒度に圧縮して記事化

粒度は既存記事 `src/content/posts/*.md` が見本。**1記事1トピック**、濃い／複数トピックなら分割。
書き方ルールの真実源は `.claude/rules/content.md`。公開は push → GitHub Actions が自動デプロイ
（手順は new-log スキルの「公開フロー」）。

## タスク種別 → 参照する場所

| やること | 見る場所 |
| --- | --- |
| 勉強ログを記事にする | `.claude/skills/new-log/SKILL.md` |
| 記事の書き方・frontmatter | `.claude/rules/content.md` ／ `src/content.config.ts` |
| 知識をどこに書くか迷う | `docs/README.md`（SoT 表・エントリポイント） |
| 設計判断の "なぜ" | `docs/decisions-index.md` |
| ハーネス（hook等）の仕組み | `docs/dev-environment/harness.md` |
| 配色・デザイン | `src/styles/global.css` ／ 文言は `src/site.ts` |

## 開発コマンド

```bash
npm run dev        # ローカルプレビュー http://localhost:4321/StudyLog/ (base付き)
npm run build      # 本番ビルド（dist/）
npm run check      # 型 + content schema 検証（コミット前に）
npm run decisions  # docs/decisions-index.md を再生成（決定を足したら実行）
```

## ガード（hook）の挙動

- **PreToolUse**: 生成物（dist/・.astro/）への書き込みを拒否（block）。
- **PostToolUse**: 記事の frontmatter 不足を通知（reminder、止めない）。
- **Stop**: `src` に変更があれば `astro check` をフル実行（再発火・環境差・無変更ではスキップ）。

詳細と設計理由は `docs/dev-environment/harness.md`。
