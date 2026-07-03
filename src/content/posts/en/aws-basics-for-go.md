---
title: "Getting Started with AWS — The Big Picture and the Services a Go App Uses First"
date: 2026-06-19T22:00:00
summary: "AWS has so many services it's easy to get lost. This post narrows things down to the foundations (Region/AZ and IAM) plus the go-to services you reach for first when running a Go app (compute/storage/DB)."
tags: ["AWS", "クラウド", "インフラ"]
level: intermediate
lang: en
translationKey: aws-basics-for-go
---

AWS has over 200 services, and chasing all of them is hopeless. Just nail down **"the foundational concepts" plus "a few you'll use first"** and that's plenty to run a Go app. Let's grab the big picture by focusing there.

## Foundation: Regions and Availability Zones (AZ)

- **Region** = a physical geographic area (e.g., Tokyo `ap-northeast-1`). It affects where your data lives, latency, and pricing.
- **AZ** = independent clusters of data centers within a region. Spread across multiple AZs and you survive even if one goes down.

> 💡 To start, "pick one nearby region" is fine. For services that need high availability, span multiple AZs — think about it in that order.

## The Go-To Services to Learn First

| Category | Service | Roughly what it is |
| --- | --- | --- |
| Compute | EC2 | Virtual servers (VMs). The basic form that runs anything |
| Containers | ECS / Fargate | Container runtime (Fargate needs no server management) |
| Functions | Lambda | Runs functions event-driven (no always-on server) |
| Storage | S3 | Object storage. Files/images/backups |
| Database | RDS / DynamoDB | RDS = managed RDB, DynamoDB = NoSQL |
| Networking | VPC / ELB | Virtual network / load balancer |
| Permissions | IAM | "Who can do what" (covered below; most important) |

> 🧭 In .NET you'll often enter through the AWS SDK for .NET or Elastic Beanstalk, but the concepts are shared. IAM, VPC, and S3 are the same in any language.

## Where to Run a Go App

Where in AWS do you put the single binary / container we saw in [the previous infrastructure post](/en/posts/deploying-go-apps/)?

| Option | Best for | Effort |
| --- | --- | --- |
| Lambda | Small APIs, event processing, low frequency | Minimal (no server management) |
| ECS + Fargate | Always-on web APIs, mid-scale | Medium (just drop in a container) |
| App Runner | Publishing a container as fast as possible | Small |
| EC2 | Fine-grained control, special requirements | Large (you operate the OS) |

> 💡 When in doubt, "containerize and use Fargate / App Runner." Go produces small images, so it's a good fit. For event-driven or low-frequency workloads, Lambda is cheap and easy.

## IAM: Who Can Do What (Most Important)

The heart of AWS security. The principle is **least privilege (allow only the operations you need)**. Assign a "role" to your app and attach only the policies that role needs.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": "arn:aws:s3:::my-bucket/*"
  }]
}
```

> ⚠️ Don't write access keys in code or Git. Assign an **IAM role** to EC2/ECS/Lambda and let the SDK fetch temporary credentials automatically (no key management needed).

## Using AWS from Go (SDK v2)

The official `aws-sdk-go-v2`. Credentials are picked up automatically from the environment or role, so you never write keys in code.

```go
import (
	"context"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func main() {
	ctx := context.Background()

	// Auto-load credentials from env vars, IAM role, etc.
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatal(err)
	}

	client := s3.NewFromConfig(cfg)
	out, err := client.ListBuckets(ctx, &s3.ListBucketsInput{})
	// use out.Buckets...
}
```

## Config, Secrets, and Pricing Gotchas

- **Config/secrets**: Besides environment variables, put config values in **Parameter Store** and secrets in **Secrets Manager**, and read them through IAM permissions.
- **Pricing**: Mostly pay-as-you-go. There's a **Free Tier**. Costs balloon most easily from EC2 instances you forgot to stop, or from S3 transfer volume.
- **Cost management**: Set budget alerts with Budgets and review the breakdown with Cost Explorer — make it a habit early.

> ⚠️ The most common accident is "forgetting to stop an EC2 / NAT Gateway spun up for testing." Tag things, and delete what you don't need.

## Summary

- Two foundations — "Region/AZ" and "IAM (least privilege)"
- The services you'll use first: EC2 / ECS+Fargate / Lambda / S3 / RDS·DynamoDB / VPC
- Containerize Go apps and use Fargate / App Runner; for lightweight workloads, Lambda is handy
- Lean on IAM roles instead of access keys, and hold no keys
- Put secrets in Secrets Manager and the like. Pricing is pay-as-you-go — watch out for forgotten resources and set budget alerts
