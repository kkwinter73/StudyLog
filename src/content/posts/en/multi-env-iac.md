---
title: "How to Split Environments — Multi-Account and Reusing IaC"
date: 2026-06-26T15:00:00
summary: "How do you isolate dev/staging/prod? There are stages, from partitions inside a single account to per-account separation, and the blast radius changes with each. We also cover reusing the same IaC code DRY-ly, changing only the per-environment differences."
tags: ["IaC", "インフラ"]
level: intermediate
lang: en
translationKey: multi-env-iac
---

How do you separate development, staging, and production? Mix them carelessly and you invite the "a staging operation broke production" kind of accident. Let's cover the stages of environment isolation, and the idea of reusing the same [IaC](/en/posts/iac-terraform-basics/) code **DRY-ly** by only varying the per-environment differences.

## Why Split Environments

The purpose of separating dev/staging/prod, in a word, is **isolating accidents**.

- A broken change under testing won't affect production users
- Production data, permissions, and billing stay untouchable from development
- "How far does production reach" never becomes ambiguous

## Stages of Separation

Separation comes in levels — the stronger it is, the safer, but the more management it takes.

| Level | Approach | Isolation strength |
| --- | --- | --- |
| Weak | Split by name within a single account (prefixes or tags) | Weak (permissions and billing are mixed) |
| Medium | Separate networks etc. within a single account | Medium |
| Strong | **Split accounts per environment** | Strong (permissions, billing, and failures are independent) |

## Benefits of Account Separation

Splitting accounts per environment makes the boundaries clear.

- **Permission isolation**: You can restrict access to the production account to a limited set of people
- **Billing separation**: Costs are visible per environment (dev costs don't get lost inside production)
- **Smaller blast radius**: Misconfigurations and incidents are less likely to spill into other environments

> 💡 The idea of making "[least privilege](/en/posts/ecs-iam-roles/)" work at the account level too. If production is a separate account, development-level permissions simply can't reach it.

## Reusing IaC DRY-ly

If you copy the entire codebase for each environment, fixes won't propagate across all environments and things fall apart. The basic approach is to **call the same [module](/en/posts/terraform-in-practice/) with per-environment [variables](/en/posts/terraform-in-practice/)**.

```hcl
# Put the shared structure in a module. The only differences are variables
module "app" {
  source        = "./modules/app"
  env           = "prod"            # environment name
  instance_size = "large"          # pass only the values that change per environment
}
```

- The body of the configuration lives in one place (the module). **Push per-environment differences out into variables**
- Express differences like "dev is small, prod is redundant" through variables

> ⚠️ If you grow environments by copy-paste, you'll fix only one side and the **configuration drifts**. Stick firmly to "same code + different variables."

## Summary

- The purpose of environment separation is **isolating accidents** (staging doesn't break production)
- Separation goes weak → strong: **partition within a single account → split accounts per environment**
- **Account separation** is strong because it makes permissions, billing, and blast radius independent
- Reuse IaC DRY-ly by **calling the same module with per-environment variables**
- Copy-paste proliferation breeds drift. Keep to "shared code, only variables per environment"

**Related:** [Terraform in Practice (modules/variables)](/en/posts/terraform-in-practice/) / [Operating state](/en/posts/iac-state-operations/)
