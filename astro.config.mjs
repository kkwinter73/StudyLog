// @ts-check
import { defineConfig } from "astro/config";

// 公開先が決まったら site を実URLに更新する（RSS/sitemap/OGの絶対URLに使う）
export default defineConfig({
  site: "https://example.com",
  markdown: {
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
