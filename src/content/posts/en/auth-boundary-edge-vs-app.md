---
title: "Boundary Authentication — Authenticate at the Edge or in the App Layer"
date: 2026-06-26T11:00:00
summary: "Do you authenticate once at the entrance (edge/CDN) or in each app (JWT)? Cookie-based flows suit browsers, while header-carried tokens suit mobile/API clients — each has its strengths. We also cover the pitfalls of mixing the two."
tags: ["セキュリティ", "アーキテクチャ"]
level: intermediate
lang: en
translationKey: auth-boundary-edge-vs-app
---

Where do you verify "whose request is this"? Broadly, there are two approaches: **authenticate once at the entrance (edge/CDN)** or **in each app (JWT)**.
Which fits depends on the client type, and mixing them is a breeding ground for [auth errors](/en/posts/http-status-codes/). Let's nail down that branch.

## Where to authenticate

The approach changes depending on where along the request path you apply authentication.

```text
[Browser/Mobile] → [Edge/CDN] → [LB] → [Each app]
                      ▲ ① authenticate once here    ▲ ② authenticate in each app
```

- **① Edge authentication**: authenticate at the entrance and only let verified requests through to the back
- **② App-layer authentication**: each app verifies the request it receives on its own

## Edge authentication (once at the entrance)

Authenticate in front of the CDN or entrance, and carry the "authenticated" state around via a **Cookie**.

- You can **centralize** auth logic at the entrance (it doesn't get scattered across apps)
- Within the same domain, one login **shares the Cookie** so it can be reused
- Suits public web apps for browsers (browsers carry Cookies automatically)

## App-layer authentication (JWT)

Attach a **token (JWT) to the request as a header** and have each app verify it.

- Suits clients where **Cookies are hard to use**, like mobile apps, external APIs, and device apps
- The token itself carries "who you are / what you can do," so each app can verify it on its own
- The same token works across any app (stateless)

| | Edge auth (Cookie) | App layer (JWT) |
| --- | --- | --- |
| Where auth happens | Centralized at the entrance | Each app |
| How it's carried | Cookie (browser automatic) | Token in the header |
| Which clients fit | Browser/public web | Mobile/API/device |

## Pitfalls when mixing

In reality you'll **mix both** (public web at the edge, mobile with JWT). This is where mistakes are easiest to make.

> ⚠️ Cookie-based edge auth doesn't work for **paths where Cookies don't apply** (mobile/API).
> Protect those paths with app-layer JWT — **decide the approach per path**.
> Draw a clear line between which entrance uses which approach so auth headers don't collide or get duplicated.

> 🧭 [401 and 403 are different things](/en/posts/http-status-codes/). 401 = can't verify identity (invalid token), 403 = no permission.
> Once you separate the auth approaches, the code you should return becomes clear too.

## Summary

- Authentication is broadly split into **edge (once at the entrance, Cookie)** and **app layer (each app, JWT)**
- **Edge auth** can be centralized and suits browsers/public web (carries Cookies automatically)
- **App-layer JWT** suits mobile/API/device (carries the token in a header)
- In reality they get mixed. **Use JWT for paths where Cookies don't work** — decide the approach per path
- It's the easiest branch to get wrong, so make it explicit which one each entrance uses

**Related:** [HTTP status codes (401/403)](/en/posts/http-status-codes/) / [Secrets management](/en/posts/secrets-management/)
