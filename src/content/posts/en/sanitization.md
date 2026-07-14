---
title: "Sanitization — How It Differs from Validation and Escaping, and When to Use Which"
date: 2026-07-14T16:00:00
summary: "'Just sanitize it' is a vague instruction. What it really means is separate techniques — validation (check and reject), escaping (neutralize for the output target), and parameterization (separate code from data) — chosen by context. Here's how to separate the terms, the 'validate input, escape output' principle, why escaping differs per output target, and where sanitization fits and its pitfalls."
tags: ["セキュリティ", "基礎"]
level: intermediate
lang: en
translationKey: sanitization
---

"Just sanitize the input" — you hear it a lot, but it's a **vague instruction**. What you should actually do is separate techniques:
**validation** (check and reject), **escaping** (neutralize for the output target), and **parameterization** (separate code from data) —
and **which you use depends on context**. This post sorts out that separation and the how-to-choose. It's the thinking behind the
individual attacks ([SQLi](/posts/sql-injection/), [XSS](/posts/xss-cross-site-scripting/), etc.).

## First, separate the terms

"Sanitization" tends to be used as a catch-all, but it splits into four things — with different aims and different timing.

| Term | What it does | When / where |
| --- | --- | --- |
| Validation | check whether it's as expected and **reject** if not (no modifying) | at the entrance (right after receiving) |
| Sanitization | **remove/convert** the dangerous parts into a harmless form | entrance to pre-save (context-dependent) |
| Escaping / output encoding | convert so it **isn't treated specially** by the output target's grammar | at the exit (right before use) |
| Parameterization | structurally **separate** code from data (SQL, etc.) | at the exit (when building the query) |

> ⭐ Validation **rejects**, sanitization **modifies and lets through**, escaping **passes as-is but neutralizes**.
> Conflate them and you get "I sanitized it but the attack still worked." Calling things with different aims by one word is the root of the confusion.

## The principle — validate input, escape output

The ironclad rule is **"validate input, escape output."**

- **Validate at the entrance**: reject the unexpected by type, length, format, range, and allowlist. This is the gatekeeper of "meaning is correct"
- **Escape at the exit**: neutralize the data **to match the grammar of where it's used**. Only once the place of use is decided can you neutralize correctly

> ⚠️ "Sanitize everything at the entrance and you're safe" is wrong. At the entrance you **don't yet know the final output target**.
> Neutralizing differs for HTML vs SQL, so a blanket transform at the entrance **fails to protect and corrupts the data too**.
> Neutralizing belongs "right before use, matched to where it's used."

## Escaping differs "per output target"

For the same input, both the dangerous characters and the way to neutralize them change with **where you output it**. So each target needs its own handling.

| Output target | Example danger | Correct handling |
| --- | --- | --- |
| HTML | `<script>` executes | context-aware [output escaping](/posts/xss-cross-site-scripting/) (+ CSP) |
| SQL | the query's meaning is rewritten | [parameterize with placeholders](/posts/sql-injection/) (no string concatenation) |
| Shell / OS command | arbitrary commands run | [don't build a command](/posts/command-injection/); pass args as an array |
| File path | another location gets read | [normalize the path and check it's inside the boundary](/posts/path-traversal/) |

> 🧭 Go's `html/template` **automatically switches context-aware escaping** by output target (HTML body / attribute / JS / URL).
> C#'s Razor also HTML-encodes by default. **Leaving it to context-aware templates and parameterization is safer and surer than sanitizing everything by hand.**

## Where sanitization (modify-to-neutralize) fits, and its pitfalls

So when do you use true sanitization — "modify to neutralize"? When **escaping isn't enough and you want to allow the structure itself**.

- The classic case is **rich text**. Allow users some HTML (bold, links) while dropping dangerous tags/attributes
- Do it with an **allowlist** (let through only what's known safe). Use a dedicated library; don't roll your own
- **Blacklists (strip the dangerous) are full of holes.** Nesting like `<scr<script>ipt>`, case, and encoding slip past

> ⚠️ Sanitization is a **last resort**, not the first choice. First ask "can validation reject it?" and "is escaping/parameterization enough?"
> Modifying destroys information and easily leaves loopholes. Watch out for **double-escaping** too (re-transforming already-neutralized data breaks the display).

## Summary

- "Sanitization" is a catch-all. The reality is separate techniques: **validation (reject) / sanitization (modify) / escaping (neutralize) / parameterization (separate)**
- The rule is **validate input, escape output**. A blanket entrance-sanitize can't protect (target unknown) and corrupts the data
- **Escaping differs per output target** — HTML, SQL, shell, path each have different dangers and handling. Match the context
- Leaving it to **context-aware templates / parameterization** is safer than hand sanitization
- Sanitization as modification fits limited cases like **allowing rich HTML**, done with an **allowlist + a dedicated library**. A roll-your-own blacklist is full of holes

**Related:** [SQL Injection](/posts/sql-injection/) / [XSS](/posts/xss-cross-site-scripting/) / [Command Injection](/posts/command-injection/) / [Path Traversal](/posts/path-traversal/)
