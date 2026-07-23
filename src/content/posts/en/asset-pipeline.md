---
title: "Intro to the Asset Pipeline — How the Code You Write Becomes Files You Can Serve"
date: 2026-07-23T10:00:00
summary: "JS, CSS, and images don't reach the browser as you wrote them. A walk through what each stage of the pipeline — transform, bundle, minify, fingerprint — actually solves."
tags: ["CICD", "デプロイ", "基礎"]
level: beginner
lang: en
translationKey: asset-pipeline
---

Frontend JS, CSS, and images don't reach the browser in the shape you wrote them.
They pass through a processing line — **transform → bundle → minify → fingerprint** — that reshapes them into
"a form convenient to serve." That line is the **asset pipeline**. Let's see what problem each stage solves.

## The big picture — the processing line from src/ to dist/

```text
src/ (easy for humans to write)                     dist/ (convenient for browsers & the network)

 main.ts     ── transform (transpile) ──┐
 style.scss  ── transform ──────────────┼── bundle ── minify ── fingerprint (hash) ──▶  app-3f9c2b.js
 logo.png    ── optimize ───────────────┘                                               style-8ad1e0.css
                                                                                        logo-77b1c4.png
```

The starting point is one fact: **the form that's easy to write** and **the form that's efficient to serve** are different things.
Browsers can't read TypeScript or SCSS directly, lots of small files means lots of requests,
and comments and whitespace are just wasted bytes. Bridging that gap is the pipeline's job,
and in practice it's a build tool: Vite, webpack, esbuild.

> 🧭 In C#, ASP.NET's bundling & minification plays the same role. The term "Asset Pipeline" itself comes from Rails.

## Transform — from easy-to-write to able-to-run

The first stage turns development-time languages and syntax into something the browser can execute.

| Input (what you write) | Output (what runs) | Name of the transform |
| --- | --- | --- |
| TypeScript | JavaScript | Transpile |
| SCSS / Sass | CSS | Preprocess |
| Modern JS syntax | JS that runs on older browsers | Transpile (down-leveling) |
| JSX / .vue / .astro | JS + HTML | Compile |

> 💡 Don't worry about the difference from "compilation." All of these are "source → runnable form" — they just emit different text, not machine code.

## Bundle and minify — fewer requests, fewer bytes

Transformed files, left as-is, cost one request per import and load slowly. So:

- **Bundle**: walk the import dependency graph and merge everything into a few files
- **Tree shaking**: drop code that is exported but **used by nothing**
- **Minify**: strip whitespace and comments, shorten variable names to one character — same behavior, fewer bytes

> ⚠️ Minify and gzip/brotli are different things. Minify shrinks *the code itself* at build time; gzip shrinks *the transfer* at serve time. Using both is normal.

Note that with HTTP/2 and later, multiplexing means "everything in one file" isn't always optimal —
**code splitting**, loading only what each screen needs, is also common.

## Fingerprinting — solving the cache problem with a name

This is the stage that pays off the most. Embed a hash of the file's content into its filename
(`app.js` → `app-3f9c2b.js`). This is called **fingerprinting**.

- The name contains a hash of the content → **if the content changes, the filename (URL) changes**
- So old URLs' caches never need invalidating. **The new HTML simply points at the new URL**
- As a result, assets can be served with `Cache-Control: max-age=31536000, immutable` (one year, never changes)

> ⭐ "If the content changes, the URL changes" — this one property makes the "when do we purge the cache?" problem disappear. Long-lived caching and instant updates coexist.

The mapping from original name to hashed name is the **manifest** (`manifest.json`).
HTML and templates look it up to emit `<script src="/assets/app-3f9c2b.js">`.
For serving, a [CDN](/en/posts/web-server-proxy-lb-cdn/) — a natural fit with [caching](/en/posts/caching-cache-aside/) — is the standard choice.

## Seen from a Go server

Go itself has no asset pipeline. The usual setup is to let the frontend build tool emit `dist/`
and have Go act purely as **the one that serves it**. For small setups you can embed it right into the binary.

```go
//go:embed dist
var assets embed.FS

func main() {
	sub, _ := fs.Sub(assets, "dist")
	http.Handle("/assets/", http.FileServer(http.FS(sub)))
}
```

To reference assets from templates, read the build's `manifest.json` at startup and expose the
`"main.js" → "app-3f9c2b.js"` mapping as a template function.
In CI, run "frontend build → Go build" in that order and ship both in a single
[deploy](/en/posts/cicd-github-actions/).

> 🧭 C# (ASP.NET Core)'s `asp-append-version="true"` appends `?v=<hash>` as a query string instead of renaming the file. Same idea either way: tie the URL to the content.

## Summary

- The asset pipeline is a processing line from "the form humans write" to "the form that's convenient to serve" — in practice, a build tool like Vite or webpack
- **Transform** makes it browser-readable; **bundle & minify** cut request counts and bytes
- **Fingerprinting** (content-hashed filenames) gives you long-lived caching *and* instant updates
- The original-name → hashed-name table is the **manifest**; servers and templates look it up to emit URLs
- Go has no pipeline of its own — it just serves. Embed with `go:embed` or put it on a CDN

**Next up**: build a small project with Vite and actually inspect the filenames and manifest in `dist/`.
