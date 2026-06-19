---
id: 0003
date: 2026-06-19
status: accepted
---

# 0003. GitHub Pages（プロジェクトページ）で公開し base パスを設定する

**決定**: `kkwinter73.github.io/StudyLog/` で公開するため、Astro に `base: "/StudyLog"` を設定し、
GitHub Actions（`withastro/action`）で `main` push 時に自動デプロイする。

## なぜ

- リポジトリ名が `StudyLog` のプロジェクトページなので、サイトはルートではなく `/StudyLog/` 配下に出る。base 設定が必須。
- base を入れると内部リンクが壊れる問題は、コンポーネントは `withBase()`、Markdown 本文は
  rehype プラグイン（astro.config.mjs）で `/posts/...` に自動前置して解決。記事は base を意識せず書ける。
- デプロイは公式 `withastro/action` + `actions/deploy-pages` に寄せ、保守を最小化。

## 結果・前提

- 独自ドメインをルートで使う場合は `base` を `"/"` に戻し `site` を変更する（→ rehype/withBase は no-op になる）。
- GitHub 側で Pages の Source = "GitHub Actions" が必要（CLI で有効化）。
