---
title: "Path Traversal — Don't Let ../ Escape Your Directory"
date: 2026-07-09T12:00:00
summary: "Slip ../ into a user-supplied path and it escapes the intended directory to read or write arbitrary files. This post covers how the attack works and how to build a \"never leave this base\" defense in Go with filepath.IsLocal and os.Root."
tags: ["セキュリティ", "Go"]
level: beginner
lang: en
translationKey: path-traversal
---

When you take a filename or path from user input, an attacker can slip in `../` to climb out of the
directory you intended — that's path traversal. The conclusion up front: **never trust user paths;
canonicalize the result and confirm it stays under your base directory.**

## How the Attack Works — Climbing Out With `../`

Say you mean to serve only what's under `./uploads/`, but you just concatenate the user's filename:

```text
base:            /app/uploads/
input:           report.pdf         → /app/uploads/report.pdf        ✅ as intended
malicious input: ../../etc/passwd   → resolves via /app/etc/passwd → /etc/passwd  ❌ escaped
```

`../` means "one level up", so stacking them walks back past the base as far as you like. On reads
it leaks `/etc/passwd` or the app's secret files; on writes it can overwrite config files or
`.ssh/authorized_keys`. Variants sneak in URL-encoding (`%2e%2e%2f`) or absolute paths
(`/etc/passwd`).

> ⚠️ "We check the extension, so we're safe" is wrong. `../../etc/passwd` needs no extension, and if
> the target is `secret.pdf` the extension check waves it through. **The issue isn't the contents of
> the path — it's where it lands.**

## The Principle — Validate the *Result*, Not the Input

Three ideas guide the defense.

- **Don't trust the user's path**: never hand the received string straight to `open`.
- **Canonicalize, then confirm**: compute the **absolute path** after resolving `../`, and check that
  it stays under the base directory. Merely scanning the string for `..` is easily defeated by
  encoding or odd characters.
- **Prefer an allowlist**: instead of allowing free-form paths, accept only **known names** like
  `{"report", "invoice"}`. If you can enumerate them, that's the sturdiest option.

> 🧭 The playbook is the same in C#/.NET: canonicalize with `Path.GetFullPath`, then confirm the
> result starts with your base via `StartsWith`. The point is "confirm where it resolves to", not
> "reject the input".

## Defense in Go (1) — Canonicalize and Check the Prefix

The classic approach: fold `../` with `filepath.Clean`, resolve to an absolute path, and check it's
under the base.

```go
func safeJoin(base, userPath string) (string, error) {
	// base should be made absolute beforehand
	full := filepath.Join(base, filepath.Clean("/"+userPath)) // leading / neutralizes base escape
	if !strings.HasPrefix(full, base+string(os.PathSeparator)) {
		return "", errors.New("path escapes base directory")
	}
	return full, nil
}
```

- `filepath.Join` cleans its result, so `../` gets folded — but that doesn't stop the **folded result
  from landing outside base**. That's why the final `HasPrefix` check is required.
- This check alone still won't stop symlinks (a link under base pointing outside).

Since Go 1.20 there's `filepath.IsLocal`, which makes the judgment one step simpler: it decides in one
call whether a path **stays under the base and isn't absolute**.

```go
if !filepath.IsLocal(userPath) {
	return errors.New("not a local path") // rejects ../, /etc/..., C:\...
}
```

## Defense in Go (2) — Use os.Root So You *Can't* Open Outside the Base

`os.Root`, added in Go 1.24, **confines you to a directory the moment you open it**. Its strength is
that it closes the "forgot to check" gap structurally.

```go
root, err := os.OpenRoot("/app/uploads") // this becomes the "cage"
if err != nil {
	return err
}
defer root.Close()

f, err := root.Open(userPath) // neither ../ nor a symlink can leave root
```

`root.Open` / `root.Create` reject `../` and **also reject symlinks pointing outside**. Fewer leaks
than a hand-rolled prefix check. For new code, this is the first choice.

| Approach | Go version | What it protects |
| --- | --- | --- |
| `filepath.Clean` + prefix check | all versions | stops `../`, but symlinks need separate handling |
| `filepath.IsLocal` | 1.20+ | decides whether input stays in base (pre-open validation) |
| `os.Root` / `Root.Open` | 1.24+ | physically blocks both `../` and outward symlinks |

> 💡 `http.FileServer` + `http.Dir` is common, but `http.Dir` stops `../` yet **does not stop symlink
> escapes**. To serve under an arbitrary base, use an `os.Root`-based handler or an operational rule
> that no outward links live in the served directory.

## Summary

- Path traversal uses `../` (and friends) to escape the **intended directory** and read or write
  arbitrary files.
- The defense isn't "reject the input" — it's confirming the **canonicalized destination stays under
  the base**. If you can enumerate names, an allowlist is strongest.
- In Go, `filepath.Clean` + prefix check is the baseline, with `filepath.IsLocal` (1.20+) for
  pre-open validation.
- For new code, `os.Root` / `Root.Open` (1.24+) makes it **impossible to open outside the base**
  (blocking symlink escapes too) — the sturdiest option.
- Note that `http.Dir` stops `../` but not symlink escapes.

**Related:** [Command Injection](/en/posts/command-injection/) / [SQL Injection](/en/posts/sql-injection/) / [The Linux Filesystem and Permissions](/en/posts/linux-filesystem-and-permissions/)
