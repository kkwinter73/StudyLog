# docs — このプロジェクトの知識の置き場所

「何をどこに書くか」を決めておくための索引。迷ったらまずここを見る。

## タスク別エントリポイント（やりたいこと → 最初に見る場所）

| やりたいこと | 最初に見る場所 |
| --- | --- |
| 勉強ログを記事にする / Notion メモを整形する | `new-log` スキル（`.claude/skills/new-log/SKILL.md`） |
| 記事の書き方・frontmatter を確認する | [.claude/rules/content.md](../.claude/rules/content.md) ／ スキーマ定義は `src/content.config.ts` |
| ブログを開発・プレビューする | ルート [README.md](../README.md) の「開発」節 |
| 設計判断の "なぜ" を遡る | [decisions-index.md](./decisions-index.md) → `decisions/NNNN-*.md` |
| 開発環境（ハーネス）の仕組みを理解する | [dev-environment/harness.md](./dev-environment/harness.md) |
| サイトのタイトル・ナビ・文言を変える | `src/site.ts` |
| 見た目・配色を変える | `src/styles/global.css`（Goの cyan `#00ADD8` が基調） |

## 知識の種類 → 唯一の置き場所（SoT）

| 種類 | 置き場所 |
| --- | --- |
| 横断・恒久の "あえての判断" | `docs/decisions/NNNN-*.md`（＋自動生成の `decisions-index.md`） |
| 記事の書き方ルール | `.claude/rules/content.md` |
| frontmatter スキーマ | `src/content.config.ts`（型の真実源） |
| 記事そのもの | `src/content/posts/*.md`（1記事=1ファイル） |
| サイト設定（文言・ナビ） | `src/site.ts` |
| 進行中の TODO・アイデア | git の issue / コミット（散文メモは残さない） |

判定ルール：**コード・スキーマ・記事を見れば分かることは decisions に書かない**。
復元できない判断・"やらない"判断だけを薄く1行で残す。
