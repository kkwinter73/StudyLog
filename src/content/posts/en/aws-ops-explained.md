---
title: "Really Understanding AWS #6: Image Management, Operations & Monitoring"
date: 2026-06-20T01:00:00
summary: "The container image store (ECR), monitoring and logs (CloudWatch), and cost control (Budgets). Understand the operational plumbing that keeps #1–#5 running day to day, and recap the whole series on a single page."
tags: ["AWS", "クラウド", "運用"]
level: beginner
lang: en
translationKey: aws-ops-explained
---

> 📚 Series "Really Understanding AWS" (6 / 6 · final)

To close things out: the plumbing that **keeps everything we've built running day to day**. It's unglamorous, but without it operations fall apart.

## ECR = The Store for Container Images

To run the container image we built in [#2](/en/posts/aws-compute-explained/) in production, you need somewhere to put it and pull it from. That **dedicated warehouse (registry) for images** is **ECR**. It's the AWS version of Docker Hub, and you can keep images private.

```text
CI builds → push to ECR → ECS/Fargate pulls and starts
```

## CloudWatch = The Eyes on Your System

Once it's running, you need to see whether it's **actually working**. **CloudWatch** is those eyes.

- **Metrics**: numbers like CPU, memory, and latency
- **Logs**: aggregates logs from each service
- **Alarms**: notify you when a threshold is crossed (e.g., a spike in errors goes to Slack)
- **Dashboards**: an at-a-glance overview of state on one screen

> 💡 In [Intro to Infrastructure](/en/posts/deploying-go-apps/), I said "write logs to standard output" — this is why. CloudWatch Logs picks them up and aggregates them for you. The app just has to emit them.

## Budgets = The Watchdog Against Overspending

Since the cloud is pay-as-you-go, it's easy to **forget to shut something down or rack up unexpected charges**. With **Budgets**, you set a budget and get an alert when you're about to exceed it. The more it's a learning or dev environment, the earlier you'll want this in place.

## The Whole Series on One Page

Here's how #1–#6 fit together —

```text
[#1 Networking] User → Route53 → CloudFront → ALB
                                                  │
[#2 Compute]                              ECS/Fargate (Service Connect)
                                                  │
[#3 Data]                          RDS / ElastiCache / S3 / DynamoDB
[#4 Messaging]   Async: SQS / SNS / EventBridge   Email: SES
[#5 Security]    IAM, Secrets/Parameter, SSM, KMS protect the whole thing
[#6 Operations]  ECR (images) / CloudWatch (monitoring) / Budgets (cost)
```

## Wrap-up

- ECR is the store for container images. The flow to production is CI → ECR → ECS
- CloudWatch is the eyes on your system, watching via metrics, logs, and alarms
- The app just writes logs to standard output; leave aggregation to CloudWatch Logs
- Set up budget alerts with Budgets to catch overspending early
- #1–#6 come together as one architecture: "entry → compute → data → integration → defense → operations"

That wraps up the "Really Understanding AWS" series. Even the individual service names aren't scary once you look at them through the lens of "what problem does this solve?"

**← Prev:** [#5 Security & Configuration Management](/en/posts/aws-security-config-explained/)
**↩ Back to the start of the series:** [#1 Networking & Delivery](/en/posts/aws-networking-explained/)
