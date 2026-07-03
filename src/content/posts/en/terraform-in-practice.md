---
title: "Terraform in Practice — providers, variables, modules, and the execution flow"
date: 2026-06-26T09:00:00
summary: "The step after the basics of resources and state. Get comfortable with providers (which cloud you operate), variable/output for passing values in and out, modules for reusing configurations, and the init→plan→apply execution flow."
tags: ["IaC", "インフラ"]
level: intermediate
lang: en
translationKey: terraform-in-practice
---

The next step after [Terraform basics (resources and state)](/en/posts/iac-terraform-basics/).
To actually write and run it, get comfortable with the **providers, variables, and modules** you need, plus the **init→plan→apply** execution flow.

## provider — which cloud you operate

Terraform itself is an "engine that computes and applies diffs"; it knows nothing about AWS or GCP directly.
A **provider** is the plugin that calls each cloud's API. Only after you declare one can you use resources like [`aws_vpc`](/en/posts/aws-igw-and-subnet-mask/).

```hcl
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = "ap-northeast-1"   # which region to operate in
}
```

> 💡 The `aws_` prefix in `resource "aws_vpc"` indicates which provider the resource belongs to.

## variable and output — passing values in and out

Avoid hardcoding. Handle environment differences and reused values with **variable (input)** and **output (output)**.

```hcl
variable "env" {
  type    = string
  default = "dev"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = { Name = "${var.env}-vpc" }   # referenced via var.env
}

output "vpc_id" {
  value = aws_vpc.main.id              # displayed after apply, and referenceable from elsewhere
}
```

- Ways to pass values: `terraform apply -var="env=prod"`, or collect them in a `*.tfvars` file
- The same code can switch between `env=dev` / `env=prod` — meaning **you don't rebuild per environment**

> ⚠️ Don't write secrets like DB passwords into tfvars and commit them to Git. [Handling secrets](/en/posts/secrets-management/) follows the same principle in IaC.

## module — bundle and reuse a configuration

A **module** lets you bundle multiple resources together and reuse them. A typical use is to make "VPC + subnet + [SG](/en/posts/aws-security-groups/)"
into a single component and call it per environment.

```hcl
module "network" {
  source = "./modules/network"   # where the module lives
  env    = var.env               # pass a variable into the module
}
```

> 🧭 Same idea as a function or a reusable component. It takes inputs (variables) and returns outputs — an "infrastructure part."
> Instead of writing the same configuration by hand over and over, call the module and reuse it.

## Execution flow: init → plan → apply

Terraform runs in a fixed order. The key to safe operation is to **review the diff before applying**.

| Command | What it does |
| --- | --- |
| `terraform init` | Downloads providers/modules and initializes where [state](/en/posts/iac-terraform-basics/) is stored |
| `terraform plan` | **Previews the diff** between your code and reality (shows create/change/destroy ahead of time) |
| `terraform apply` | Actually applies what the plan describes |
| `terraform destroy` | Deletes all managed resources |

```bash
terraform init      # the first time (and when adding a provider)
terraform plan      # check what will change <- always read this
terraform apply     # apply (review the diff again, then yes)
```

> ⚠️ Always check `plan` for **any unintended "destroy"**. An attribute change can trigger a recreate.
> Never run apply without reading the plan — that's the basic way to avoid accidents.

## Summary

- A **provider** is the plugin that operates each cloud. Declare one and you can use resources like `aws_*`
- Use **variable/output** to pass values in and out, and switch environments (dev/prod) with the same code
- A **module** is a reusable part that bundles a configuration. It takes inputs and returns outputs — an "infrastructure function"
- Run in the order **init → plan → apply** (destroy to tear down). **Always read the plan diff**
- Don't write secrets into tfvars and commit them to Git (same as [secrets management](/en/posts/secrets-management/))

Next: take the VPC you built in the [basics article](/en/posts/iac-terraform-basics/), make it `env`-aware with a variable, and split it out into a module.
