---
title: "AWS IGW and Subnet Masks — Dividing a VPC and Connecting It Outward"
date: 2026-06-24T09:00:00
summary: "A subnet mask is just another notation for CIDR. How you carve up a VPC's IP range, and how you connect it to the internet with an Internet Gateway (IGW). Two fundamentals for designing your own VPC."
tags: ["AWS", "クラウド", "ネットワーク"]
level: beginner
lang: en
translationKey: aws-igw-and-subnet-mask
---

When you build a [VPC](/en/posts/aws-networking-explained/) yourself, two things you can't avoid are the subnet mask that **divides** the IP range and the Internet Gateway (IGW) that **connects** that VPC to the outside. Building on your knowledge of [CIDR](/en/posts/ip-address-and-cidr/), let's nail down these two.

## What Is a Subnet Mask — Another Way to Write CIDR

A notation like `255.255.255.0` is a subnet mask. It's actually saying the **same thing** as [CIDR `/24`](/en/posts/ip-address-and-cidr/). Both express "how many bits from the start are the network portion" — `/24` uses a number, and the mask uses a run of 255s.

| CIDR | Subnet mask | Network portion |
| --- | --- | --- |
| `/24` | `255.255.255.0` | 24 bits |
| `/16` | `255.255.0.0` | 16 bits |
| `/28` | `255.255.255.240` | 28 bits |

> 💡 The "255" parts of the mask are the network portion, and the "0" parts are the host portion. Three `255`s = 24 bits = `/24`. Once you see that 255 = `11111111` in binary (all 8 bits set), odd values like `/28` start to make sense too.

## Dividing Into Subnets With a Mask

You assign a large range to the VPC (e.g. `10.0.0.0/16`) and then use a mask to carve it into subnets.

```text
VPC      10.0.0.0/16        (a lot with room for ~60,000 hosts)
 ├ Subnet A 10.0.1.0/24     (public: ~250 hosts)
 └ Subnet B 10.0.2.0/24     (private: ~250 hosts)
```

> ⚠️ AWS **reserves 5 addresses in every subnet — the first 4 plus the last one** (for the router, DNS, etc.). So in a `/24` (256 addresses) you can actually use only **251 hosts**. That's why it comes up short of the "254 you'd expect."

## What Is an Internet Gateway (IGW)

The IGW is **the front door that connects a VPC to the internet**. Attach one to a VPC and you have the foundation for resources inside the VPC to communicate with the outside. AWS makes it redundant and scalable on their side, so you never have to worry about how many you provision.

> 💡 It's easy to confuse with [NAT](/en/posts/aws-networking-explained/), but their roles differ. **IGW = a two-way front door** (both inbound from outside and outbound to outside). NAT = an exit for the "residents in the back" that lets them go out but never lets outsiders in.

## IGW + Route Table = Public Subnet

Just attaching an IGW doesn't connect anything. You need **a route table entry that "sends outbound traffic to the IGW."** A subnet that has this becomes "public."

| Subnet type | Destination for outbound (`0.0.0.0/0`) in the route table |
| --- | --- |
| Public | To the **IGW** (direct exchange with the outside) |
| Private | To **NAT** (outbound-from-inside only) |

```text
Conditions for a subnet to be public
 1. An IGW is attached to the VPC
 2. The route table has 0.0.0.0/0 → IGW
 3. The resource has a public IP (or an Elastic IP)
```

> ⚠️ The classic "I put it in a [public subnet](/en/posts/aws-networking-explained/) but it won't connect" case is one of these missing. Check the route, the public IP, and the [SG](/en/posts/aws-security-groups/) in that order.

## Summary

- A **subnet mask** (`255.255.255.0`) is another notation for [CIDR](/en/posts/ip-address-and-cidr/) (`/24`). The 255 parts are the network portion
- Use a mask to carve the VPC's large range into subnets. AWS **reserves 5 addresses** per subnet (a /24 gives 251 hosts)
- The **IGW** is the two-way front door connecting a VPC to the internet. Its role differs from NAT (inside → out only)
- A subnet becomes public once you attach an IGW and set **`0.0.0.0/0` → IGW in the route table**
- When it won't connect, check "IGW, route, public IP, SG" in order

Next steps: Try adding AWS's "route table / IGW" angle to [isolating connection problems](/en/posts/connection-troubleshooting/) and working through it in reverse.
