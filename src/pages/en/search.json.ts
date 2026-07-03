import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { LEVELS, readingTime } from "../../site";
import { byLang, fmtDate, localizeHref, postSlug } from "../../i18n";

// 英語記事（draft 除く）の検索インデックス。/en/search.json に出る。
export const GET: APIRoute = async () => {
  const posts = (await getCollection("posts", byLang("en"))).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

  const index = posts.map((p) => {
    const { title, summary, tags, level, date } = p.data;
    const slug = postSlug(p);
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
      url: localizeHref("en", `/posts/${slug}/`),
      tagUrls: tags.map((t) => localizeHref("en", `/tags/${encodeURIComponent(t)}/`)),
      date: fmtDate(date, "en"),
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
