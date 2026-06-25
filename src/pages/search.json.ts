import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { LEVELS, formatDate, readingTime, withBase } from "../site";

// ビルド時に全記事（draft 除く）の検索インデックスを JSON で吐く。
// クライアントの /search/ がこれを取得して絞り込む（依存ゼロのクライアントサイド検索）。
export const GET: APIRoute = async () => {
  const posts = (await getCollection("posts", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

  const index = posts.map((p) => {
    const { title, summary, tags, level, date } = p.data;
    // 本文を素のテキストに（コードブロック・markdown 記号を落として全文検索用に）
    const body = (p.body ?? "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[#>*`_~|\-\[\]()!]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);

    return {
      title,
      summary,
      tags,
      url: withBase(`/posts/${p.id}/`),
      tagUrls: tags.map((t) => withBase(`/tags/${encodeURIComponent(t)}/`)),
      date: formatDate(date),
      level: LEVELS[level].label,
      emoji: LEVELS[level].emoji,
      mins: readingTime(p.body),
      body,
    };
  });

  return new Response(JSON.stringify(index), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
