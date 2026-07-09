---
title: "Supply Chain Attacks — Targeting Dependencies and the Build Path"
date: 2026-07-09T18:00:00
summary: "Even if your own code is clean, a poisoned dependency or build path compromises everyone downstream. This post sorts out how the attacks work and the defensive principles, then covers Go's concrete defenses (go.sum, the checksum DB, go mod verify, govulncheck)."
tags: ["セキュリティ", "CICD"]
level: intermediate
lang: en
translationKey: supply-chain-attack
---

Even if the code you write is flawless, if a **dependency you pull in or your build path** is poisoned, everyone downstream gets compromised along with you. That's a supply chain attack: attackers go for the leverage of "poison one thing and it reaches every user downstream." Let's sort out how it works, the defensive principles, and Go's concrete defenses.

## How the Attacks Work — "Poison One, Reach Everyone"

They target not your repo but what sits just upstream of it — your dependencies, accounts, and CI. The classic paths:

- **Malicious / typosquatted packages**: publish a fake with a name close to a real one (like `reqeusts`) and wait for a careless `import`
- **Hijacked maintainer accounts**: steal publish rights to a legit popular package and ship a malicious version under the real name
- **Poisoned CI**: break into the build pipeline and plant code into the artifacts (binaries, images) at build time
- **Dependency confusion**: publish a package to a public registry with the same name as an internal private one, exploiting resolution order so the public one gets pulled

> ⚠️ The scary case is when **the name and the distribution path stay legitimate and only the contents are swapped**. Looking at the name won't tip you off. That's why you need a mechanism to verify mechanically "who swapped what, and when."

A few real examples, briefly. **event-stream** (2018): a hijacked maintainer added a dependency that targeted crypto wallets. **SolarWinds** (2020): attackers breached the build system and planted code into signed updates. **xz backdoor** (2024): a maintainer who earned trust over a long period buried a backdoor in a compression library — all of them abuses of a *trusted* path.

## Defensive Principles — Pin and Verify

Two things sit at the center of the defense: **keep what you pull in to a minimum**, and **pin what you do pull in and verify it**.

| Principle | Concrete practice |
| --- | --- |
| **Pin and verify** | Nail versions with a lockfile + checksums, and re-check the hash of what you fetch every time |
| **Minimal deps** | Don't add deps you don't use. Shrink the attack surface (how much of others' code you pull in) |
| **Least-privilege CI** | Narrow the tokens/permissions given to the pipeline (drop long-lived keys with [keyless auth](/en/posts/ci-oidc-keyless-auth/)) |
| **Provenance** | Sign artifacts and attach proof of which source and which build produced them (provenance / SLSA) |
| **Review before upgrading** | Don't auto-swallow version bumps — look at the diff before upgrading |

> 🧭 In C#, NuGet lets you pin versions with `packages.lock.json` (`RestorePackagesWithLockFile`) and can validate package signatures — the same role Go's `go.sum` plays.

## Go's Defenses — go.sum and the Checksum DB

Go builds module integrity verification into the language tooling. At the center are `go.sum` and the checksum database.

- **`go.sum`**: records the **expected hash** of each dependency module. `go build` and friends check what they fetch against this and fail on a mismatch. `go.mod` pins the version; `go.sum` guarantees the contents are identical
- **Checksum DB (`sum.golang.org`)**: a public, append-only log that fixes the hash of a given module/version to **one value worldwide**. A dependency seen for the first time is checked against it, so an attacker quietly swapping contents later is detected
- **`go mod verify`**: explicitly checks that your local module cache matches `go.sum`

```bash
go mod verify        # verify the cache contents match go.sum
go mod tidy          # trim to only the deps you use (drop needless attack surface)
```

> ⚠️ **Beware the disabling flags.** Loosening the checks — with `GONOSUMCHECK` (an old, deprecated env var) or `-insecure`-style `GOFLAGS` — kills the very verification you wanted. **Don't casually disable it in CI.** If you only want to exclude private modules from the public DB lookup, use the dedicated `GONOSUMDB` / today's `GOPRIVATE` (which lists targets to skip the checksum-DB lookup for). Don't disable everything.

### Defenses After You Pull In: vendoring and govulncheck

- **Vendoring** (`go mod vendor`): pull dependencies into the repo and decouple the build from the registry. You freeze the code as of pull time, and it's easier to review
- **`govulncheck`**: the official tool for detecting known-vulnerable versions. It reports only functions that are **actually called**, so it's low-noise. Put it in CI to reject known-bad versions

```bash
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...    # report only the known vulnerabilities you actually reach
```

> 💡 `go.sum` defends against "swaps"; `govulncheck` defends against "known holes." Different jobs, so run **both**. The standard move is to wire both into your [CI pipeline](/en/posts/cicd-github-actions/) so they fail the build automatically.

## Summary

- Supply chain attacks target what sits upstream of your code (**dependencies, accounts, CI**) and reach everyone downstream
- The real examples (event-stream / SolarWinds / xz) were all abuses of a **trusted path**
- The principles: **minimal deps**, **pin and verify with a lockfile + checksums**, least-privilege CI, and provenance on artifacts
- In Go, `go.sum` and the checksum DB (`sum.golang.org`) detect swaps; `go mod verify` checks explicitly
- **Don't loosen verification with disabling flags (`GONOSUMCHECK` etc.).** For known holes, run `govulncheck` in CI to reject them

**Related:** [Dependency Vulnerabilities](/en/posts/dependency-vulnerabilities/) / [Keyless CI Auth (OIDC)](/en/posts/ci-oidc-keyless-auth/) / [CI/CD with GitHub Actions](/en/posts/cicd-github-actions/)
