---
title: "Communication Behind the Web ⑧: CORS (Cross-Origin Requests)"
date: 2026-07-09T17:30:00
summary: "Read 'blocked by CORS' correctly. Untangle the same-origin policy it assumes, why only the browser stops it, what preflight means, and which headers the server must return."
tags: ["ネットワーク", "基礎"]
level: intermediate
lang: en
translationKey: cors-explained
---

> 📚 Series "Communication Behind the Web" (8 / 10)

Put your frontend and API on different domains and you'll inevitably meet the **CORS error.** It isn't a "bug" —
it's a sign the browser's safety mechanism **worked as intended.** Let's unravel it from the underlying **same-origin policy**,
through what preflight means, to the headers the server must return. This ties directly into ⑦'s handling of [credentials](/en/posts/cookie-session-token/).

## The premise — the same-origin policy

An **origin** = the trio of scheme + host + port. Differ in even one, and it's a "different origin."

```text
https://app.example.com:443
scheme   host              port   ← all three must match for "same origin"

https://api.example.com   ← different host → different origin
http://app.example.com    ← different scheme → different origin
```

By default, browsers impose a same-origin policy: "**JS from a page of one origin cannot freely read the result of a request to another origin.**"
This prevents a malicious site from quietly hitting your logged-in bank API in the background and stealing the result.

> ⚠️ Only the **browser** stops it. CORS is irrelevant to server-to-server requests, curl, or mobile apps.
> So CORS controls not "server security" but "**reads from other sites in the browser.**"

## CORS — a declaration that "allows" another origin

CORS is a mechanism that **relaxes the same-origin policy when the server permits it.** The key: the one granting permission is the **destination server.**

```http
# The browser sends
Origin: https://app.example.com

# The server replies "that origin is allowed"
Access-Control-Allow-Origin: https://app.example.com
```

- The browser looks at the response's `Access-Control-Allow-Origin`; if it matches, it hands the result to JS. If absent, it blocks
- So **the error appears in the browser**, but **you fix it on the server** (by returning the allow header)

## Preflight — asking before the real request

`GET` and simple form submits have always been sendable, so they go immediately as "simple requests." But things with
**scary side effects** — `PUT`/`DELETE`, `Content-Type: application/json`, custom headers — first **ask "may I send this?" with an OPTIONS request**
before the real one. That's preflight.

```http
# ① Browser → server (preflight)
OPTIONS /api/users
Origin: https://app.example.com
Access-Control-Request-Method: DELETE

# ② Server → browser (permission reply)
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 600        # cache this permission for 10 minutes

# ③ If OK, send the real DELETE
```

> 💡 If the dev tools Network tab shows an `OPTIONS` to the same URL right before the real request, that's the preflight.
> `Access-Control-Max-Age` caches the result, avoiding two round trips every time.

## When sending credentials across origins

To attach a [Cookie](/en/posts/cookie-session-token/) or `Authorization` to a different origin, both sides need extra consent.

- Browser side: `fetch(url, { credentials: "include" })`
- Server side: `Access-Control-Allow-Credentials: true` + **`Allow-Origin` cannot be the wildcard `*`** (a specific origin is required)

> 🧭 ASP.NET's `AddCors`/`UseCors` policy, or attaching allow headers via Go's `rs/cors` or net/http, do the same thing.
> The server merely declares **"which origin may use which methods/headers/credentials."**

## Summary

- An **origin** = scheme + host + port. Differ in one and it's a different origin
- The **same-origin policy** stops the browser from freely handing cross-origin request results to JS
- Only the **browser** stops it; server-to-server and curl are unaffected. So **you fix it on the server** (allow headers)
- Requests with side effects confirm permission first via **preflight (OPTIONS)**
- Crossing origins with cookies/auth needs consent on both sides, and `Allow-Origin: *` can't be used

**← Prev:** [⑦ Cookies / Sessions / Tokens](/en/posts/cookie-session-token/)
**→ Next:** [⑨ Web Server / Reverse Proxy / LB / CDN](/en/posts/web-server-proxy-lb-cdn/)
