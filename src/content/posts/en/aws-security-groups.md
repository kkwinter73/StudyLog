---
title: "AWS Security Groups — Which Traffic Do You Allow?"
date: 2026-06-23T20:00:00
summary: "Once you've fenced off your VPC and subnets, the last question is 'which traffic gets through?' Meet the virtual firewall that stands in front of each instance — the security group. We cover the core idea, inbound/outbound, SG references, and how it differs from a NACL."
tags: ["AWS", "クラウド", "ネットワーク"]
level: beginner
lang: en
translationKey: aws-security-groups
---

In [the AWS networking post](/en/posts/aws-networking-explained/), we fenced off our property with a VPC and subnets.
What's left is **deciding which traffic to let through and which to block**. That job belongs to the **security group (SG)**.
This is the AWS version of what we called the "firewall" in [the connection troubleshooting post](/en/posts/connection-troubleshooting/), viewed from the angle of building allow rules.

## What Is a Security Group?

An SG is a **virtual firewall that stands in front of each resource** — an EC2 instance, an [ECS task](/en/posts/aws-compute-explained/), and so on.
It holds an **allow list**: "let only this traffic, from this source, reach this port."

> ⭐ An SG is a **whitelist**. By default everything is closed, and **only the traffic you explicitly allow** gets through.
> You can't write deny rules (you only write "allow"). So when something "won't connect," the first thing to suspect is "did I just never allow it?"

## Inbound and Outbound

Rules go in two directions. You configure **incoming traffic** and **outgoing traffic** separately.

| Direction | What it controls | Typical example |
| --- | --- | --- |
| Inbound | Outside → this resource | "Allow 8080 from the ALB" |
| Outbound | This resource → outside | Often allow-all by default |

```text
Inbound example (a web app task)
  Allow: port 8080  source: the ALB's SG     ← only accept from the ALB
  Allow: port 22    source: your office IP/32 ← SSH only from yourself
```

## Stateful — Return Traffic Is Allowed Automatically

An SG is **stateful**. For traffic you allowed inbound, the **response (the return trip) is allowed automatically, without writing an outbound rule**.

> 💡 "Once you let the request to 8080 through, its reply can go back automatically." So there's no need to dutifully write a return rule.
> This means the SG remembers [the whole TCP round trip](/en/posts/ports-and-tcp/) as a single conversation.

## SG References — "Allow by the Other Side's SG, Not by IP"

A powerful feature of SGs is that the source can be **not just an IP but another SG**.

```text
DB's SG: "Allow port 5432 from the app's SG"
```

- Since no IP is written, you don't need to touch the rule no matter how many app instances you scale to, or [even if the IP changes](/en/posts/container-network-and-data/)
- The classic pattern is to wire up a three-tier "web → app → db" by having each layer reference the others' SGs

> 🧭 It's the same idea as [connecting containers by service name](/en/posts/container-network-and-data/).
> "Allow by role (SG/name) rather than by the moving target (IP)," and you become resilient to changes in instance count or IP.

## How It Differs from a NACL

There's another filter at the subnet boundary — the **NACL**. Its role differs, so don't confuse the two.

| | Security group | NACL |
| --- | --- | --- |
| Scope | Per resource (ENI) | Per subnet |
| State | Stateful (return automatic) | Stateless (return must be explicit too) |
| Rules | Allow only | Both allow and **deny** |
| When to use | Usually the main tool | Auxiliary, e.g. blocking a specific IP |

> ⚠️ For everyday "which traffic do I allow?" decisions, **build it with the SG** — that's the baseline. The NACL is a supplementary layer that
> applies to the whole subnet. When "only prod won't connect," the [classic culprit](/en/posts/connection-troubleshooting/) is the SG, so look there first.

## Summary

- An SG is a **virtual firewall in front of a resource**. It's a whitelist (only allowed traffic gets through)
- Rules go in two directions: **inbound/outbound**. Because it's **stateful**, return traffic is allowed automatically
- The source can be **another SG (an SG reference)**, letting you build a three-tier setup that's resilient to changes in IP and instance count
- The **NACL** is a supplementary layer — per subnet, stateless, and can write denies too. The SG is the star
- How an ECS task or EC2 instance "talks to the outside" ultimately comes down to these SG allow rules

Next up: take "only prod times out" from [the connection troubleshooting post](/en/posts/connection-troubleshooting/) and trace it back from the SG's inbound rules.
