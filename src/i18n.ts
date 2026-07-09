// 言語切り替えの土台（SoT）。対応言語・URL変換・UI文言・記事の言語判定をここに集約する。
// 記事本文の翻訳は別途（frontmatter の lang / translationKey で紐づける）。
import { withBase } from "./site";
import type { CollectionEntry } from "astro:content";

export const LOCALES = ["ja", "en"] as const;
export type Lang = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Lang = "ja";
export const otherLang = (lang: Lang): Lang => (lang === "ja" ? "en" : "ja");

// ルート相対パス（base・locale prefix 無し）に locale prefix と base を付ける。
// 例: localizeHref("ja","/posts/x/") → "/StudyLog/posts/x/"
//     localizeHref("en","/posts/x/") → "/StudyLog/en/posts/x/"
export function localizeHref(lang: Lang, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return withBase(lang === "ja" ? p : `/en${p}`);
}

// 記事の言語（frontmatter 未指定は ja 扱い）
export const postLang = (post: CollectionEntry<"posts">): Lang =>
  ((post.data as { lang?: Lang }).lang ?? "ja");

// ja/en 共通の slug。translationKey 優先、無ければ id 先頭の "en/" を除去した値。
export const postSlug = (post: CollectionEntry<"posts">): string =>
  (post.data as { translationKey?: string }).translationKey ??
  post.id.replace(/^en\//, "");

// getCollection のフィルタ: draft 除外 ＋ 指定言語のみ
export const byLang =
  (lang: Lang) =>
  (entry: CollectionEntry<"posts">): boolean =>
    !entry.data.draft && postLang(entry) === lang;

// 言語つき日付整形
export function fmtDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: lang === "ja" ? "2-digit" : "short",
    day: "2-digit",
  }).format(date);
}

// UI文言。画面に出る短い語だけを持つ（記事本文は対象外）。
export const UI = {
  ja: {
    tagline: "Go を学ぶ記録",
    description:
      "Go（Golang）を学んだことを少しずつ書きためる勉強ログ。技術ブログでありつつ、ちょっと遊び心も。",
    heroCmd: "go doc studylog",
    logsLabel: "logs",
    searchPlaceholder: "grep…",
    searchEmpty: "ヒットなし",
    searchAria: "記事を検索",
    toggleTitle: "Switch to English",
    backToLogs: "← logs に戻る",
    logsNav: "← logs 一覧",
    tagsNav: "tags →",
    allTags: "← all tags",
    emptyLogs: "まだログがありません。`/new-log` で最初の記事を追加しよう。",
    emptyTags: "タグはまだありません。",
    newer: "← 新しい",
    older: "古い →",
  },
  en: {
    tagline: "Notes on learning Go",
    description:
      "A study log of learning Go (Golang), written little by little — a tech blog with a bit of playfulness.",
    heroCmd: "go doc studylog",
    logsLabel: "logs",
    searchPlaceholder: "grep…",
    searchEmpty: "No hits",
    searchAria: "Search posts",
    toggleTitle: "日本語に切り替え",
    backToLogs: "← back to logs",
    logsNav: "← logs",
    tagsNav: "tags →",
    allTags: "← all tags",
    emptyLogs: "No logs yet.",
    emptyTags: "No tags yet.",
    newer: "← newer",
    older: "older →",
  },
} as const;

// ナビ項目（ラベルは両言語共通、パスは locale で前置する）
export const NAV: ReadonlyArray<{ label: string; path: string }> = [
  { label: "Logs", path: "/" },
  { label: "Map", path: "/map/" },
  { label: "Tags", path: "/tags/" },
  { label: "About", path: "/about/" },
];
