---
title: "ECR — AWS's Container Image Store (Registry)"
date: 2026-07-15T13:00:00
summary: "Where do you put a built container image, and where does production fetch it from? That store is ECR (Elastic Container Registry), AWS's managed container registry. Here's the role of a registry, the build→tag→login→push→pull flow, and the ECR-specific parts — IAM auth, lifecycle policies, image scanning — grasped as the starting point of deployment."
tags: ["AWS", "コンテナ"]
level: intermediate
lang: en
translationKey: aws-ecr-container-registry
---

Building a container produces an **image** (a box holding the app plus its dependencies). This needs to be **put somewhere**
so the production runtime can **fetch it (pull)**. That store is **ECR (Elastic Container Registry)** —
AWS's managed **container registry**. The image itself is [the container posts](/posts/image-layers-multistage/); here it's about its **store and handoff**.

## What a registry is — why you need a store

The environment that builds and the one that actually runs (ECS or a server) are different. You need a **shared store** in between. That's a registry.

- **push**: **upload** the built image to the registry
- **pull**: the runtime **downloads** it and starts
- Docker Hub is the representative public registry. **ECR is its AWS version (mainly private)**, where you safely keep your own images

> ⭐ A registry is the **handoff point** connecting "build" and "run." CI pushes, production pulls.
> So "[pushed to ECR](/posts/cron-scheduled-jobs/)" = "production can now go fetch it" = **the starting point of deployment**.

## The push / pull flow

Uploading to ECR goes build → tag → login → push. The runtime pulls.

```bash
# 1. build
docker build -t myapp .
# 2. tag with the ECR repository URI (<account>.dkr.ecr.<region>.amazonaws.com/<repo>)
docker tag myapp:latest 123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/myapp:latest
# 3. log in to ECR (get a temporary token via IAM permissions, then docker login)
aws ecr get-login-password --region ap-northeast-1 \
  | docker login --username AWS --password-stdin 123456789012.dkr.ecr.ap-northeast-1.amazonaws.com
# 4. push
docker push 123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/myapp:latest
```

- Images are identified by `repository:tag`. Tagging by **commit hash or version** — not just `latest` — lets you roll back
- The runtime (ECS, etc.) specifies the same URI and **pulls**. Make CI pushes safe with [keyless auth (OIDC)](/posts/ci-oidc-keyless-auth/)

## The ECR-specific parts

Unlike a generic registry, ECR's value is being integrated into AWS.

- **IAM auth**: access control by **IAM permissions**, not a password. Login uses a temporary token (no fixed keys handed out)
- **Private by default**: keep your images non-public. Grant pull permission to the runtime's **task execution role**
- **Lifecycle policies**: **auto-delete** old/untagged images. Caps the storage cost that balloons if left alone
- **Image scanning**: run a **vulnerability scan** on push (part of [dependency vulnerability](/posts/dependency-vulnerabilities/) defense)
- **ECS/EKS/Lambda integration**: these pull directly from ECR and launch. The standard deployment path

> 🧭 It sits where NuGet or Azure Container Registry (ACR) does in .NET terms. ECR is **AWS's private container store**,
> the biggest difference being that auth leans on IAM. The idea is "grant it to a role," not "hand out a key."

## Summary

- ECR is AWS's managed **container registry**. It's the store for built images, connecting build and run via **push/pull**
- The flow is **build → tag (repository URI) → login (temporary token via IAM) → push**. The runtime **pulls** by the same URI
- Don't leave tags to `latest`; use **version/commit hash** so you can roll back
- ECR's strengths: **IAM auth, private, lifecycle policies, image scanning, integration with ECS and friends**
- "Pushed to ECR" = production can pull it = **the starting point of deployment**. Make CI pushes keyless with OIDC

**Related:** [Registry and docker compose](/posts/registry-and-compose/) / [Image Layers and Multi-stage](/posts/image-layers-multistage/) / [cron — Scheduled Execution](/posts/cron-scheduled-jobs/) / [Keyless CI Auth (OIDC)](/posts/ci-oidc-keyless-auth/)
