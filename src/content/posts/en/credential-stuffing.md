---
title: "Credential Stuffing — Abusing Reused Passwords"
date: 2026-07-09T13:30:00
summary: "Attackers take username+password pairs leaked from *other* breaches and replay them straight at your login. It rides on password reuse, so it lands even when the per-attempt success rate is tiny. This post covers the mechanics and the practical defenses — MFA and breached-password checks."
tags: ["セキュリティ", "運用"]
level: beginner
lang: en
translationKey: credential-stuffing
---

"Take the username/password pairs leaked from some other site and pour them straight into our login page" — that's credential stuffing. It **rides on password reuse**, so you can take damage even when *you* were never breached. Let's sort out the mechanics and the defenses.

## How the Attack Works — Not the Same as Brute Force

An attacker gets a huge list of "username + password" pairs leaked from some other service and replays them **as-is** against your login. Because people reuse the same password, a fraction of them work.

It's easy to confuse with brute force, but the aim and the odds are different.

| | Brute force | Credential stuffing |
| --- | --- | --- |
| What it uses | Mechanically generated candidate strings | Real, already-leaked ID+PW pairs |
| Target | Drills deep into one account | Wide and shallow across many accounts |
| Per-attempt success | Extremely low | Low but **not zero** (0.1–a few %) |
| Precondition | Weak passwords | Passwords are **reused** |

> ⚠️ Even at 0.2% per attempt, replaying a million pairs cracks around 2,000 accounts. And since it only tries the "correct pair," it needs **just one attempt per account** — count-based lockouts alone won't stop it.

## Defensive Principles — Get Off "Password Only"

The root cause is authenticating on a single piece of knowledge — the password. So the defense shifts one step off of that.

- **MFA (multi-factor auth) is the strongest single defense.** Even a correct password won't get in without the second factor. It invalidates the value of the stolen pairs wholesale
- **Detect suspicious logins**: geographically impossible movement in a short window (impossible travel), an unfamiliar device fingerprint, inhuman speed/spread (bot detection)
- **Reject breached passwords**: check candidates against a set of known-leaked passwords and refuse to register a reused one in the first place
- **Passwordless / passkeys**: remove the shared secret (the password) itself. There's nothing left to reuse

> ⭐ The priority is clear. MFA first, breached-password checks second. Those two alone wreck the economics of the attack.

## Defending in Practice (Go) — Breached-Password Checks

On every signup and password change, check whether the candidate is in a known breach list. The awkward part: **you don't want to send the raw password anywhere.** That's where a **k-anonymity range query** comes in.

- Hash the password with SHA-1 and query with **only the first 5 characters (the prefix)**
- The server returns **the suffixes of all candidate hashes** matching that prefix, in bulk
- You do the final match **locally**. The server never receives the full hash or the raw password

```go
// Never send the raw password out — query with only the 5-char hash prefix.
func isBreached(password string) (bool, error) {
	sum := sha1.Sum([]byte(password))
	hash := strings.ToUpper(hex.EncodeToString(sum[:])) // 40 chars
	prefix, suffix := hash[:5], hash[5:]

	resp, err := http.Get("https://api.example.com/range/" + prefix)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	// The response is lines of "SUFFIX:count". Match the tail locally.
	sc := bufio.NewScanner(resp.Body)
	for sc.Scan() {
		line, _, _ := strings.Cut(sc.Text(), ":")
		if strings.EqualFold(line, suffix) {
			return true, nil // breached → refuse registration
		}
	}
	return false, sc.Err()
}
```

> 💡 This check is for "don't let it be registered." For existing users, a good operational pattern is to run the same check on a successful login and prompt a password change if it matches.

## Defending in Practice (Go) — Make MFA Mandatory

Breached-password checks reduce leakage but can't drive reuse to zero. **The last line of defense is MFA.** Don't let the login flow end at "password verified" — make it a state machine that **always routes through** a second-factor check.

```go
// Even with a correct password, don't issue a full session until MFA is done.
func login(w http.ResponseWriter, r *http.Request, u *User, pw string) {
	if !u.CheckPassword(pw) {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	if u.MFAEnabled {
		// Issue only a short-lived "pending MFA" token, not a full session.
		issuePendingMFA(w, u.ID)
		return
	}
	issueSession(w, u.ID) // Only MFA-disabled users land here (= prompt them to enable it)
}
```

- The key point: "password verified" is not "logged in." Until MFA completes, you hand out only a **limited token**
- Combine it with [login throttling](/en/posts/brute-force-password-spray/) for brute force. But since stuffing is "one attempt per account," what works is **per-IP / per-device rate limiting and bot detection**

> 🧭 In C#/.NET, ASP.NET Core Identity is the foundation. `SignInManager` returns `RequiresTwoFactor`, so the two-stage flow is a built-in feature. Breached-password checks and TOTP are typically added via an external provider or library.

## Summary

- Credential stuffing **imports someone else's breach**. Riding on reuse, it lands even if you were never breached
- Unlike brute force, it "tries the correct pair just once" — **count-based lockouts alone won't stop it**
- Top priority is **MFA**. Make login a state machine that won't pass without the second factor even if the password is right
- **Check against breached passwords** at signup/change. A k-anonymity range query keeps the raw password from ever leaving
- Detect via impossible travel / device fingerprint / bot detection; cure it at the root with passkeys that **remove the shared secret**

**Related:** [Brute Force and Password Spray](/en/posts/brute-force-password-spray/) / [Phishing](/en/posts/phishing/) / [Session Hijacking and Fixation](/en/posts/session-hijacking-fixation/)
