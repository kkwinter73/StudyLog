---
id: 0002
date: 2026-06-19
status: accepted
---

# 0002. コンテンツは「都度 Markdown を整形」する運用にする

**決定**: Notion の Go 勉強ログは、自動連携で同期せず、**その都度 Markdown を受け取って
`new-log` スキルで整形・記事化する**運用にする。

## なぜ

- Notion の構造は学習メモごとにバラつきがあり、機械的同期だと体裁が崩れる。手で整える前提のほうが品質が安定する。
- 1記事ずつ「冒頭要約・まとめ・タグ・難易度」を付けて編集する余地を残したい。
- Notion API 連携の保守コストを負わない（個人運用・小規模）。

## 結果

- 記事追加の手順は `new-log` スキル（`.claude/skills/new-log/`）に集約。
- frontmatter スキーマの真実源は `src/content.config.ts`、書き方ルールは `.claude/rules/content.md`。
