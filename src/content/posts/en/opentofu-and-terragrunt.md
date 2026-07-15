---
title: "OpenTofu and Terragrunt — Terraform's 'Next' and a Thin Wrapper for Staying DRY"
date: 2026-07-15T18:00:00
summary: "Use Terraform seriously and you hit two pains: the license changed, and per-environment config multiplies via copy-paste. OpenTofu is an open-source fork answering the first (a near drop-in replacement); Terragrunt is a thin wrapper answering the second. Why they exist, what each solves, how to write terragrunt.hcl, and how to combine them."
tags: ["IaC", "運用"]
level: intermediate
lang: en
translationKey: opentofu-and-terragrunt
---

Use [Terraform](/en/posts/iac-terraform-basics/) seriously and you hit two pains: one, the **license changed**; two, every time environments grow, **config multiplies via copy-paste**. **OpenTofu** and **Terragrunt** answer these two respectively. Let's cover what they are and what each solves.

## Background — Terraform's Two Pains

Terraform was long the "standard for IaC," but it carried two problems.

| Pain | What it is | The tool that answers it |
| --- | --- | --- |
| License | In 2023 the license changed from OSS (MPL) to the **use-restricted** BSL | **OpenTofu** (a fork) |
| DRY | As environments/modules grow, you end up **copy-pasting** backend and provider config | **Terragrunt** (a wrapper) |

These are separate problems with separate tools. But they're often discussed together as "outside of vanilla Terraform."

## OpenTofu — An Open-Source Fork of Terraform

In 2023, HashiCorp changed Terraform's license from MPL 2.0 to **BSL 1.1** (source-available, but restricted for commercial use). A community that objected forked Terraform, and as **OpenTofu** it keeps open source (MPL) alive under the Linux Foundation.

- **A near drop-in replacement.** The CLI is `tofu` (think of it as replacing `terraform` with `tofu`). It uses the same HCL, state format, and providers (the same Registry) as-is.
- Migration is basically **just swapping the binary**. Configs like `terraform.tf` often keep working unchanged.
- After the fork, **its own features** started landing (e.g. state encryption to encrypt secrets inside the state).

```bash
# Just swap the command from terraform → tofu
tofu init
tofu plan
tofu apply
```

> 🧭 In C# terms, it's like a library's license changing, the community forking it, and keeping a separate implementation with the old ergonomics. The caller (your `.tf`) largely stays the same.

> ⚠️ Even if it's "just a swap," the two are gradually diverging in features. Write something **only available in a newer version** and it won't run on the other side. Decide as a team which one to standardize on.

## Terragrunt — A Thin Wrapper for Staying DRY

As environments and modules grow, you end up **copy-pasting the backend ([state](/en/posts/iac-state-operations/) location) and provider config** into every directory's `.tf`. You hit situations where fixing one bucket name means touching every file.

**Terragrunt** is a thin wrapper (by Gruntwork) that **calls** Terraform / OpenTofu. You write config in `terragrunt.hcl` and inherit duplication from a parent to stay DRY. Underneath, it's still just running `terraform` (or `tofu`).

```hcl
# Parent: terragrunt.hcl (centralize the backend config in one place)
remote_state {
  backend = "s3"
  config = {
    bucket = "my-tf-state"
    # Auto-generate the key from each module's path → no duplication
    key    = "${path_relative_to_include()}/terraform.tfstate"
    region = "ap-northeast-1"
  }
}
```

```hcl
# Child: envs/prod/app/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()   # inherit the parent's config
}
terraform {
  source = "../../../modules/app"   # specify the module to use
}
inputs = {
  instance_size = "large"           # only the values that change in this env
}
```

> 🧭 Close to C#'s `Directory.Build.props`: put shared settings in one parent, and each project (each environment) writes only the differences.

## Where Terragrunt Shines

Terragrunt shines especially when you have **many** modules.

- **Generating backend / provider config**: instead of scattering boilerplate `backend.tf` everywhere, generate it from the parent and kill the duplication.
- **Dependencies between modules**: pass one module's output into another's input.

  ```hcl
  dependency "vpc" {
    config_path = "../vpc"
  }
  inputs = {
    vpc_id = dependency.vpc.outputs.vpc_id   # receive vpc's output
  }
  ```

- **Run in bulk**: `terragrunt run-all apply` **applies multiple modules at once** while resolving dependency order.

> 💡 The "same code + different variables" idea from [multi-environment](/en/posts/multi-env-iac/) can be enforced mechanically through directory structure and `inputs` — that's the crux of Terragrunt.

## How to Combine Them, and When to Use Them

The three **stack, they aren't mutually exclusive**. You can add them in order: vanilla Terraform → swap in OpenTofu → layer Terragrunt on top.

- Terragrunt lets you choose the binary it calls under the hood (point it at `tofu` and you get the **OpenTofu + Terragrunt** combination).
- But **don't pull everything in from the start**. With a handful of modules, vanilla Terraform / OpenTofu is plenty. It's healthy to add Terragrunt **once the copy-paste pain shows up**.

| Situation | Recommendation |
| --- | --- |
| Want to keep the license OSS | Lean toward OpenTofu |
| A few modules, few environments | Stay on vanilla Terraform / OpenTofu |
| Environments/modules grow, copy-paste hurts | Add Terragrunt |

## Summary

- OpenTofu and Terragrunt answer Terraform's two pains (**license** and **DRY**) separately
- **OpenTofu** is an **open-source fork** born from backlash to the BSL change. Near drop-in via `tofu`, with its own features growing
- **Terragrunt** is a **thin wrapper** that calls Terraform / OpenTofu. Via `terragrunt.hcl` it keeps backend, dependencies, and bulk runs DRY
- The two are **stackable** (OpenTofu + Terragrunt works too)
- **Add tools once the pain shows up.** For small setups, vanilla is fine

**Next:** get comfortable with [operating state](/en/posts/iac-state-operations/), then mechanize [how to split environments](/en/posts/multi-env-iac/) with Terragrunt.

**Related:** [Terraform Basics](/en/posts/iac-terraform-basics/) / [Terraform in Practice (modules/variables)](/en/posts/terraform-in-practice/)
