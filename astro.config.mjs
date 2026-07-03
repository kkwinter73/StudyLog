// @ts-check
import { defineConfig } from "astro/config";

// GitHub Pages（プロジェクトページ）で公開するため base パスが必要。
// 公開URL: https://kkwinter73.github.io/StudyLog/
// 独自ドメインに変える場合は base を "/" に戻し、site をそのドメインにする。
const BASE = "/StudyLog";

// Markdown 本文の「/posts/...」のようなルート絶対リンクに base を前置する rehype プラグイン。
// 記事は base を意識せず "/posts/..." と書けるようにするための変換（依存ゼロで手書き）。
function rehypeBaseLinks() {
  const prefix = BASE.replace(/\/$/, "");
  if (!prefix) return () => () => {};
  /** @param {any} node */
  const walk = (node) => {
    if (
      node.type === "element" &&
      node.tagName === "a" &&
      node.properties &&
      typeof node.properties.href === "string"
    ) {
      const href = node.properties.href;
      const isInternalAbs =
        href.startsWith("/") &&
        !href.startsWith("//") &&
        href !== prefix &&
        !href.startsWith(prefix + "/");
      if (isInternalAbs) node.properties.href = prefix + href;
    }
    if (node.children) node.children.forEach(walk);
  };
  return () => (/** @type {any} */ tree) => walk(tree);
}

export default defineConfig({
  site: "https://kkwinter73.github.io",
  base: BASE,
  // 日本語は既定（ルート直下・URL不変）、英語は /en/ 配下。ページは手動で用意する。
  i18n: {
    locales: ["ja", "en"],
    defaultLocale: "ja",
    routing: { prefixDefaultLocale: false },
  },
  markdown: {
    rehypePlugins: [rehypeBaseLinks()],
    // 明/暗どちらでも崩れないよう dual theme。CSS 側で出し分ける（global.css 参照）
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark-dimmed",
      },
      wrap: true,
    },
  },
});
