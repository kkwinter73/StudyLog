---
title: "Zero-Day — Exploiting a Vulnerability With No Patch Yet"
date: 2026-07-09T18:30:00
summary: "A zero-day is a vulnerability the vendor doesn't yet know about, with no patch available. This post sorts out the timeline and what \"zero days to fix\" means, then covers defense in depth for when there's no patch, shrinking the blast radius, and being ready to answer \"are we affected?\" fast when disclosure hits."
tags: ["セキュリティ", "基礎"]
level: intermediate
lang: en
translationKey: zero-day
---

Notes on what to watch out for with "zero-day attacks." The conclusion up front: **you can't patch a vulnerability that has no patch** — so the defense isn't a single control but defense in depth plus a "detect fast and contain" posture. Here we walk through the mechanics, the principles, and how a team actually deals with it.

## How the Attack Works — What "Zero Days to Fix" Means

A zero-day is a **vulnerability the vendor doesn't yet know about, with no patch in existence** — or an attack that exploits one. The name comes from the fact that defenders have been given zero days of lead time to fix it. Once a vulnerability exists, the timeline roughly runs like this.

```text
discovery   someone (researcher or attacker) finds the flaw
   ↓
exploit     attackers use it in the wild ← this window is the "zero-day"
   ↓
disclosure  vendor/researcher makes it public (a CVE is assigned)
   ↓
patch       a fixed version is released
   ↓
n-day       unpatched systems keep getting hit after the fix (an "n-day" flaw)
```

- The essence of a zero-day is that **exploitation runs ahead of disclosure and the patch**. Defenders are attacked through a hole they don't know about, with no means to fix it. This is what fundamentally sets it apart from routine vulnerability handling ([dependency vulnerabilities](/en/posts/dependency-vulnerabilities/))
- **Log4Shell** (the Log4j flaw) in 2021 is an example where worldwide exploitation began the moment it went public. Whether you could instantly answer "where do we use Log4j?" made a huge difference to how fast you could respond

> ⚠️ The "n-day" phase, after a patch exists, is just as dangerous. Exploit code circulates the moment a flaw is disclosed, so **slow-to-update systems get actively targeted**. Zero-day defense and fast patching are one continuous concern.

## The Principles — Surviving Without a Patch

Since you can't seal the hole with a patch, the defense is not a single wall but **defense in depth**: if one layer is breached, the next one stops the damage.

| Principle | What you do | How it helps |
| --- | --- | --- |
| **Least privilege** | Give processes and accounts only the minimum rights they need | Even if breached, the reach from that foothold is narrow |
| **Virtual patching** | Block known attack patterns up front with a WAF/IPS | Even when you can't fix the code, you temporarily close the entry point |
| **Fast detection & response** | Monitor for abnormal behavior and have a containment playbook | Assuming you *can't* prevent it, minimize the attacker's dwell time |
| **Shrink the blast radius** | Segment the network to wall off impact | If one host falls, it doesn't cascade to everything |

- None of these is solved by **a specific language feature or product**. You stack layers to build a structure that "isn't fatal even when breached"
- And the unglamorous but most important piece is the **inventory**. When disclosure hits, if you don't know "where that component lives in our systems," you can't even begin to assess impact

> 🧭 The thinking is identical in C#/.NET. You don't defend with a language feature — you run with least privilege and stack a WAF, network segmentation, and monitoring in front. **Defense in depth is a design principle independent of language.**

## How a Team Actually Deals With It — Answering "Are We Affected?" Fast

What a dev/ops team does about zero-days boils down to preparation in peacetime. The moment disclosure lands, you're asked: are we affected, where, and how fast can we fix it? Build a state where you can answer that quickly.

- **Keep an SBOM / inventory**: a list of which libraries and versions you use, and where (a Software Bill of Materials). The gap during Log4Shell was exactly here

```bash
# Export your dependency tree as an SBOM-equivalent ahead of time (examples)
go list -m -json all          # Go: emit dependency modules and versions, machine-readable
syft dir:. -o spdx-json       # cross-language: generate an SBOM in SPDX format
```

- **Be able to patch fast**: the path from swapping a dependency to redeploying should be short as a matter of routine. Teams for whom an emergency update is "special work" are slow off the mark
- **Detect exploitation via monitoring**: [observe](/en/posts/what-to-measure-metrics/) abnormal requests, outbound traffic, and privilege escalation so you can catch "signs of being attacked" — this too is one layer of defense in depth

> 💡 There is no "perfect prevention up front" for zero-days. What works in practice is a three-part set: **an inventory that lets you start impact assessment in seconds**, **a path to re-patch within the day**, and **monitoring that notices exploitation**.

## Summary

- A zero-day is a flaw **unknown to the vendor, with no patch**. Its essence: exploitation runs ahead of disclosure and the fix
- Since there's no patch, defense is **defense in depth** — least privilege, virtual patching, fast detection, shrinking the blast radius
- **No single language feature defends you.** Stack layers into a structure that "isn't fatal even when breached"
- What matters at disclosure time is an **SBOM/inventory**. Being able to quickly judge "are we affected?" is the lifeline
- Zero-day defense is continuous with **fast patching**. Keep the update path short so you aren't picked off in the n-day phase

**Related:** [Dependency Vulnerabilities](/en/posts/dependency-vulnerabilities/) / [Supply Chain Attacks](/en/posts/supply-chain-attack/) / [Ransomware](/en/posts/ransomware/)
