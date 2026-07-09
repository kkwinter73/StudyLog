---
title: "Session Hijacking and Fixation — Protect the Cookie, Rotate the ID at Login"
date: 2026-07-09T14:00:00
summary: "A login is held together by a single thread: the session ID. This post sorts out the difference between hijacking (stealing the ID) and fixation (making a victim ride an ID you already know), then implements protecting the cookie and rotating the ID at login in Go."
tags: ["セキュリティ", "Go"]
level: intermediate
lang: en
translationKey: session-hijacking-fixation
---

A web app's login state is usually held together by a single thread: the **session ID**.
Two attacks target that thread — **hijacking** (steal the ID) and **fixation** (make you ride
an ID the attacker chose). This post sorts out the difference, then protects the cookie and
rotates the ID at login in Go.

## Two Attacks — Steal It, or Make You Ride It

Both aim to "impersonate a legitimate user with someone else's session ID". What flips is **who supplies the ID**.

| | Session hijacking | Session fixation |
| --- | --- | --- |
| **Goal** | **Steal** a valid ID | Make the victim use an ID the **attacker knows** |
| **Method** | Cookie theft via [XSS](/en/posts/xss-cross-site-scripting/), [sniffing](/en/posts/mitm-attack/), ID prediction | Fix an ID before login, then ride the same ID after login |
| **Precondition** | Obtain the ID **after** login | Plant the ID **before** login |
| **Decisive defense** | Don't let the cookie be stolen / used | **Rotate** the ID at login |

Fixation goes like this. The attacker gets a session ID issued to themselves (say `abc123`) and
plants it in the victim's browser via a URL parameter or a crafted link. The victim then
**logs in**. If the server doesn't change the ID, `abc123` becomes an authenticated thread.
The attacker knew `abc123` from the start, so they can now act as the legitimate user.

> 💡 Hijacking steals the ID afterward; fixation hands it out beforehand. So fixation needs
> neither XSS nor sniffing — it exploits one thing only: **the ID not changing at login**.

## The Principles — Protect the Cookie, Make the ID Disposable

Defense has three layers: don't let it be stolen, don't let a stolen one work, and invalidate a planted one.

- **Harden the cookie attributes**: `HttpOnly` (unreadable from JS, so XSS can't steal it),
  `Secure` (sent only over HTTPS), `SameSite` (limits cross-site sending, also curbs [CSRF](/en/posts/csrf-attack/))
- **High-entropy IDs**: to kill prediction attacks, generate long IDs from a cryptographic RNG (sequential numbers are a non-starter)
- **Regenerate the ID on login and privilege change**: this is the **single, decisive defense against fixation**.
  Drop the pre-login ID and issue a new one, and any ID the attacker planted becomes worthless
- **Idle and absolute timeouts**: expire after inactivity (idle) and force-expire after a fixed
  lifetime (absolute). This shrinks how long a stolen ID stays useful
- **HTTPS everywhere**: prevents ID theft by sniffing. The `Secure` flag assumes HTTPS

> ⚠️ Skip the regeneration and fixation gets through even if everything else is airtight. Conversely,
> perfect cookie attributes still leave a hole if the same ID is reused across login. **"Protect" and
> "rotate" only work as a pair.**

## Defending in Go — Cookie Attributes and Random IDs

First the cookie attributes. In the standard `net/http` you just raise three flags.

```go
http.SetCookie(w, &http.Cookie{
    Name:     "session_id",
    Value:    sid,
    Path:     "/",
    HttpOnly: true,                    // unreadable from JS (XSS defense)
    Secure:   true,                    // sent only over HTTPS
    SameSite: http.SameSiteLaxMode,    // limits cross-site sending
    MaxAge:   1800,                    // absolute timeout (seconds)
})
```

Generate the session ID with **`crypto/rand`**, not `math/rand`. Unpredictability is everything,
so nothing but a cryptographic RNG will do.

```go
import (
    "crypto/rand"
    "encoding/base64"
)

func newSessionID() (string, error) {
    b := make([]byte, 32) // 256 bits of entropy
    if _, err := rand.Read(b); err != nil {
        return "", err
    }
    return base64.RawURLEncoding.EncodeToString(b), nil
}
```

### Rotate the ID at Login

The heart of killing fixation: **on every successful auth, drop the old ID and issue a new one**.

```go
func login(w http.ResponseWriter, r *http.Request) {
    // ...after password verification succeeds...

    oldSID, _ := r.Cookie("session_id")
    if oldSID != nil {
        store.Delete(oldSID.Value) // invalidate the old session
    }

    newSID, _ := newSessionID()    // issue a new ID
    store.Save(newSID, userID)
    http.SetCookie(w, &http.Cookie{
        Name: "session_id", Value: newSID, Path: "/",
        HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode,
    })
}
```

With `gorilla/sessions`, expire the old session before `session.Save()` by setting
`Options.MaxAge = -1`, then save a new one for the same effect (copying the values into a
fresh session is the usual move).

> 🧭 In C#, ASP.NET Core cookie authentication regenerates the session on `SignInAsync` and
> defaults `HttpOnly` / `Secure` / `SameSite` to the safe side. In Go you write the same thing **explicitly**.

## Summary

- Hijacking **steals the ID**; fixation makes you **ride an ID the attacker knows**. Same goal, opposite direction of planting
- Harden the cookie with `HttpOnly` + `Secure` + `SameSite`, and make the ID high-entropy with `crypto/rand`
- **Regenerating the ID at login and privilege change** is the decisive defense against fixation; protect and rotate work as a pair
- Idle/absolute timeouts and HTTPS everywhere narrow the lifetime and the path of a stolen ID
- In Go, write attributes, randomness, and rotation explicitly; the rebuild idea is the same with `gorilla/sessions`

**Related:** [CSRF — Riding an Unintended Request](/en/posts/csrf-attack/) / [XSS — Cross-Site Scripting](/en/posts/xss-cross-site-scripting/) / [Man-in-the-Middle (MITM)](/en/posts/mitm-attack/)
