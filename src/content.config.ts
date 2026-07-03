import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// 記事は src/content/posts/*.md に置く。frontmatter のスキーマはここが唯一の真実源（SoT）。
// new-log スキルで記事を追加するときも、この形に合わせる。
const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    // 学んだ日付。一覧の並び順に使う
    date: z.coerce.date(),
    // 一覧カードや OG に出る一言要約
    summary: z.string(),
    // 分類タグ。例: ["並行処理", "標準ライブラリ"]
    tags: z.array(z.string()).default([]),
    // 難易度。遊び心としてカードにバッジ表示する
    level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
    // 下書きは一覧・本番ビルドから除外
    draft: z.boolean().default(false),
    // 記事の言語。未指定は日本語。英語版は "en" を指定し en/ 配下に置く
    lang: z.enum(["ja", "en"]).default("ja"),
    // ja/en の対訳を結ぶ共有キー（言語トグルの対訳先探索に使う）。未指定は slug と同じ扱い
    translationKey: z.string().optional(),
  }),
});

export const collections = { posts };
