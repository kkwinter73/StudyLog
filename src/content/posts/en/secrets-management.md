---
title: "CI/CD and IaC ③: Why You Should Never Hardcode Secrets"
date: 2026-06-25T09:00:00
summary: "Hardcoding API keys and passwords into your code leaves them in Git history forever, exposed to everyone who can see it. This post covers why hardcoding is bad and where secrets actually belong—environment variables, GitHub Secrets, Secrets Manager, and more."
tags: ["セキュリティ", "インフラ"]
level: beginner
lang: en
translationKey: secrets-management
---

> 📚 Series "CI/CD and IaC" (3 / 3)

The final post in the series covers a cross-cutting theme that always comes up in both [CI/CD](/en/posts/cicd-github-actions/) and [IaC](/en/posts/iac-terraform-basics/).
We'll cover **why you should never hardcode secrets**—API keys, DB passwords, and the like—directly into your code, and where to put them instead.

## Why hardcoding is bad

Writing secrets straight into your code because "it works for now" will bite you later, guaranteed.

- **It stays in Git history forever**: even if you delete it later, anyone can go back through past commits and see it. Once it's in, consider it leaked.
- **Everyone who can see it gets it**: anyone with repo access, the CI logs, and the moment you go public—it's exposed everywhere.
- **Rotation is a nightmare**: every time you change a key, you have to edit the code and redeploy.
- **You can't separate environments**: you can't use different keys for development and production.

> ⚠️ "It's a private repo, so we're fine" is dangerous too. It can leak through a visibility misconfiguration, a former employee's access, or an external integration.
> The principle is simple: **don't put secrets in code in the first place.**

## Where to put them

Design your code to receive secrets "from the outside," and keep the actual values in a dedicated place.

| Location | Purpose |
| --- | --- |
| Environment variables | Injected into the app at runtime (the [12-factor](/en/posts/deploying-go-apps/) basics) |
| GitHub Actions Secrets | Secrets used inside the [CI/CD](/en/posts/cicd-github-actions/) pipeline |
| AWS Secrets Manager / SSM | Secrets the production app references ([AWS ⑤](/en/posts/aws-security-config-explained/)) |

```yaml
# GitHub Actions: secrets are passed in a way that doesn't appear in logs
steps:
  - run: ./deploy.sh
    env:
      API_KEY: ${{ secrets.API_KEY }}   # value registered in the repo settings
```

```go
// The app just reads from the environment variable. The value isn't in the code.
apiKey := os.Getenv("API_KEY")
```

> 🧭 It's the same as not writing secrets into .NET's `appsettings.json`, and using User Secrets, environment variables, or Key Vault instead.
> "Don't bake secrets into config files or code" is an iron rule regardless of language or platform.

## Preventing accidental leaks

- Always add files that contain secrets, like `.env`, to your **`.gitignore`** (so they're excluded from commits).
- [Terraform state](/en/posts/iac-terraform-basics/) can contain secrets in plaintext. Don't put state in Git—store it somewhere safe like S3.
- **If it leaks, disable it immediately.** Before deleting anything, your top priority is to rotate (reissue) the key itself.

> ⚠️ "Commit it and delete it later" is too late. It stays in Git history, so the moment you notice a leak, **disable that key** before doing anything else.

## Summary

- Hardcoding means secrets **stay in Git history forever, leak to everyone, and are painful to rotate**. As a rule, don't do it.
- Push secrets **out of your code (into environment variables, etc.)**, and have the app simply read them from the environment.
- Where to put them: **environment variables** at runtime, **GitHub Secrets** for CI, **Secrets Manager/SSM** for production.
- Exclude `.env` via `.gitignore`. Keep **Terraform state** out of Git too, since it can contain secrets.
- If something leaks, **disable (rotate) the key** before deleting anything.

**← Prev:** [② From Manual Work to Terraform](/en/posts/iac-terraform-basics/)

That wraps up the "CI/CD and IaC" series. With deployment automation (①), infrastructure as code (②), and protecting secrets (③), you should be one step closer to moving from "build it by hand, ship it by hand" to "declare it in code, deliver it automatically."
