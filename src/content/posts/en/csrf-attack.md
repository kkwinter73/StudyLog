---
title: "CSRF — Defending With Tokens and SameSite Cookies"
date: 2026-07-09T11:00:00
summary: "CSRF rides the logged-in victim's cookie to make them submit requests they never intended. This post sorts out the mechanism (contrasted with XSS), the defensive principles — anti-CSRF token, SameSite cookies, Origin checks — and how to implement them in Go."
tags: ["セキュリティ", "Go"]
level: beginner
lang: en
translationKey: csrf-attack
---

CSRF (Cross-Site Request Forgery) uses a logged-in victim's browser to **make the server accept
a request the user never intended**. Let's sort out the mechanism and the defensive principles —
tokens and SameSite cookies — alongside how to do it in Go.

## The Mechanism — Riding the Cookie

Browsers **automatically attach a site's cookies to any request bound for that site**. CSRF rides
on that automatic sending. Suppose the victim is already logged in to their bank (holds a session
cookie), then opens an attacker's page —

```html
<!-- Trap planted on the attacker's site; submits the moment the page loads -->
<form action="https://bank.example/transfer" method="POST" id="f">
  <input type="hidden" name="to" value="attacker">
  <input type="hidden" name="amount" value="100000">
</form>
<script>document.getElementById('f').submit()</script>
```

This form is bound for `bank.example`, so the browser **attaches the victim's session cookie on its
own** and sends it. From the server's view it's indistinguishable from a legitimate logged-in user,
and the transfer goes through.

> 💡 The key: the attacker *can't read* the cookie's contents — CSRF just gets it **used**. So the
> defense goes in the direction of "confirm, with something other than the cookie, that this really
> is the user's action".

It's easy to confuse with [XSS](/en/posts/xss-cross-site-scripting/), but the aim is the opposite.

| | CSRF | XSS |
| --- | --- | --- |
| What it does | Makes the victim **submit an unintended request** | Makes the victim's browser **run arbitrary script** |
| Trust abused | The server **trusting the browser (cookie)** | The browser **trusting the HTML the server returns** |
| The attacker can | Not read the cookie (only get it used) | Read the cookie (steal it) |

## Defensive Principles — Demand Evidence Beyond the Cookie

CSRF works because "the cookie alone identifies the user". So add evidence separate from the cookie.

- **Anti-CSRF token (synchronizer token)**: the server issues a per-session secret token and embeds
  it as a hidden field. On submit, it verifies the match. The attacker's page doesn't know the token,
  so it can't forge one
- **Double-submit cookie**: put the token both in a cookie and in a request value, and have the
  server check they **match**. A variant that needs no server-side session storage
- **SameSite cookies**: tell the browser "don't attach this cookie to cross-site-originated requests".
  This closes off the riding path itself
- **Origin / Referer checks**: verify the request's `Origin` header is your own site (one layer of
  defense in depth)

> ⚠️ Tokens can't protect GET. The principle is to **attach them to state-changing operations
> (POST/PUT/DELETE)**. Conversely, not giving GET side effects (deleting via GET, etc.) is itself a
> CSRF countermeasure.

## Defending in Go

Start with the foundation: SameSite, set via the `SameSite` field of `http.Cookie`.

```go
http.SetCookie(w, &http.Cookie{
    Name:     "session",
    Value:    sessionID,
    HttpOnly: true,                    // unreadable from JS (doubles as XSS defense)
    Secure:   true,                    // HTTPS only
    SameSite: http.SameSiteLaxMode,    // no cookie on cross-site POSTs
})
```

- `SameSiteStrictMode` is the tightest, but the cookie isn't attached even when arriving from an
  external link, so the user looks "logged out"
- `SameSiteLaxMode` **attaches on top-level-navigation GETs but not on cross-site POSTs**. Easy to
  treat as a practical default

SameSite is powerful but "browser-dependent", so for state-changing operations also use a synchronizer
token. A hand-rolled skeleton looks like this.

```go
// On rendering the form: issue a token, save it in the session, embed as hidden
token := randomToken()
session.Set("csrf", token)
// In the template: <input type="hidden" name="csrf_token" value="{{.Token}}">

// On receiving the POST: compare against the session value (constant-time)
func verifyCSRF(w http.ResponseWriter, r *http.Request, session Session) bool {
    got := r.FormValue("csrf_token")
    want, _ := session.Get("csrf")
    if subtle.ConstantTimeCompare([]byte(got), []byte(want)) != 1 {
        http.Error(w, "CSRF token mismatch", http.StatusForbidden)
        return false
    }
    return true
}
```

In practice, don't roll your own — the standard move is to insert middleware like `gorilla/csrf`. It
handles issuing, verifying, and injecting the token into templates all at once.

```go
CSRF := csrf.Protect([]byte("32-byte-long-auth-key"))
http.ListenAndServe(":8000", CSRF(router))
// In templates, embed the field with csrf.TemplateField(r)
```

> 🧭 In C#/.NET, ASP.NET Core's Anti-Forgery plays the same role: `<form>` automatically gets a
> `__RequestVerificationToken`, and `[ValidateAntiForgeryToken]` verifies it. In Go, think of it as
> "inserting that same automation yourself, as middleware", and the gap closes.

## Summary

- CSRF **rides the logged-in cookie** to submit unintended requests. Its aim is the opposite of XSS
- The defensive principle is "**evidence beyond the cookie**" — token matching, SameSite, Origin checks
- In Go, first build the foundation with `http.Cookie{SameSite: http.SameSiteLaxMode}`
- For state-changing operations, also use a synchronizer token. Don't roll your own — use `gorilla/csrf`
- **Attach tokens to state-changing operations (POST/PUT/DELETE)**; don't give GET side effects

**Related:** [XSS — Cross-Site Scripting](/en/posts/xss-cross-site-scripting/) / [Session Hijacking and Fixation](/en/posts/session-hijacking-fixation/) / [SQL Injection](/en/posts/sql-injection/)
