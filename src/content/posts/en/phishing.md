---
title: "Phishing and Spear Phishing — Deceiving People Out of Their Credentials"
date: 2026-07-09T17:00:00
summary: "Phishing lures credentials with fake messages; spear phishing is the targeted, personalized version. This post sorts out how the attacks work and covers what actually helps — phishing-resistant MFA, email authentication — plus what engineers can do in practice."
tags: ["セキュリティ", "基礎"]
level: beginner
lang: en
translationKey: phishing
---

Phishing tricks people with convincing messages so they hand over their own passwords or codes. The conclusion up front: **defend with mechanisms, not human attention** — phishing-resistant MFA and email authentication are the main line, and user training is the backup, not the front.

## How the Attack Works — It Succeeds Just by "Looking Real"

The essence of phishing isn't a system vulnerability — it **targets human judgment**. The techniques split by how narrowly they focus.

- **Phishing**: blast fake messages at an indiscriminate crowd. Urgent-sounding text ("your account has been locked") lures the victim to a fake login page, and whatever they type gets stolen
- **Spear phishing**: crafted for a specific person or organization. It mixes in real names, titles, vendors, and actual project names to look like "the genuine article, addressed to me". When it lands, the success rate is on another level
- **BEC** (Business Email Compromise): impersonates an executive or a vendor and asks "please wire funds to this account, urgently". No malware, no link — it **moves money using only the legitimate business flow**, which is what makes it nasty
- **Fake login pages**: a screen indistinguishable from the real one that relays the entered ID/password (and sometimes the OTP) to the real site in real time (AiTM = adversary-in-the-middle)

> ⚠️ "Spot the suspicious email and you're safe" is only half true. A well-made fake page is indistinguishable from the real one — you have to design defenses **assuming it won't be spotted**.

### Phishing vs. Spear Phishing

| Aspect | Phishing | Spear phishing |
| --- | --- | --- |
| Target | Indiscriminate (mass blast) | A specific person or organization |
| Craft | Templated, reused | Personalized with researched names, projects, relationships |
| Success rate | Low, but wins on volume | High (easy to convince) |
| Ease of spotting | Often feels off | Rarely (the context fits) |

## Principles of Defense — Make It So Stolen Input Can't Be Used

The mindset is not "don't get fooled" but **don't suffer even if you do**. Ordered by what works best.

- **Phishing-resistant MFA**: passkeys / FIDO2 security keys **bind the key to the domain**, so they simply won't work on a fake site. OTPs (SMS or an app's 6 digits) can be **typed into a fake site by a human**, so they're broken by relaying
- **Email authentication** (SPF / DKIM / DMARC): lets receivers reject spoofed mail claiming to be your domain. It only becomes effective once you raise `DMARC` to `p=reject`
- **User training**: practice at doubting "urgent" phrasing and requests for money or credentials. But it's the **last layer**, not the first
- **URL / domain checks**: read the actual domain, not the display name. Watch for lookalike characters (`rn` → `m`, etc.)

| MFA type | Phishing resistance | How it's broken |
| --- | --- | --- |
| SMS / email OTP | Weak | Human copies it into the fake site → relayed |
| Authenticator 6 digits (TOTP) | Weak | Same as above |
| Push approval | Medium | Exploited via approval fatigue (spam until a misclick) |
| **Passkeys / FIDO2** | Strong | Domain-bound; won't respond to a fake site |

> 🧭 The platform (be it .NET or Go) won't save you. Using a hardened framework doesn't help — phishing happens outside the language and the infrastructure. What works is **the MFA type and the email authentication config** themselves.

## How Engineers Get Involved — What You Can Actually Do

"Be careful" is not a control. An engineer's job is to own the parts you can reduce structurally, through design and operations.

- **Enforce phishing-resistant MFA**: let your own service's auth offer passkeys / FIDO2, and require them where you can. Don't ship a design that can only emit OTPs
- **Get the email authentication records right**: set SPF / DKIM on your sending domain, and raise DMARC in stages, `none` → `quarantine` → `reject`

```text
# Tightening DMARC in stages (DNS TXT records)
_dmarc.example.com  TXT  "v=DMARC1; p=none;       rua=mailto:dmarc@example.com"   # observe first
_dmarc.example.com  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"   # mark as spam
_dmarc.example.com  TXT  "v=DMARC1; p=reject;     rua=mailto:dmarc@example.com"   # reject (final)
```

- **Don't train your users to click links**: if your legitimate mail always requires a link + login, users lose the ability to tell it from a fake. Keep important actions inside the app
- **Decide your incident-response first moves in advance**: assuming credentials have leaked, be ready to immediately **revoke the account's sessions, re-enroll password and MFA, and investigate the logs** (details are for another post)

> 💡 "Our mail is legit but it makes people click a link" — that very habit conditions users for phishing. Treat **the sender's design** as part of phishing defense too.

## Summary

- Phishing is a mass blast; **spear phishing is targeted and personalized**, with a far higher success rate
- BEC moves money through legitimate flows with no malware; fake login pages (AiTM) break even OTPs by relaying
- The main line is **phishing-resistant MFA (passkeys / FIDO2)** — domain-bound, so it won't respond to a fake site
- Set **SPF / DKIM / DMARC** on your sending domain and raise `DMARC` to `reject` in stages
- Engineers reduce this structurally via **enforcing MFA, email auth, "don't-make-them-click" design, and prepared first moves**

**Related:** [Social Engineering](/en/posts/social-engineering/) / [Credential Stuffing](/en/posts/credential-stuffing/) / [Brute Force and Password Spraying](/en/posts/brute-force-password-spray/)
