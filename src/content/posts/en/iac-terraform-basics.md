---
title: "CI/CD and IaC ②: From Manual Clicks to Terraform"
date: 2026-06-25T10:00:00
summary: "Infrastructure clicked together in the console can't be reproduced or tracked. Here are the benefits of declaring infrastructure as code (IaC), plus Terraform's two core concepts: resource and state."
tags: ["IaC", "インフラ"]
level: beginner
lang: en
translationKey: iac-terraform-basics
---

> 📚 Series "CI/CD and IaC" (2 / 3)

When you build a [VPC or SG](/en/posts/aws-security-groups/) by hand in the AWS console, there's no record of "who changed what, and when," and spinning up a second identical environment is a real chore. The fix for this is **IaC (Infrastructure as Code)**. Let's look at the core of its flagship tool, Terraform: **resource** and **state**.

## The problem with manual console work

Clicking things together by hand carries a hidden cost.

- **No reproducibility**: asked to build a staging environment with the same setup, and the steps live only in your head
- **No change tracking**: no record of who changed what and when. If something breaks, you can't roll it back
- **No reviewability**: no way for a second person to check a change before it goes in

> ⚠️ "Only production is configured differently" and "only the person who built it knows how" are classic debts of manual work. The bigger your infrastructure gets, the more they hurt.

## What is IaC?

IaC is the idea of **declaring your infrastructure's configuration as code** and building environments from that code.

- Because it's code, you get **change tracking, review, and rollback** through Git (treated just like application code)
- You can **reproduce the same environment as many times as you want** from the same code
- You write "the desired state," and the tool brings reality in line with it (declarative)

> 💡 This is exactly the [single source of truth (SoT)](/en/posts/single-source-of-truth/) idea. You consolidate the truth about your infrastructure into code and stop anyone from making sneaky manual changes.

## Terraform core ①: resource

In Terraform, you write what you want to build **declaratively** in a `resource` block. It's not "how to build it" but "what should exist."

```hcl
# Declare "this VPC should exist"
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id   # reference the VPC above
  cidr_block = "10.0.1.0/24"
}
```

- Use `terraform plan` to check "the diff against the current state" → `terraform apply` to apply it
- You write the **result (the desired shape)**, not the steps. The tool figures out how to close the gap

## Terraform core ②: state

Terraform records "the mapping between code and real things" in its **state (state file)**. This is the crux.

- The state remembers which `resource` corresponds to which actual AWS resource
- So the next time you `apply`, it reconciles state, reality, and code, and changes **only the diff**

> ⚠️ State is the **ledger of truth**. In team development, put it in a shared location (S3, etc.) and [lock it](/en/posts/aws-data-stores-explained/) so concurrent runs can't corrupt it (this is why DynamoDB is used for state locking).

> ⚠️ State can contain **secrets like connection strings in plaintext**. How to handle the state file is a key point covered in [next time's secrets management](/en/posts/secrets-management/).

## Summary

- Manual console work creates debts: **no reproducibility, no change tracking, no reviewability**
- **IaC** declares infrastructure as code so it can be tracked, reviewed, and reproduced through Git
- Terraform's **resource** declares "the desired shape" (check the diff with plan → apply)
- **State** is the ledger mapping code to real things. It's the key to applying diffs, and it needs to be shared and locked
- State can contain secrets, so handle it with care (more next time)

**← Prev:** [① From Manual Deploys to GitHub Actions](/en/posts/cicd-github-actions/)
**→ Next:** [③ Why You Must Never Hardcode Secrets](/en/posts/secrets-management/)
