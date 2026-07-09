---
title: "Social Engineering — Attacking People, Not Code"
date: 2026-07-09T17:30:00
summary: "Social engineering targets human psychology, not vulnerabilities. This post sorts out the techniques and their levers (authority, urgency, trust), the defensive principles — out-of-band verification, least privilege, phishing-resistant MFA, a blameless culture — and the engineering angles like help-desk verification and number-matching MFA."
tags: ["セキュリティ", "基礎"]
level: beginner
lang: en
translationKey: social-engineering
---

Social engineering attacks **human psychology**, not holes in code.
No matter how hardened the system, fooling one person who holds access is enough to get through —
this post sorts out the techniques, how they work, and what the dev/ops side can actually do about it.

## How the Attack Works — the Target Is People, Not Code

Unlike attacks that exploit a technical vulnerability, social engineering's goal is to **get a human to say yes**.
The techniques all reduce to a few **psychological levers**.

| Technique | What they do | Lever they pull |
| --- | --- | --- |
| **Pretexting** | Impersonate someone else (boss, vendor, IT) and build a story | Authority, trust |
| **Baiting** | Leave bait — a USB stick, an "invoice.pdf" — for the target to open | Curiosity, greed |
| **Tailgating** | Physically walk in behind an authorized person | Politeness, awkwardness |
| **Vishing** | Stage an urgent situation over the phone (voice) to extract info | Urgency, authority |
| **Help-desk impersonation** | Pose as an employee to request a password/MFA reset | Trust, helpfulness |
| **MFA fatigue (push-bombing)** | Fire a flood of approval pushes until the target caves | Urgency, exhaustion |

> 💡 There are mainly three levers — **authority** (posing as a VIP or IT), **urgency** ("do this right now or else"),
> and **trust** (pretending to be a colleague or vendor). The technique changes, but it's always pushing one of these three.

## Defensive Principles — One Fooled Human Shouldn't Be Game Over

"Train the employees" isn't enough. Assume people will make mistakes, and **design so that being fooled still contains the damage**.

- **Out-of-band verification**: confirm identity through a **different channel** than the request came in on.
  If chat says "wire this money urgently", don't confirm in chat — call back the registered number
- **Least privilege**: one fooled person shouldn't topple everything. Scope permissions tightly and require
  multi-person approval for sensitive actions, so compromising one account isn't instant total breach
- **Phishing-resistant MFA**: SMS and push approvals can be beaten. **Phishing-resistant methods** like passkeys/FIDO2
  kill the "type your code into the fake site" trick outright
- **A blameless culture**: if the vibe is "blame the person who reported it" rather than the attacker,
  mistakes get hidden and discovery is slow. **The sooner it's reported, the smaller the damage** — build that into policy

> ⚠️ Telling people to "be careful" isn't reproducible. The more you turn it into **procedure** (who to verify with, through which channel)
> and **mechanism** (permission scope, MFA method), the less it depends on any individual's judgment.

## Engineering Angles — Where Engineers Can Actually Move the Needle

It looks like a "people problem", but a lot of it can be **killed by design and operations**. Three concrete moves for the dev/ops side.

### Put Real Verification on Help-Desk Resets

Many recent major breaches started with an attacker posing as an employee to **ask the help desk for a password/MFA reset**,
and an operator helpfully complying. Require **mechanical verification, not a convincing story**, for resets.

```text
[weak]    "It's really me" → allow MFA re-enrollment on verbal explanation alone
[strong]  reset request → callback to pre-registered contact + manager approval + identity questions
          (require several of these, not just one)
```

### Beat Push-Bombing With Number Matching

One-tap approval pushes are weak to **push-bombing** — flooding the target with requests.
**Number matching** (the approver types a number shown on screen) means an accidental tap won't get through.

```text
[tap approve]  notification arrives → careless "Approve" → attacker is in
[number match] login screen shows "42" → approver must type "42" or it fails
```

### Never Pass Secrets Over Chat

Getting someone to **send an API key, password, or token over chat or email** is a prime impersonation target.
Don't hand secrets over by voice or chat — make a [dedicated handoff path](/en/posts/secrets-management/) the rule.

> 🧭 This is the same in C#/.NET: it's not a language or platform issue, it's a matter of **operational design**.
> On any stack, how you build the "reset procedure", the "MFA method", and the "secret handoff path" is what actually matters.

## Summary

- Social engineering attacks **people**, not code — the techniques all push **authority, urgency, or trust**
- Don't rely on training alone; use **out-of-band verification, least privilege, phishing-resistant MFA, and a blameless culture** so being fooled isn't game over
- Require **mechanical identity checks on help-desk resets** (the starting point of recent real breaches)
- Beat push-bombing with **number-matching MFA**, and **never pass secrets over chat**
- Much of the "people problem" can be **killed by engineers** once you turn it into procedure and mechanism

**Related:** [Phishing](/en/posts/phishing/) / [Credential Stuffing](/en/posts/credential-stuffing/) / [Secrets Management](/en/posts/secrets-management/)
