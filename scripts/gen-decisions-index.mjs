#!/usr/bin/env node
// docs/decisions/*.md を束ねて docs/decisions-index.md を生成する。
// 「決定の1文＋リンク」だけの薄い索引を保つ（rationale は各ファイルに置く）。
// 使い方: node scripts/gen-decisions-index.mjs
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "docs", "decisions");

const files = (await readdir(dir)).filter((f) => /^\d+.*\.md$/.test(f)).sort();

const rows = [];
for (const f of files) {
  const src = await readFile(join(dir, f), "utf8");
  // 最初の見出し（# NNNN. タイトル）と **決定**: 行を拾う
  const title = (src.match(/^#\s+(.+)$/m)?.[1] ?? f).trim();
  const decision = (src.match(/\*\*決定\*\*\s*[:：]\s*(.+)$/m)?.[1] ?? "")
    .replace(/\*\*/g, "")
    .trim();
  const status = (src.match(/^status:\s*(.+)$/m)?.[1] ?? "").trim();
  rows.push(
    `| [${title}](decisions/${f}) | ${decision || "—"} | ${status || "—"} |`,
  );
}

const body = `<!-- このファイルは自動生成です。手で編集しないでください。
     生成: node scripts/gen-decisions-index.mjs / 元データ: docs/decisions/*.md -->

# 意思決定インデックス

横断・恒久の「あえての判断」を薄く記録する。**コードやスキーマを見れば分かることは載せない**
（復元できない判断・"やらない"判断だけ）。詳細・根拠は各ファイル本文へ。

| 決定 | 要旨 | status |
| --- | --- | --- |
${rows.join("\n")}

> 新しい決定を足すときは \`docs/decisions/NNNN-xxxx.md\` を1ファイル追加し、
> \`node scripts/gen-decisions-index.mjs\` を実行する（この索引は手編集しない）。
`;

await writeFile(join(root, "docs", "decisions-index.md"), body);
console.log(`generated docs/decisions-index.md (${rows.length} decisions)`);
