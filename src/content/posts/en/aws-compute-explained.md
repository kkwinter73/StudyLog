---
title: "Really Understanding AWS ② Compute (Containers and Serverless)"
date: 2026-06-20T05:00:00
summary: "Where do you actually run your app's code? Understand the differences between EC2, ECS/Fargate, and Lambda — starting from what a container is, all the way to service-to-service communication with Service Connect."
tags: ["AWS", "クラウド", "コンテナ"]
level: beginner
lang: en
translationKey: aws-compute-explained
---

> 📚 Series "Really Understanding AWS" (2 / 6)

Beyond the entrance we covered [last time](/en/posts/aws-networking-explained/) sits the "app" — and now the question is **where you actually run it**. There are three broad choices: VMs, containers, and functions.

## The three choices for "where to run your code"

| Approach | AWS | In a nutshell |
| --- | --- | --- |
| VM (virtual server) | EC2 | Rent a whole machine, OS and all. You can do anything, but you manage everything too |
| Container | ECS / Fargate | Pack your app into a box and run it. The star of this article |
| Function | Lambda | Deploy just your code's function; it runs only when called |

## What is a container (a quick recap)

A container is **a box bundling your app plus the dependencies it needs**. It runs the same way in any environment. For Go, it pairs nicely with [packing a single binary into a small image](/en/posts/deploying-go-apps/). The catch is "how many of these boxes do you run in production, and how do you keep them running?" — and that's the job of ECS, up next.

## ECS / Fargate = the container commander

- **ECS** is the **commander (the on-site foreman)** that takes care of things: "run two of this container, and if one dies, bring it back up."
- **Fargate** is the mode where you don't even have to think about the underlying servers. You just hand over the container, and AWS provisions the place to run it.

> 💡 With ECS (EC2 launch type) you have to manage the underlying EC2 instances yourself, but **with Fargate there's zero server management**. Think of it as "foreman = ECS, leave the workspace to AWS too = Fargate."

### Service Connect = wiring services together by name

Once your app splits into multiple services, they need to call each other. But as instance counts change and containers get swapped out, IPs change too. **Service Connect** gives each service a **name** and lets them communicate by name instead of IP (service discovery). You also get communication metrics.

## Lambda = a function that runs only when called

**Lambda** lets you deposit just your function's code, and it **starts up only when** a request or event arrives, billing you only for what runs. There's no long-running server. Picture a light with a motion sensor.

> 🧭 It's close in spirit to .NET's Azure Functions. In Go too, you just write a handler function and deploy it.

## So how do you choose?

```text
Long-running Web API, medium-to-large scale   → ECS / Fargate
Light work, low frequency, event-driven       → Lambda
Special requirements, fine control down to OS  → EC2
```

## Summary

- Three choices for where to run code: VM (EC2) / container (ECS) / function (Lambda)
- ECS is the container commander; Fargate is the mode that removes even the underlying servers
- Service Connect wires services together by name instead of IP
- Lambda is a function that runs only when called — good for low-frequency, event-driven work
- When in doubt: long-running → Fargate, light/event-driven → Lambda

Next time: where the app puts its "data."

**← Prev:** [① Networking and Delivery](/en/posts/aws-networking-explained/)
**→ Next:** [③ Where to Store Data](/en/posts/aws-data-stores-explained/)
