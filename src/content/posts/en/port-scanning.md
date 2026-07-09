---
title: "Port Scanning — Recon Before an Attack, and Shrinking Your Attack Surface"
date: 2026-07-09T16:30:00
summary: "Attackers don't swing first — they first map which ports are open and what's running. This post covers how that reconnaissance works, and how defenders use the same tools to audit and shrink their own attack surface."
tags: ["セキュリティ", "ネットワーク"]
level: beginner
lang: en
translationKey: port-scanning
---

A look at port scanning — the classic "reconnaissance" that attackers always do before the real attack. The conclusion up front: **an open port is attack surface**, so the defender's job boils down to "close the ports you don't need, and scan yourself to confirm."

## How the Attack Works — Scanning Is Casing the Joint

A server [listens for a service on each port number](/en/posts/ports-and-tcp/). An attacker first sweeps the target mechanically to learn which ports are open, and looks there for a **way in**. That's reconnaissance.

- Knowing the **open ports** lets them guess what service runs there (SSH, HTTP, DB, and so on)
- Knowing the service lets them pin down the **version**, and check whether that version has known vulnerabilities
- So the output of a scan is "a map of where to attack and with what." The attack comes after.

There are several scan styles; the two classic ones are below.

| Style | What it does | Character |
| --- | --- | --- |
| **TCP connect** | Completes the full three-way handshake normally | Reliable, no privileges needed, but the connection tends to land in logs |
| **SYN scan** | Sends only SYN, judges open/closed from the reply (SYN-ACK / RST), then aborts with RST | "Stealthy" since it never completes the connection; needs admin privileges |

> 💡 A SYN-ACK back means "open," an RST means "closed," and no reply is read as "filtered (a firewall is in the way)." The mere presence or absence of a reply is information.

The go-to tool is `nmap`. It checks hundreds of ports in a short time and can even guess the service and version.

## The Defensive Principle — Shrink the Attack Surface

The core of defense is to minimize the face you show attackers. A port that isn't open can't be attacked.

- **Close ports you aren't using**: stop services you don't run. Treat "open" as "a target"
- **Deny by default**: build firewalls and [security groups](/en/posts/aws-security-groups/) as "deny everything by default, allow only what's needed." Make it an allowlist
- **Don't expose internal services**: keep DBs, admin panels, and monitoring ports off the public internet — limit them to the internal network or a VPN
- **Keep exposed services patched**: for ports you must open (80/443, etc.), keep the software on them current. The moment recon sees an "old version," you're a target

> ⚠️ The most dangerous kind is "a port that was open without anyone noticing." An admin port nobody uses, or one opened for testing and never closed, is an attacker's ideal doorway.

> 🧭 In dev terms it's the same as "delete unused feature flags and public endpoints." Adding exposure is easy; forgetting to remove it causes incidents. Shrink attack surface with the same mindset.

## How You Deal With It in Practice — Audit Yourself With the Same Tools

Recon tools aren't only for attackers. The practical use is for **defenders to scan their own hosts and confirm "what's visible from outside"** (only ever against assets you own).

First, check what's actually listening on the host with `ss`.

```bash
# List LISTENing TCP ports and their processes (-t TCP / -l LISTEN / -n numeric / -p process)
ss -tlnp
# On older boxes, netstat does the same
netstat -tlnp
```

Next, check how you look from outside by running `nmap` against your own host.

```bash
# Discover your host's open ports and service/version (-sV enables version detection)
nmap -sV 203.0.113.10
```

- If a **port you didn't intend to open** shows up here, that's attack surface to remove
- In the cloud, cross-check the results against your [security group](/en/posts/aws-security-groups/) rules. "The SG is supposedly closed but nmap can see it" means a misconfiguration — and the reverse is worth auditing too
- A flood of scans arriving from outside is itself a signal. Extreme ones can be a precursor to [DoS/DDoS](/en/posts/dos-ddos/), so watch it alongside your access logs

> ⭐ Attacker and defender look at the same map. The difference is the defender gets to **see it first and seal it**. Make scanning yourself a habit, and check that your open surface is what you intended.

## Summary

- Port scanning is **reconnaissance** before an attack — finding a way in from open ports plus service and version
- The classic styles are **TCP connect (reliable, lands in logs)** and **SYN scan (stealthy, needs privileges)**
- The defensive principle is to **shrink attack surface**: close unused ports, deny-by-default in FW/SG, don't expose internal services, and keep things patched
- Defenders **scan themselves with the same nmap**, cross-check against `ss`/`netstat` LISTEN state, and kill unintended exposure
- In the cloud, reconciling results with **security group rules** is the standard practice

**Related:** [Ports and TCP](/en/posts/ports-and-tcp/) / [AWS Security Groups](/en/posts/aws-security-groups/) / [DoS/DDoS](/en/posts/dos-ddos/)
