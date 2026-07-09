---
title: "Brute Force and Password Spraying — Kill Them With Rate Limits and Hashing"
date: 2026-07-09T13:00:00
summary: "Brute force cracks a password by trying many against one account; password spraying tries one common password across many accounts to dodge lockout. This post sorts out how the attacks work and turns the defensive principles — rate limiting, MFA, strong hashing — into concrete Go with x/time/rate and bcrypt."
tags: ["セキュリティ", "運用"]
level: beginner
lang: en
translationKey: brute-force-password-spray
---

Guessing attacks on passwords come in two shapes: **brute force**, which throws many passwords at one account, and **password spraying**, which tries one common password sideways across many accounts. Let's sort out how they work, then cover the basic Go defenses — rate limiting and hashing.

## How the Attacks Work — Vertical Brute-Forcing vs. Thin Horizontal Spread

Both "guess the password", but the direction of the attempts differs.

| Attack | What it does | The point |
| --- | --- | --- |
| **Brute force** | Throws many passwords at one account, one after another | A weak password will eventually crack, given time |
| **Password spraying** | Tries one common password (`Password1!`, etc.) once against many accounts | **Slips past per-account lockout** |

- Brute force is "one account × many passwords", so failures pile up on that one account. That's exactly what **account lockout** catches
- Password spraying spreads thin as "one password × many accounts". Each account fails only once, so a naive lockout can't detect it. You have to watch the **attempt rate per IP and across the whole system**

> ⚠️ If you only count login failures **per account**, spraying walks right through. Count not just "who" but also "from where / how many across the whole system".

## The Defensive Principles — Layer Four of Them

Any single control has a gap. Layer these four so that "if one is beaten, the next stops it".

- **Rate limiting**: cap the number of attempts per unit of time. This kills the raw speed of brute-forcing
- **Lockout / backoff**: after repeated failures, lock temporarily or grow the wait time exponentially
- **MFA**: even if the password cracks, without the second factor you don't get in. The single most effective control
- **Strong password hashing**: if the DB ever leaks, hashing with something like bcrypt makes each check **deliberately slow**, so an offline brute force won't finish in any realistic amount of time

> 💡 Rate limiting slows the **online attack** (attempts through your server); strong hashing slows the **offline attack** (brute-forcing leaked hashes). They protect **different places**, so you need both.

## Defense in Go, Part 1 — Rate Limiting

Use the token bucket in `golang.org/x/time/rate` to cap login attempts. The basic shape is a limiter per key (IP or account).

```go
import "golang.org/x/time/rate"

// Up to 0.2/sec (once per 5s), with a burst of up to 3
func newLoginLimiter() *rate.Limiter {
	return rate.NewLimiter(rate.Every(5*time.Second), 3)
}

// Per request, look up the limiter for the key (e.g. the IP)
func (s *server) allowLogin(key string) bool {
	s.mu.Lock()
	lim, ok := s.limiters[key]
	if !ok {
		lim = newLoginLimiter()
		s.limiters[key] = lim
	}
	s.mu.Unlock()
	return lim.Allow() // no token left → false → return 429
}
```

- `Allow()` consumes a token and returns `true` if one is available, `false` immediately otherwise. If you want to block, use `Wait(ctx)`
- Against spraying, watch **per IP**; against brute force, watch **per account** — do both
- If you run across processes in production, replace this map with a shared store like Redis

## Defense in Go, Part 2 — Password Hashing and Constant-Time Compare

Never store passwords in plaintext, nor as a plain SHA-256. Use **deliberately slow** `bcrypt`.

```go
import "golang.org/x/crypto/bcrypt"

// On registration: hash with a cost (work factor); the salt is embedded automatically
func hashPassword(pw string) (string, error) {
	h, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost) // default 10
	return string(h), err
}

// On verification: compare the stored hash with the input; compared in constant time internally
func checkPassword(hash, pw string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw)) == nil
}
```

- `DefaultCost` (10) means 2^10 rounds of stretching. Raise the cost as hardware gets faster
- **Don't compare with `==` yourself.** When comparing raw secret values like tokens or API keys, use `crypto/subtle` to prevent the comparison time from leaking the contents (a timing attack)

```go
import "crypto/subtle"

// Doesn't leak length differences via timing either. 1 if equal, 0 if not
func secretEqual(a, b []byte) bool {
	return subtle.ConstantTimeCompare(a, b) == 1
}
```

> 🧭 The playbook is the same in C# (ASP.NET Core Identity). `PasswordHasher<T>` handles hashing/verification with PBKDF2, and the `SignInManager` **lockout** (`MaxFailedAccessAttempts` / `DefaultLockoutTimeSpan`) stops repeated failures. The difference: the parts you assemble by hand in Go, Identity ships as a framework.

## Summary

- **Brute force = vertical, exhaustive; password spraying = thin horizontal spread to dodge lockout.** The axis you count on differs
- Layer the defenses: **rate limiting, lockout, MFA, strong hashing** (any single one has a gap)
- Rate limiting slows the **online attack**; strong hashing slows the **offline attack after a leak** — different places to defend
- In Go: `x/time/rate` for per-key rate limiting, `bcrypt` for deliberately slow hashing, `crypto/subtle` for raw secret comparisons
- Monitor failure logs not just **per account** but also by **attempt rate per IP and across the whole system**

**Related:** [Credential Stuffing](/en/posts/credential-stuffing/) / [Session Hijacking and Fixation](/en/posts/session-hijacking-fixation/) / [Secrets Management](/en/posts/secrets-management/)
