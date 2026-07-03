---
title: "CI/CD and IaC ① From manual deploys to GitHub Actions"
date: 2026-06-25T11:00:00
summary: "Deploying by hand every time breeds skipped steps and 'works on my machine.' Here's the mindset for moving those steps onto a CI/CD pipeline, plus how to write test→build→deploy in GitHub Actions, using this blog as a real example."
tags: ["CICD", "デプロイ", "インフラ"]
level: beginner
lang: en
translationKey: cicd-github-actions
---

> 📚 Series "CI/CD and IaC" (1 / 3)

When you [deploy an app](/en/posts/deploying-go-apps/), building, transferring, and restarting by hand
every single time breeds skipped steps and "works on my machine." Automating that whole flow is **CI/CD**.
First, organize your manual steps, then move them onto a GitHub Actions pipeline.

## First, organize your manual deploy steps

Before automating, write down what you do by hand. For a [Go app](/en/posts/deploying-go-apps/), for example:

```text
1. Run the tests (is anything broken?)
2. Build (a binary or a container image)
3. Push to a registry / transfer to the server
4. Switch production to the new version / restart
```

> ⚠️ The problems with doing it by hand are "**forgetting a step**" and "**everyone does it differently**."
> Skipping tests, shipping an old version, breaking on environment differences... These fixed steps are
> exactly the kind of thing that's ripe for automation.

## What CI/CD is

- **CI (Continuous Integration)**: **automatically test and build** on every change so you catch breakage right away
- **CD (Continuous Delivery/Deployment)**: **automatically deploy** whatever passes

> 💡 In short, it's "having a machine reliably run the steps you wrote out above, every time, triggered by a push."
> People forget steps; a pipeline doesn't.

## The structure of GitHub Actions

GitHub Actions runs processes triggered by repository events (like a push).
Its structure is three tiers: **workflow → job → step**.

```yaml
name: CI
on:
  push:
    branches: [main]      # fires on push to main
jobs:
  test:                   # a job
    runs-on: ubuntu-latest
    steps:                # steps (top to bottom)
      - uses: actions/checkout@v5    # use a prebuilt action
      - run: go test ./...           # run any command
```

- `on` … trigger conditions (push, pull_request, schedule, etc.)
- `uses` … calls a published prebuilt action / `run` … runs a shell command directly
- Jobs run in parallel by default; use `needs` to order them

## The test → build → deploy pipeline

Turn your manual steps directly into a chain of jobs. Use `needs` to express "run the next one once the previous succeeds."

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: go test ./...
  build:
    needs: test            # after test succeeds
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: docker build -t myapp:${{ github.sha }} .
  deploy:
    needs: build           # after build succeeds
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

> 💡 This blog itself does push → build → deploy to GitHub Pages automatically via `.github/workflows/deploy.yml`.
> The reason an article goes live just by pushing it is precisely this CD in action.

> 🧭 It's the same in .NET. Just line up `dotnet test` → `dotnet publish` → deploy as steps.
> CI/CD is language-agnostic "automation of steps," so the thinking carries over as-is.

## Wrap-up

- The first step of automation is to **write out your manual deploy steps** (test→build→push→switch)
- The weaknesses of doing it by hand are "forgetting steps" and "person-to-person differences." Let a machine run the fixed steps
- **CI** = auto test/build on every change, **CD** = auto deploy what passes
- GitHub Actions is **workflow→job→step**. Trigger with `on`, do the work with `uses`/`run`, order with `needs`
- This blog also automates push → build → Pages deploy with Actions

**→ Next:** [② From manual work to Terraform](/en/posts/iac-terraform-basics/)
