---
title: "Penetration Testing — Confirming, From an Attacker's View, Whether It Can Really Be Broken"
date: 2026-07-14T12:00:00
summary: "A penetration test (pentest) is the practice of taking on an attacker's role — with permission — and testing whether you can actually break a system. Here's how it differs from a vulnerability scan, the flow from recon to reporting, the types by prior information and target, the all-important 'authorization and scope,' and finally what it does and doesn't tell you."
tags: ["セキュリティ", "テスト"]
level: intermediate
lang: en
translationKey: penetration-testing
---

A **penetration test (pentest)** is the practice of taking on an **attacker's role** — with permission —
and testing whether you can actually break a system. The crux isn't just to "find" vulnerabilities but to **exploit them and demonstrate the impact**.
This post isn't concrete attack steps; it's for grasping **what a pentest is as a practice, and what to watch out for**.

## What a pentest is — and how it differs from a vulnerability scan

They're often confused, but a **vulnerability scan** and a **pentest** are different things — in purpose and in depth.

| | Vulnerability scan | Pentest |
| --- | --- | --- |
| What it does | **exhaustively enumerate** known weaknesses | **actually exploit** weaknesses to attempt entry |
| Depth | shallow and wide (mostly automated) | deep (manually **chaining** weaknesses) |
| Output | a list of weaknesses | a **demonstration** of "I got this far" and its impact |
| Analogy | checking every lock in the house one by one | actually **breaking in** through an unlocked one |

> ⭐ A pentest's value isn't "there *might* be a vulnerability" but "through this path I **actually got this far**" — a demonstration.
> That's what informs leadership and prioritization. Seeing the **chain** of weaknesses, not a single one, is the human work.

## The flow — from recon to reporting

Most pentests follow the attacker's motions in this sequence.

1. **Recon (info gathering)**: collect the target's public info and setup ([port scanning](/posts/port-scanning/), OSINT)
2. **Enumeration**: surface open entrances, the tech in use, accounts
3. **Exploitation**: hit a found weakness to gain a foothold (e.g. [SQL injection](/posts/sql-injection/))
4. **Privilege escalation / lateral movement**: from user to admin, from one host to the next ([privilege escalation/IDOR](/posts/privilege-escalation-idor/))
5. **Reporting**: write up the path, reproduction, impact, and **the fix**. This is the final deliverable

> 💡 Ordinary testing checks "does it **work** as specified." A pentest is the reverse — testing "can the spec be **broken**," from an attacker's view.
> Same word "test," opposite goal, and it centers on **human work** that can't be fully automated.

## Types — split by prior information and target

The kind changes with "how much you're told to begin with" and "what you aim at."

- **Amount of prior info**: tell nothing = **black box** / tell some = **gray box** / hand over design and source = **white box**
- **Position**: **external** testing from outside / **internal** testing assuming an attacker is already inside
- **Target**: web app / network & infra / wireless / physical entry / **people** ([social engineering](/posts/social-engineering/))

> 💡 The less info, the "closer to a real attacker" — but it takes longer and misses more. Conversely, white box with source
> has **higher coverage**. Choose by budget and goal.

## The premise is "authorization" — testing without permission is an attack

Get this wrong and it's a **crime**. A pentest starts not with technique but with **procedure**.

- **Written permission**: get explicit consent from the target's owner. Verbal doesn't count. Unauthorized access is illegal
- **Scope**: **clearly delineate** the target hosts, IPs, domains. Never touch anything out of scope
- **Rules of engagement (ROE)**: agree up front on the time window, forbidden techniques (e.g. no DoS), stop conditions, emergency contacts
- **Care for production**: don't destroy or steal data. If needed, run against a copy of production

> ⚠️ "Testing the company's system on your own because you think it's helpful" is **out**. Well-meant but unauthorized is the same as an attack.
> A pentest is a test precisely because it runs **within an authorized scope under agreed rules** — otherwise it's just a break-in.

## What it does and doesn't tell you

Powerful, but not omnipotent. Over-trusting it is dangerous.

- **Tells you**: paths that can actually be exploited and their impact (how far you reached). What to fix, in what order
- **Doesn't tell you**: a guarantee that "there are no more vulnerabilities." A test is only **a cross-section of that moment and that scope**
- **No substitute for**: building security in from the design stage (secure SDLC) or day-to-day [dependency vulnerability](/posts/dependency-vulnerabilities/) work
- **Don't make it one-and-done**: repeat it on every major change and periodically, and **fix the findings and re-test**

## Summary

- A pentest (penetration test) takes on an **attacker's role with permission and demonstrates whether it can actually be broken**
- It's **different from a vulnerability scan** (exhaustive, shallow, enumerating). A pentest goes deep, **chaining** weaknesses to break in
- The flow is **recon → enumeration → exploitation → privilege escalation/lateral movement → reporting**. The deliverable is "a report that also says how to fix it"
- **The most important thing is authorization**. Testing without written permission, scope, and ROE is an attack — even if well-meant
- What it tells you is "the path that was actually breached." **Not "a guarantee of zero vulnerabilities."** Repeat it periodically; fix and re-test

**Related:** [Port Scanning](/posts/port-scanning/) / [SQL Injection](/posts/sql-injection/) / [Privilege Escalation and IDOR](/posts/privilege-escalation-idor/) / [Social Engineering](/posts/social-engineering/)
