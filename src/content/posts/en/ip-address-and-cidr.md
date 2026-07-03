---
title: "Using Networks Properly ① IP Addresses and CIDR"
date: 2026-06-23T13:00:00
summary: "What's the difference between private and global IPs, and how do you read CIDR notation (like /24)? Get a handle on the 'grammar of addresses' that underpins AWS VPC design and troubleshooting."
tags: ["ネットワーク", "基礎"]
level: beginner
lang: en
translationKey: ip-address-and-cidr
---

> 📚 Series "Using Networks Properly" (1 / 5)

The foundation of any network is the "address of a device" — the IP address. Once you understand the **difference between private and global** IPs and the **CIDR notation** that expresses ranges, [AWS VPC design](/en/posts/aws-networking-explained/) and connection troubleshooting become much easier to read.

## What is an IP address?

An IP address is the **address** assigned to each individual device on a network. Without it, there's no way to decide where data should be delivered. The familiar `192.168.1.10` is **IPv4** notation (8 bits × 4 = 32 bits).

## Private IP vs. global IP

Addresses come in two flavors: "numbers that only make sense inside the house" and "numbers that are unique worldwide."

| | Private IP | Global IP |
| --- | --- | --- |
| Scope | Only within a LAN (office, home) | Unique across the whole internet |
| Who assigns it | You can pick freely yourself | Assigned by your ISP / cloud provider |
| Example ranges | `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` | Anything outside the above |

> 💡 A private IP is like the "room number inside an apartment building," while a global IP is the "official postal address that mail can reach." Room numbers (private) can't be reached directly from outside, so traffic is translated to a global IP (NAT) on its way out.

## How to read CIDR notation

In `192.168.1.0/24`, the **`/24`** is the CIDR. It tells you **"how many bits from the front are the network part."**

- Out of 32 bits, `/24` means the first 24 bits are the "network" (which block), and the remaining 8 bits are the "host" (each device within the block)
- The number of host bits determines how many devices can fit in that block

| CIDR | Network part | Usable addresses (approx.) | Mental image |
| --- | --- | --- | --- |
| `/24` | 24 bits | ~254 devices | A small block |
| `/16` | 16 bits | ~65,000 devices | A large block |
| `/32` | 32 bits | 1 device, pinpoint | Single-host specification |

> 💡 **The smaller the number, the wider the range** (`/16` is wider than `/24`), because there are more host bits.

## How this matters for AWS VPC

When you create a VPC (your own private network in the cloud), the first thing you decide is the CIDR.

- Example: assign `10.0.0.0/16` to the VPC, then split it into subnets like `10.0.1.0/24` (public) and `10.0.2.0/24` (private)
- Security group allow rules are also written in CIDR, e.g. "allow traffic from `10.0.0.0/16`"

> 🧭 Expressing "which range of sources is allowed to connect" in CIDR is the same whether you're on AWS or behind an in-house firewall. `0.0.0.0/0` means "all bits free = from anywhere," a classic notation to watch out for when you're exposing too much.

## Summary

- An IP address is a device's **address**. IPv4 like `192.168.1.10` is the basics
- There are **private IPs** (LAN-only) and **global IPs** (unique worldwide), with NAT translating between them
- **CIDR `/n`** means "the first n bits are the network part." **The smaller the number, the wider the range**
- VPCs and security groups specify ranges in CIDR. `0.0.0.0/0` means "from anywhere"

**→ Next:** [② Ports and TCP communication](/en/posts/ports-and-tcp/)
