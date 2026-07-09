---
title: "Privilege Escalation and IDOR — Don't Let Someone Read Another User's ID"
date: 2026-07-09T14:30:00
summary: "Passing login isn't enough. Nudge a single ID in the URL and you can see someone else's data — that's IDOR. This post sorts out how it works and how to defend in Go by checking, on every request, whether this user is allowed to touch this object."
tags: ["セキュリティ", "アーキテクチャ"]
level: intermediate
lang: en
translationKey: privilege-escalation-idor
---

Change `GET /orders/123` to `/orders/124` and you see someone else's order — that's IDOR.
The conclusion up front: **authentication (is the user logged in) is not enough; you must authorize each object (is this user allowed to touch this one) on the server, on every request** — almost every mitigation derives from that one sentence.

## How the Attack Works — Two Directions of Escalation

An attacker gaining rights they shouldn't have is called **privilege escalation**. It comes in two directions.

| Type | What happens | Example |
| --- | --- | --- |
| **Horizontal** | Access **another user's** data at the same privilege level | Regular user A reads regular user B's order |
| **Vertical** | Access an operation at a **higher** privilege than yours | A regular user hits an admin-only delete API |

The flagship of the horizontal kind is **IDOR (Insecure Direct Object Reference)**.

```text
1. Attacker opens their own order   GET /orders/123   → 200 their order
2. Nudge the ID by one              GET /orders/124   → 200 someone else's order (!!)
```

Why does it go through? Because the server only checks "is this logged in (authN)" and never checks "**does order 124 belong to this user** (authZ)". If IDs are sequential and easy to guess, the whole table can be scraped by brute force.

> ⚠️ "An endpoint only authenticated users can hit" is not safe. Authentication only opens the door.
> Unless you check **which room they may enter** per room (per object), everyone with a key can enter every room.

## Principles for Defense

- **Authorize every object access on the server.** Not "is logged in" but "**may this person touch this specific record**", every time. Hiding it in the frontend is not a mitigation
- **Deny by default.** Allow only what's explicitly permitted, and fail a missing check toward denial
- **Don't rely on hard-to-guess IDs alone.** UUIDs make brute force harder, but a leaked ID used as-is isn't stopped. Secrecy of the ID is no substitute for authorization
- **Least privilege.** Give users and tokens only the scope they need

> 🧭 For C# folks: ASP.NET Core's **resource-based authorization** (`IAuthorizationService.AuthorizeAsync(user, resource, policy)`) is exactly this. Relying on role attributes `[Authorize(Roles=...)]` alone only checks "logged in" and won't stop IDOR — the same framing holds in Go.

## Defending in Go — Enforce the Ownership Check in the Handler

The most effective move is to **fold the owner condition into the fetch query**. Not "look up by ID, then check the owner" but "**look up with 'it's mine' as a condition**".

```go
// Bad: auth only. Returns another user's order as long as the ID matches
func getOrder(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")
    row := db.QueryRow(`SELECT id, total FROM orders WHERE id = $1`, id)
    // ... never checks whose it is → IDOR
}

// Good: fold ownership into the query. Someone else's ID → 0 rows = 404
func getOrder(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")
    uid := currentUserID(r.Context()) // the real user's ID, set by auth middleware

    var o Order
    err := db.QueryRow(
        `SELECT id, total FROM orders WHERE id = $1 AND owner_id = $2`,
        id, uid,
    ).Scan(&o.ID, &o.Total)
    if errors.Is(err, sql.ErrNoRows) {
        http.NotFound(w, r) // 404 (not 403) so existence isn't leaked
        return
    }
    // ...
}
```

With `WHERE id = $1 AND owner_id = $2`, passing someone else's ID yields 0 rows. Because **authorization is part of the query**, there's less room to "forget the check".

> 💡 Returning 403 ("not yours") for a record that exists leaks that the ID exists (a hint for enumeration).
> Returning a uniform **404** for resources you don't want to reveal gives nothing away.

## Vertical Escalation — Check Roles in Middleware

Admin-style operations are **vertical**, so block them by role rather than per object. Factor it into middleware.

```go
// Middleware that requires a role (deny by default)
func RequireRole(role string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            u := currentUser(r.Context())
            if u == nil || !u.HasRole(role) {
                http.Error(w, "forbidden", http.StatusForbidden)
                return // not explicitly permitted → don't let it through
            }
            next.ServeHTTP(w, r)
        })
    }
}

// Apply: require the role only on admin routes
r.With(RequireRole("admin")).Delete("/orders/{id}", adminDeleteOrder)
```

The difference from middleware that only checks "is logged in" is clear: it verifies **authentication (who) and authorization (what they may do) at separate layers**. Horizontal (ownership = the query inside the handler) and vertical (role = middleware) play different roles, so neither alone is enough.

The boundary thinking connects to [Authorization Boundary — Block at the Edge or Guard in the App](/en/posts/auth-boundary-edge-vs-app/): coarse checks like roles can live nearer the edge, but **per-object ownership can only be judged correctly inside the app**.

## Summary

- Privilege escalation is **horizontal** (another user's same-level data) or **vertical** (higher-privilege operations); IDOR is the flagship horizontal case
- IDOR's cause is **checking only authentication and skipping per-object authorization**. Making IDs hard to guess doesn't fix it
- The principles: **authorize every access on the server, deny by default, least privilege**
- In Go, fold `WHERE ... AND owner_id = $currentUser` into the fetch query so the **ownership check is part of the query**. No match → 404
- For vertical escalation, block by **role in middleware**, deny by default. Horizontal and vertical live at different layers

**Related:** [Authorization Boundary — Block at the Edge or Guard in the App](/en/posts/auth-boundary-edge-vs-app/) / [SQL Injection](/en/posts/sql-injection/) / [Session Hijacking and Fixation](/en/posts/session-hijacking-fixation/)
