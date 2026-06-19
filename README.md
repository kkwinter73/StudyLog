# StudyLog 📚 — Go を学ぶ記録

Go（Golang）を学んだことを書きためる勉強ログ。技術ブログ寄りで、ちょっと遊び心も。
[Astro](https://astro.build) 製の静的サイトで、記事は Markdown で管理する。

```
~/study/go $ go doc studylog
```

## 開発

```bash
npm install        # 初回のみ
npm run dev        # http://localhost:4321 でプレビュー（ホットリロード）
npm run build      # 本番ビルド → dist/
npm run preview    # ビルド結果をローカル確認
npm run check      # 型 + content schema の検証
```

必要環境: Node.js 18+（開発は Node 26 で確認）。

## 記事を書く

1. `src/content/posts/<slug>.md` を作る（1記事=1ファイル）。
2. frontmatter を付ける（必須: `title` / `date` / `summary`、任意: `tags` / `level` / `draft`）。

```markdown
---
title: "goroutine と channel ではじめる並行処理"
date: 2026-06-18
summary: "go ひとつで動く goroutine と、その間をつなぐ channel の基本。"
tags: ["並行処理", "基礎"]
level: beginner   # beginner | intermediate | advanced
---

本文（Markdown）...
```

Notion のメモから起こす場合は、Claude Code で **`/new-log`** を使うと整形して追加できる。
書き方の詳細は [.claude/rules/content.md](.claude/rules/content.md)。

## プロジェクト構成

```
src/
  content/posts/   記事(Markdown)。1記事=1ファイル
  content.config.ts frontmatter スキーマ（型の真実源）
  pages/           ルーティング（一覧 / 記事 / タグ / about / 404）
  layouts/         Base / Post レイアウト
  components/      Header / Footer / PostCard
  styles/global.css 配色・デザイン（Go cyan #00ADD8 が基調）
  site.ts          サイト設定（タイトル・ナビ・文言）
docs/              知識の置き場所（SoT 表・意思決定ログ・ハーネス解説）
.claude/           開発ハーネス（hooks / rules / skills / settings）
scripts/           decisions 索引の生成
```

## 開発環境について

このリポは「AIエージェント・ハーネスエンジニアリング」の原則を個人運用向けに簡略化して
取り入れている（必読の場所へルールをインライン＋hookで裏打ち、知識は1か所に薄く）。
仕組みは [docs/dev-environment/harness.md](docs/dev-environment/harness.md) を参照。
