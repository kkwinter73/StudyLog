---
title: "Communication Behind the Web ⑦: Cookies / Sessions / Tokens"
date: 2026-07-09T18:00:00
summary: "HTTP is 'stateless' — it forgets after every request. So why can you stay logged in? Contrast how Cookies work with two ways of holding state: server-side sessions and tokens (JWT)."
tags: ["ネットワーク", "基礎"]
level: intermediate
lang: en
translationKey: cookie-session-token
---

> 📚 Series "Communication Behind the Web" (7 / 10)

HTTP is **stateless** — each request is independent and doesn't remember who you were last time.
You can still "stay logged in" because you **carry an ID card** every time.
The mechanism that carries that card is the **Cookie**; the ways of holding its contents are **sessions** and **tokens.**

## Why we need to talk about "state"

The [HTTP message from ④](/en/posts/http-message-anatomy/) is self-contained per request. From the server's view,
a request just after login and one ten minutes later are **indistinguishable.**

```text
Request 1: login succeeds (but HTTP throws away the memory here)
Request 2: "show me my page" → server: "who are you?"
```

Bridging that gap is **carrying a passphrase** that says, on request 2, "I'm the same person who just logged in."

## Cookie — the mechanism that carries the passphrase

A Cookie is a small piece of data the server issues, the browser stores, and **sends back automatically every time.** The passphrase's courier.

```http
# Server → browser (issue)
Set-Cookie: session_id=abc123; HttpOnly; Secure; SameSite=Lax

# Browser → server (auto-attached from then on)
Cookie: session_id=abc123
```

The attributes govern its safety:

| Attribute | Role |
| --- | --- |
| `HttpOnly` | Not readable from JS (harder to steal via [XSS](/en/posts/xss-cross-site-scripting/)) |
| `Secure` | Sent only over HTTPS |
| `SameSite` | Restricts sending on cross-site requests ([CSRF](/en/posts/csrf-attack/) defense) |
| `Expires`/`Max-Age` | Lifetime |

> ⚠️ Put basically only "the passphrase (an ID)" in a Cookie. Putting personal data or privileges in **as-is** makes it a target for eavesdropping and tampering.

## Approach A — server-side session

The **server holds the actual data** that the passphrase maps to. The Cookie carries only a meaningless random ID.

```text
Cookie: session_id=abc123
                 │
Server-side store: abc123 → {userId: 42, role: "admin"} (memory/Redis/DB)
```

- ✅ Since the server holds the body, it can **invalidate instantly** (logout = delete from the store)
- ❌ The server keeps state → scaling out needs a **shared store (Redis etc.)** (the [caching article](/en/posts/caching-cache-aside/) mindset applies)

## Approach B — token (JWT)

Pack the info **into the token itself and sign it**; the server keeps no store and **only verifies the signature.**

```text
JWT = header.payload.signature
      {"alg":"HS256"}.{"userId":42,"role":"admin","exp":...}.<signature>
```

- ✅ The server holds no state → **easy to scale** (any node decides with just signature verification)
- ❌ Hard to **revoke** once issued (valid until it expires). The idiom is to keep it short-lived and refresh with a refresh token
- ❌ The payload is **tamper-detectable via the signature but not encrypted** (anyone can read the contents)

## Session vs token

| Aspect | Server-side session | Token (JWT) |
| --- | --- | --- |
| Who holds state | The server | The token itself |
| Instant revocation | Strong | Weak (mitigated by short lifetime) |
| Scaling | Needs a shared store | Easy |
| Good fit | Traditional web, strong revocation needs | APIs, service-to-service |

> 🧭 ASP.NET's auth cookie and `[Authorize]`, or Go's `net/http` + middleware verification, are the same picture.
> Viewed on two axes — **"carried by Cookie / where the contents live"** — the framework differences are mostly implementation detail.

## Summary

- HTTP is **stateless**. Login state is kept by **carrying a passphrase** every time
- The **Cookie** is the passphrase's courier. `HttpOnly`/`Secure`/`SameSite` determine its safety
- **Session** = the body lives on the server; strong at instant revocation but needs a shared store
- **Token (JWT)** = pack the body into the token and verify the signature; scales well but weak at revocation, and its contents are visible
- Put basically only an ID in a Cookie; never secrets or privileges raw

**← Prev:** [⑥ How HTTPS/TLS Works](/en/posts/https-tls-explained/)
**→ Next:** [⑧ CORS (Cross-Origin Requests)](/en/posts/cors-explained/)
