---
title: "Ransomware — Encryption, Ransom, and Backups as Insurance"
date: 2026-07-09T19:00:00
summary: "Ransomware encrypts your data and demands a ransom. This post covers how the attack works at a conceptual level and why an offline, restore-tested backup is the only insurance that actually pays out."
tags: ["セキュリティ", "運用"]
level: beginner
lang: en
translationKey: ransomware
---

Ransomware takes your data hostage by encrypting it, then demands a ransom in exchange for the decryption key. Here we understand the attack at a conceptual level and, from the defender's side, work out **why backups are the only reliable insurance**.

## How the Attack Unfolds

It doesn't rely on novel cryptography — the damage spreads through a chain: **intrusion → lateral movement → encryption → extortion**.

| Stage | What happens |
| --- | --- |
| **Initial access** | Entry via [phishing](/en/posts/phishing/), exposed RDP, or unpatched flaws ([zero-days](/en/posts/zero-day/) or known CVEs) |
| **Lateral movement** | Harvest credentials from one host and spread to other servers on the network |
| **Encryption** | Encrypt reachable files, shared storage, and even connected backups |
| **Extortion** | Demand a ransom for the key. Modern actors also **double-extort**: steal data before encrypting |

> ⚠️ In double extortion the threat is "pay or we publish what we stole." **Restoring from backup can't undo a data leak** — so backups aren't a cure-all; you still need defense-in-depth to avoid intrusion in the first place.

## Why "Just Pay" Isn't a Fix

Paying doesn't guarantee you get a working key, and even when you do, recovery is often incomplete. And once you're known as an organization that pays, you get targeted again. **A plan that assumes paying is not a plan.**

> 💡 For attackers, ransomware is a division-of-labor business (RaaS — Ransomware as a Service). Targets aren't just big companies but **any organization likely to be unable to recover and therefore willing to pay** — small businesses and municipalities with weak backups are hit just as readily.

## The Insurance That Works: 3-2-1 Backups

You may not be able to prevent the encryption itself. But **if you can restore, the ransom becomes unnecessary.** The core is the 3-2-1 rule.

- **3** copies (production plus two backups)
- **2** different media types
- **1** copy kept **offline / off-site** (i.e., disconnected from the network)

```text
Bad:   production ──always mounted──> backup NAS
       → encryption reaches from production straight through to the NAS; backups die with it

Good:  production ──> backup ──> offline / immutable storage
                                 (cannot be overwritten or deleted = object lock)
```

> ⭐ What matters most is **immutability and being offline.** Attackers try to delete reachable backups before encrypting. An always-connected backup is "part of production wearing a backup costume."

## Stopping Intrusion and Lateral Movement

Backups are the last line. In front of them, reduce the damage.

- **Narrow the entrance**: MFA, close exposed RDP, [close known CVEs in dependencies](/en/posts/dependency-vulnerabilities/), patch fast
- **Stop the spread**: network segmentation and [least privilege](/en/posts/auth-boundary-edge-vs-app/) — one fallen host shouldn't take down everything
- **Notice early**: monitoring and EDR that detect abnormal mass encryption / file changes

> 🧭 This isn't defended by any one language feature. It's the same in C#/.NET or Go — what works is **operational design, not application code**: backups, privilege separation, patching, and detection.

## A Backup Is Only a Backup Once You've Restored It

The most overlooked point: **a backup you've never restored is not a backup.**

- Run **restore drills** regularly — confirm you can actually recover and measure how long it takes
- Write an incident-response plan (who decides what) [ahead of time](/en/posts/system-migration-strategy/)
- Keep the recovery procedure outside (offline from) the environment that could be encrypted

## Summary

- Ransomware follows **intrusion → lateral movement → encryption → extortion**; modern actors **double-extort** by stealing data before encrypting
- **Paying doesn't guarantee recovery.** A plan that assumes paying isn't a plan
- The only insurance that works is **3-2-1 backups**, especially an **offline / immutable** copy
- In front of that, layer **MFA, patching, segmentation, least privilege, and detection** to shrink intrusion and spread
- **A backup with no restore drill is worthless** — prove you can recover before you need to

**Related:** [Phishing and Spear Phishing](/en/posts/phishing/) / [Zero-Day](/en/posts/zero-day/) / [Supply Chain Attacks](/en/posts/supply-chain-attack/)
