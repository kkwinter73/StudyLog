---
title: "Operating the Cloud from CI Without Keys — the OIDC Mindset"
date: 2026-06-26T19:00:00
summary: "Putting a long-lived access key in CI is a leak risk waiting to happen. With OIDC, CI proves its own identity and receives short-lived, on-demand permissions instead. Learn the mechanism of authentication that stores no keys."
tags: ["CICD", "セキュリティ", "運用"]
level: intermediate
lang: en
translationKey: ci-oidc-keyless-auth
---

Operating the cloud (your deploy target) from a [CI/CD pipeline](/en/posts/cicd-github-actions/) requires authentication.
The naive approach registers a long-lived access key in CI, but that's dangerous. With **OIDC** you can avoid storing any key at all.
It's one step beyond the [don't-store-secrets](/en/posts/secrets-management/) mindset.

## The problem with long-lived access keys

Registering an "access key that's valid forever" in CI has plenty of weaknesses.

- **Free rein if leaked**: with no expiry, a leaked key keeps getting abused until you revoke it
- **Rotation is a chore**: you need an operational routine to periodically regenerate keys and update every place that uses them
- **Contamination risk**: it's easy for keys to accidentally slip into logs or code

> ⚠️ [The best move is not to store the secret in the first place](/en/posts/secrets-management/). A long-lived key is the textbook "stored secret" —
> just holding it is a risk.

## What is OIDC

With OIDC (OpenID Connect), CI can authenticate to the cloud **without holding a key**.
Here's how it works: CI presents a **signed token** claiming "I am this workflow in this repository,"
the cloud verifies it, and if it matches, issues **short-lived, one-time permissions**.

```text
CI (job execution)
   │ ① Generates a signed token: "I am the workflow on main of repository X"
   ▼
Cloud authentication endpoint (STS, etc.)
   │ ② Checks against trust settings (does the issuer / repo / branch match?)
   ▼
   ③ On a match, issues temporary credentials that expire in about an hour
```

> 💡 It's not "handing over a key" but "proving identity and borrowing permissions briefly, each time."
> Similar to how [SSH verifies you without sending your private key](/en/posts/ssh-and-key-auth/), the advantage is that **there's no stored secret**.

## The key points of configuration

The secret to using OIDC safely is tightening the **trust policy** on the cloud side.

- Accept only tokens "from **this issuer** (CI provider)," "for **this repository**," "on **this branch**"
- Grant the accepted party a **least-privilege** role (only the operations needed for deployment)

> ⚠️ If you loosen the trust conditions (e.g., don't restrict the repository name), someone else's CI could grab your permissions.
> The essential part is pinning down concretely "whose which workflow do I trust."

## Summary

- Putting a **long-lived access key** in CI leaves ongoing risks of leakage, rotation, and contamination
- **OIDC** stores no key; CI proves its identity and borrows **short-lived, on-demand permissions**
- The flow is "signed token → cloud verifies → temporary credentials issued"
- The crux of safety is **tightening the trust policy** (restrict issuer / repository / branch) plus a **least-privilege role**
- In eliminating the "stored secret," it's the ideal form of [secrets management](/en/posts/secrets-management/)

Next up: see whether you can switch your own CI's deploy job from long-lived keys to an OIDC-based approach.
