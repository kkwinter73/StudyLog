---
title: "Really Understanding AWS ① Networking and Delivery"
date: 2026-06-20T06:00:00
summary: "VPC, subnets, NAT, ALB, CloudFront, Route 53, ACM. One at a time, using 'why you need it → what it is (an analogy) → how it connects', we build up an understanding of AWS networking from the concepts."
tags: ["AWS", "クラウド", "ネットワーク"]
level: beginner
lang: en
translationKey: aws-networking-explained
---

> 📚 Series "Really Understanding AWS" (1 / 6)

Just looking at the names of AWS services tells you nothing about what they are. This series builds understanding from the concepts up, using **"why you need it → what it is → how it connects"**. Part 1 covers networking and delivery.

## Why you need "your own private network"

If you just put a server on the internet, anyone can reach it. So instead you **create your own private plot, fence it off, and only open holes for the parts you want to expose**. That plot is the VPC.

## What a VPC is (analogy: your own fenced-off land)

A VPC is **your own private plot of land, fenced off** within AWS's vast territory. You decide the range of IP addresses you'll use and place your servers inside it. You design the entrances and exits to the outside yourself.

### Subnets: dividing the plot into sections

You further divide the plot into sections (subnets). Two types matter.

- **Public subnet** = the section facing the road. You place things that are fine to be seen from outside (like an ALB) here
- **Private subnet** = the section in back. You place things you don't want touched directly from outside (apps, databases) here

> 💡 Hide your apps and databases in the back (private) and expose only the entrance (public). This is the fundamental way to protect things.

### NAT: the exit that lets residents in the back "go out"

Even apps sitting deep in the private section sometimes need to **go out** — to call an external API or fetch an update. But you don't want anyone coming in from outside. NAT is that exit that lets you "go from inside to outside, but not from outside to inside".

| | What it is | Characteristics |
| --- | --- | --- |
| **NAT Instance** (chosen) | Running the NAT role yourself on EC2 | Cheap, but redundancy and scaling are manual |
| **NAT Gateway** (not chosen) | A managed NAT provided by AWS | Easy and highly available, but pricier |

## Services around the entrance

### ALB = traffic control at the entrance

An **ALB (load balancer)** is the receptionist that distributes visitors across multiple apps. It spreads out the load, and it can also **route by path** — `/api` goes here, and so on.

### CloudFront = a nearby caching outpost (CDN)

Going all the way back to a distant home base every time is slow. **CloudFront** **caches content at outposts (edges) around the world and delivers it from a location near the user**. Think of it like picking up your order at the convenience store around the corner. **Lambda@Edge** is a mechanism for slipping in a bit of small processing (redirects, header rewriting) right at that edge.

### Route 53 = the phone book of addresses (DNS)

**Route 53** is the DNS that translates `example.com` into the location of the correct entrance. It handles name resolution for domains.

### ACM = the key for https

**ACM** issues and **automatically renews** the TLS certificates (the keys for https) that encrypt communication. You use it by attaching it to an ALB or CloudFront.

## How it connects

```text
User
  → Route 53        (looks up the name and points to the entrance)
  → CloudFront      (delivers from nearby, https via ACM)
  → ALB             (traffic control and distribution)
  → App (private)
        └─ When calling an external API, goes out via NAT
```

## Summary

- A VPC is your own fenced-off private network. You divide the inside into sections with subnets
- Put things that are fine to expose in public, and things you want hidden (apps, databases) in private
- NAT is the exit that "lets you go from inside to outside, but not from outside in"
- ALB does traffic control, CloudFront does nearby cache delivery, Route 53 is DNS, ACM is the key for https
- The flow is Route 53 → CloudFront → ALB → App

Next time we look at where that app itself actually runs — the compute edition.

**→ Next:** [② Compute (Containers and Serverless)](/en/posts/aws-compute-explained/)
