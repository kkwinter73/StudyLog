---
title: "Dependency Vulnerabilities — Closing Known CVEs With govulncheck"
date: 2026-07-09T19:30:00
summary: "The cheapest way in for an attacker is exploiting an already-published vulnerability (a CVE) in an outdated library you depend on. This post covers how CVE/CVSS/advisories work, and how Go's govulncheck reports only the vulnerabilities your code actually calls — cutting the noise."
tags: ["セキュリティ", "Go", "CICD"]
level: beginner
lang: en
translationKey: dependency-vulnerabilities
---

Even if your own code is spotless, if a library you depend on has an **already-published vulnerability**, that's where you get breached. For an attacker this is the cheapest way in — the vulnerability is public, and targets are everywhere. This post is about how those "known CVEs" work and how to close them in Go with `govulncheck`.

## How the Attack Works — Sweeping for Public Holes

Finding a zero-day (an unknown hole) yourself is expensive. Most attackers take the easy road: **they try already-published vulnerabilities against every service that hasn't patched yet.**

- A **CVE** (Common Vulnerabilities and Exposures) is a globally shared ID assigned to each vulnerability (e.g. `CVE-2023-12345`). "Which library, which version is affected" is tied to it
- **CVSS** is its severity score (0–10). 9.0 and up is Critical, a signal to fix first
- A **security advisory** (GitHub Advisory, the Go vulnerability DB, etc.) publishes the "affected range / fixed version / workaround" in one place

The nasty part is **transitive dependencies**. Even if you never import it directly, if a package deep in your dependency tree has a hole, that becomes *your* app's hole.

```text
your-app
└── github.com/foo/bar        ← the only thing you added
    └── github.com/baz/qux    ← bar depends on this
        └── golang.org/x/...  ← a CVE here still affects you
```

> ⚠️ Most "we don't use any risky libraries" only looks at direct dependencies. The holes hide **deep in the tree**. It's more than you can trace by hand.

## The Principles — Stay Current, Measure Continuously

Defending against dependency vulnerabilities is decided by **unglamorous operations**, not flashy defenses.

- **Keep dependencies current**: upgrade when a fix ships. The more you let them pile up, the scarier the big-bang upgrade becomes, and neglect sets in
- **Scan continuously**: manual checks get forgotten. Wire it into CI and **measure automatically every time**
- **Minimize dependencies**: fewer deps means a smaller attack surface (fewer CVEs you can inherit)
- **Have a fast-upgrade path**: keep tests and CI in shape so a version bump goes green in one shot
- **Distinguish "present" from "actually dangerous"**: even if a vulnerable package sits in your tree, if you never **call** the vulnerable function, the real risk is low. Being able to tell these apart cuts the noise dramatically

> 💡 That last distinction is the crux. A tool that warns on mere presence drowns you in false positives, and eventually nobody reads the alerts. You want to see **reachability**.

## Defending in Go — govulncheck Reports Only the Holes You Call

Go's official `govulncheck` (`golang.org/x/vuln`) combines the **Go vulnerability DB** with **static analysis**. It doesn't just check whether your tree contains a vulnerability — it analyzes whether there's a path in **your code that actually calls the vulnerable function**, and reports only the ones that are reachable. That's why the warnings are few and effective.

```bash
# Install (once)
go install golang.org/x/vuln/cmd/govulncheck@latest

# Scan the whole project
govulncheck ./...
```

Vulnerabilities you don't call are noted quietly; the ones you **do** call come with a call stack showing which code reaches them. The fix is usually just bumping to the fixed version.

```bash
# Upgrade the affected module to latest
go get -u golang.org/x/text
go mod tidy
```

Add one line to CI and you can stop a PR that introduces a vulnerability right there.

```yaml
# One step in GitHub Actions
- name: govulncheck
  run: |
    go install golang.org/x/vuln/cmd/govulncheck@latest
    govulncheck ./...
```

Enable **Dependabot** on top and it opens update PRs automatically when a fix ships. That gives you both wheels: "find it by scanning" (govulncheck) and "deliver the update" (Dependabot).

> 🧭 In C#/.NET, `dotnet list package --vulnerable` lists known-vulnerable packages, and NuGet's audit feature (on `restore`) also warns. The difference: it isn't narrowed by reachability the way govulncheck is — its verdict leans toward "is it present".

## Summary

- The cheapest way in for an attacker is an **already-published vulnerability (CVE)** in your outdated dependency
- CVE = the ID, CVSS = the severity score, advisory = the affected-range-and-fix summary. Holes hide in **transitive dependencies**
- The principles: **stay current, scan continuously, minimize deps, upgrade fast** — and distinguish "present" from "actually called and dangerous"
- In Go, `govulncheck ./...` uses the Go vuln DB + static analysis to report **only the vulnerabilities you call**. Put it in CI, update with `go get -u`, automate update PRs with **Dependabot**
- In C#, `dotnet list package --vulnerable` + NuGet audit. Same thinking, but it doesn't check reachability

**Related:** [Supply Chain Attacks](/en/posts/supply-chain-attack/) / [Zero-Day Vulnerabilities](/en/posts/zero-day/) / [CI/CD With GitHub Actions](/en/posts/cicd-github-actions/)
