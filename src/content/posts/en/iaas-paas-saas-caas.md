---
title: "IaaS / PaaS / SaaS / CaaS — Sorting Them Out by \"How Much You Manage Yourself\""
date: 2026-06-23T19:00:00
summary: "The cloud \"XaaS\" models differ in where you draw the line between what you manage and what you hand off. Line up all four along a single axis of management scope and map them to concrete AWS services."
tags: ["クラウド", "基礎"]
level: beginner
lang: en
translationKey: iaas-paas-saas-caas
---

IaaS, PaaS, SaaS, CaaS — the names look alike, but the difference comes down to a single axis:
**where you draw the line between what you manage yourself and what you hand off to the cloud.** Let's line up all four along that axis.

## The common idea: drawing the management line

To run an app you need a stack of layers from the bottom up: "hardware → OS → middleware/runtime → app → data."
**Which layer up you own** is what changes the "XaaS" name. The more you hand off, the easier it gets — but the less freedom you have.

> 💡 Think of it like pizza: bake it from the dough yourself (DIY), take it out (IaaS), have it delivered (PaaS), or eat it at the restaurant (SaaS). Only "how much you do with your own hands" changes — the goal of eating the pizza (the app) is the same.

## The differences between the four models

| Model | What you rent | You manage | The cloud manages | Examples |
| --- | --- | --- | --- | --- |
| IaaS | Infrastructure (VMs, networking) | Everything from the OS up | Hardware, virtualization | EC2, GCE |
| CaaS | Container runtime environment | The container (image) and its contents | OS, platform | ECS/Fargate, GKE |
| PaaS | App runtime platform | Just your app code | OS, runtime, platform | Heroku, App Engine |
| SaaS | Finished software | Just settings and data | The whole software | Gmail, Slack |

Going from top to bottom, **you hand off more and touch less yourself.**

## Where CaaS sits

CaaS (Containers as a Service) sits **between IaaS and PaaS.**
Hand it a [container](/en/posts/registry-and-compose/) and it runs it for you, but you don't have to think about the OS itself.

- IaaS (EC2): You look after the OS too. Free, but heavy to manage.
- CaaS ([ECS/Fargate](/en/posts/aws-compute-explained/)): Just hand over a [container image](/en/posts/image-layers-multistage/). No OS management needed.
- PaaS (Heroku): Just hand over your code. Even the containerization is hidden.

> 🧭 As containers spread, demand grew for "hand off the OS, but let me lock down the runtime myself (via an image)," and CaaS became the answer. It sits in the sweet spot that takes the best of both — IaaS's freedom and PaaS's convenience.

## How to choose

```text
Want fine-grained control over OS and network config   → IaaS (EC2)
Want to run an environment locked down in a container   → CaaS (ECS/Fargate)
Want to just drop code and hand off operations entirely → PaaS
Don't want to build at all — just use off-the-shelf     → SaaS
```

> ⚠️ "More freedom" doesn't mean "better." **The scope you manage is your operational burden, plain and simple.** Pick a layer that's too low-level for your requirements and you take on operations you didn't need to.

## Summary

- The XaaS differences all sort out along one axis: **from which layer up you manage things yourself.**
- The scope you hand off grows in order: **IaaS** (from the OS up) → **CaaS** (container) → **PaaS** (just code) → **SaaS** (finished product).
- **CaaS sits between IaaS and PaaS.** Hand over a container and it runs (no OS management needed).
- The more you hand off, the easier it gets, but the less freedom you have. **Management scope = operational burden.**
- Picking the highest layer that still fits your requirements is the trick to avoiding excess operations.

Next up: In [the AWS compute post](/en/posts/aws-compute-explained/), we'll get concrete about when to use EC2 (IaaS), Fargate (CaaS), and Lambda.
