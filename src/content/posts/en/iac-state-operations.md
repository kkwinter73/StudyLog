---
title: "Operating IaC State Safely — State Operations and Avoiding Deploy Conflicts"
date: 2026-06-26T16:00:00
summary: "State is the ledger mapping code to real resources. Learn when you touch state directly — for renames and importing existing resources — and how to use ignore_changes to prevent conflicts when IaC and app deploys fight over the same resource."
tags: ["IaC", "運用"]
level: intermediate
lang: en
translationKey: iac-state-operations
---

The **state** we saw in [Terraform Basics](/en/posts/iac-terraform-basics/) (the ledger mapping code to real resources) becomes something you **touch directly** as operations mature — keeping up with renames, importing existing resources, and avoiding conflicts between IaC and app [deploys](/en/posts/cicd-github-actions/). It's easy to break things here, so tread carefully.

## State is "dangerous to touch" by default

State is the [ledger at the heart of diff-based apply](/en/posts/iac-terraform-basics/). When it drifts from reality, the tool misbehaves: "there's nothing to create" or "I can't tell what should be deleted."

> ⚠️ Break state and you can **double-create** existing resources, or lose track of them so you **can't delete** them. State operations are a last resort — always check the diff and take a backup before running them.

## Common state operations

Use these when rewriting code alone can't keep things in sync.

| Operation | What it does | When to use it |
| --- | --- | --- |
| `state mv` | Renames an entry inside state | When you rename a resource or move it into a module |
| `state rm` | Drops it from management (doesn't delete the real thing) | When you want to stop managing it with IaC but keep the actual resource |
| `import` | Pulls an existing real resource into state | When you want to bring something you made by hand under IaC management |

> 💡 `state rm` **only removes the entry from the ledger without deleting the real thing**; `import` **only links to the ledger without creating the real thing**. Keep "ledger operations" and "real-resource operations" separate in your head and you won't get confused.

## Conflicts between IaC and app deploys

A common accident: **both IaC and the app deploy update the same resource**. For example, [an app deploy](/en/posts/cicd-github-actions/) rewrites a container's definition with a new image every time. But if IaC also manages that same definition, every `apply` **rolls it back** to the old image.

## Divide responsibility with ignore_changes

The fix is to declare "**that attribute is out of IaC's scope**" (`lifecycle.ignore_changes`).

```hcl
resource "app_service" "web" {
  # ... config like CPU and memory is managed by IaC ...

  lifecycle {
    ignore_changes = [image]   # leave the image to the deploy side; IaC won't touch it
  }
}
```

- Split responsibilities: **config (CPU/memory/env vars) belongs to IaC**, **the running image belongs to the deploy**
- Only recreate explicitly when you deliberately want to change the image

> 💡 The essence is deciding on a single [source of truth](/en/posts/single-source-of-truth/) for each attribute. Stop the double management and `apply` will never roll back your deploy again.

## Etiquette for safe operations

- **Share and get approval before destructive operations (rm/mv/destroy)**. Don't run them solo on a whim
- [Always read the `plan` diff](/en/posts/terraform-in-practice/). Check for unintended recreations
- A failure right after `apply` can be **propagation lag (eventual consistency)**. Wait a few dozen seconds and retry

## Summary

- **State is a ledger that's dangerous to touch**. Operations are a last resort — check the diff and take a backup first
- `state mv` (follow renames) / `state rm` (drop from management, keep the real thing) / `import` (bring an existing resource in)
- When IaC and the deploy fight over the same attribute, you get **rollback accidents**
- Use **`ignore_changes`** to split responsibility: "image belongs to the deploy, config belongs to IaC"
- Share and approve destructive operations up front, always read `plan`, and wait a few dozen seconds for lag

**Related:** [Terraform Basics](/en/posts/iac-terraform-basics/) / [Terraform in Practice](/en/posts/terraform-in-practice/)
