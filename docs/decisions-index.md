<!-- このファイルは自動生成です。手で編集しないでください。
     生成: node scripts/gen-decisions-index.mjs / 元データ: docs/decisions/*.md -->

# 意思決定インデックス

横断・恒久の「あえての判断」を薄く記録する。**コードやスキーマを見れば分かることは載せない**
（復元できない判断・"やらない"判断だけ）。詳細・根拠は各ファイル本文へ。

| 決定 | 要旨 | status |
| --- | --- | --- |
| [0001. ブログ基盤に Astro を採用する](decisions/0001-use-astro.md) | Go 勉強ログのブログ基盤に Astro（静的サイトジェネレータ） を採用する。 | accepted |
| [0002. コンテンツは「都度 Markdown を整形」する運用にする](decisions/0002-content-workflow.md) | Notion の Go 勉強ログは、自動連携で同期せず、その都度 Markdown を受け取って | accepted |

> 新しい決定を足すときは `docs/decisions/NNNN-xxxx.md` を1ファイル追加し、
> `node scripts/gen-decisions-index.mjs` を実行する（この索引は手編集しない）。
