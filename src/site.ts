// サイト全体の設定。文言やナビを変えたいときはここだけ触ればよい（設定値で吸収する原則）。
export const SITE = {
  title: "StudyLog",
  tagline: "Go を学ぶ記録",
  description:
    "Go（Golang）を学んだことを少しずつ書きためる勉強ログ。技術ブログでありつつ、ちょっと遊び心も。",
  author: "kkwinter73",
  // 画面右上などに出すターミナル風プロンプト（遊び心）
  prompt: "~/study/go",
  lang: "ja",
  nav: [
    { label: "Logs", href: "/" },
    { label: "Tags", href: "/tags/" },
    { label: "About", href: "/about/" },
  ],
} as const;

export const LEVELS = {
  beginner: { label: "beginner", emoji: "🌱" },
  intermediate: { label: "intermediate", emoji: "⚙️" },
  advanced: { label: "advanced", emoji: "🚀" },
} as const;

// 日本語混在を考慮したざっくり読了時間（文字数ベース・依存ゼロ）
export function readingTime(body: string | undefined): number {
  if (!body) return 1;
  const text = body.replace(/```[\s\S]*?```/g, "").replace(/\s+/g, "");
  const minutes = Math.ceil(text.length / 500); // 約500字/分
  return Math.max(1, minutes);
}

// 内部リンクに base パス（GitHub Pages の /StudyLog 等）を前置する。
// 例: withBase("/posts/foo/") → "/StudyLog/posts/foo/"
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, ""); // "/StudyLog"
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
