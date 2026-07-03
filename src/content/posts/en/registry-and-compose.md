---
title: "Really Understanding Containers ⑤ — Registries and docker compose"
date: 2026-06-23T14:00:00
summary: "Registries that share images (push/pull), and docker compose that runs multiple containers together. As the series wrap-up, we walk end-to-end through what `compose up` is actually doing behind the scenes."
tags: ["コンテナ", "基礎"]
level: beginner
lang: en
translationKey: registry-and-compose
---

> 📚 Series "Really Understanding Containers" (5 / 5)

Last up: the **registry** that shares images, and **docker compose** that ties multiple containers together.
As the series wrap-up, we'll finally answer the goal question — **"what does `docker compose up` do inside?"** — all at once.

## Container registry — the warehouse for images

A **registry** is the place where you store and share the images you've built. You `push` to upload and `pull` to fetch.

```bash
docker build -t myapp:1.0 .                       # build the image
docker tag myapp:1.0 registry.example.com/myapp:1.0
docker push registry.example.com/myapp:1.0        # upload to the registry
docker pull registry.example.com/myapp:1.0        # fetch it on another machine
```

- The classic one is Docker Hub. In the cloud there's AWS **ECR**, Google's Artifact Registry, and so on
- Thanks to the [layer structure](/en/posts/image-layers-multistage/), push/pull only transfers **the layers that changed**, which is efficient

> 🧭 In production the standard flow is "build in CI → push to a registry (ECR) → [ECS/Fargate](/en/posts/aws-compute-explained/) pulls it and starts up."
> The registry is the handoff point between build and deploy.

## docker compose — define multiple containers together

A real app is a combination of several containers: web, db, cache, and so on. Compose lets you declare all of that in one file
(`docker-compose.yml`) and start/stop it with a single command.

```bash
docker compose up -d     # start every defined service (-d runs in the background)
docker compose down      # stop and clean everything up together
```

## Wrap-up: what `compose up` does behind the scenes

Everything from parts ①–④ is packed into that single `docker compose up` line.

```text
1. Prepare images   a build directive builds on the spot / an image directive pulls from the registry  → ③⑤
2. Create network   set up a dedicated network where services can resolve each other by name            → ④
3. Prepare volumes  create and mount the defined volumes                                                → ④
4. Start containers start each service isolated with namespaces and cgroups                             → ①
5. Connect by name  make web able to talk to db by service name                                         → ④
```

> ⭐ In other words, `compose up` is not magic — it just automatically does **"pull/build → network → volumes → isolated start → name resolution"**
> in order. Each step is exactly the mechanism we saw in ①–④. If you can explain the internals, you've hit the goal.

## Summary

- A **registry** is a warehouse for images. Share via `push`/`pull`. In the cloud, ECR and friends
- push/pull transfers diffs per [layer](/en/posts/image-layers-multistage/), so it's efficient
- **docker compose** declares multiple containers in one file and starts/stops them together
- What `compose up` really is: automatic execution of **pull/build → network → volumes → isolated start → name resolution**
- All of it is a combination of the kernel features, images, and networking/data we saw in series parts ①–④

**← Prev:** [④ Container Networking and Data](/en/posts/container-network-and-data/)

That completes the "Really Understanding Containers" series. On top of the foundation of OS basics, distributions, and networking,
it should all connect into one line: a container is "just a mechanism to run an isolated process." Next up is [AWS ECS/Fargate](/en/posts/aws-compute-explained/).
