---
title: "Getting Hands-On with Docker ①: The Big Picture — What Does It Actually Do?"
date: 2026-07-09T23:00:00
summary: "Docker exists to kill the \"works on my machine\" problem. Get down the three words image/container/registry, the single Dockerfile→build→run path, and the CLI-to-daemon relationship, then map out where to dig deeper."
tags: ["コンテナ", "基礎"]
level: beginner
lang: en
translationKey: docker-big-picture
---

> 📚 Series "Getting Hands-On with Docker" (1 / 3)

Let's look at what Docker does from one level up. The hard internals belong to
[another series](/en/posts/container-namespace-cgroup/); here we only nail down **"three characters" and "one flow"**,
and build a map of where to dig next.

## The problem Docker erases

"It works on my PC but not in production (or on a coworker's machine)" — the cause is almost always an
environment gap: OS version, installed libraries, environment variables. Docker **packs the app and
everything it needs into one box** and runs the same box everywhere, erasing that gap.

> ⭐ Docker's selling point isn't speed, it's **reproducibility**. The same image runs the same way on your machine, in CI, and in production.

## Only three characters

Docker has a lot of jargon, but these three words are enough to frame the whole thing.

| Term | What it really is | Analogy |
| --- | --- | --- |
| **Image** | A read-only template of app + environment | A **recipe + all ingredients** |
| **Container** | A running instance started from an image | **One plate** cooked from the recipe |
| **Registry** | A warehouse to store and share images | The **bookshelf** of recipes (Docker Hub / ECR, etc.) |

From one image you can start any number of containers. Containers are disposable by default, so
[keeping data around needs a separate mechanism](/en/posts/container-network-and-data/).

## One straight line — just build then run

Boil down the daily operations and you get this single path.

```bash
# 1. Bake an image from the recipe (Dockerfile)
docker build -t myapp .
# 2. Start a container from the image
docker run myapp
# 3. Share the image to a warehouse (optional)
docker push registry.example.com/myapp
```

```text
Dockerfile ──build──▶ image ──run──▶ container (running)
                        │
                        └──push/pull──▶ registry (share)
```

Writing the recipe is covered in [Dockerfile basics](/en/posts/dockerfile-basics/),
and sharing in [registry and compose](/en/posts/registry-and-compose/).

## Who is the `docker` command actually asking?

When you type `docker run`, something runs — but **the `docker` (CLI) you typed doesn't run it**.
It just asks the resident **Docker daemon (Docker Engine)**, "please run this."

```text
docker run ...  ─(API request)─▶  Docker daemon  ─▶ pull image, start container
   (CLI)                            (the resident core)
```

> 💡 So when "`docker` runs but throws an error," the first thing to suspect is whether the daemon is up.
> If Docker Desktop or `dockerd` isn't running, the CLI has no one to ask.

> 🧭 Just like .NET's `dotnet publish` produces artifacts and `dotnet app.dll` runs them,
> **the build side and the run side are separate**. Docker just adds a daemon request in between.

## The map from here

To understand Docker "completely," you need both being able to use it and understanding its internals.

- **Learn to use it** → this series ② [daily commands](/en/posts/docker-daily-commands/), ③ [debugging when stuck](/en/posts/docker-troubleshooting/)
- **Understand the internals** → the 5-part series starting at [what a container really is (namespace/cgroup)](/en/posts/container-namespace-cgroup/)

## Summary

- Docker erases the "works on my machine" problem by **packing the whole environment into a box** for reproducibility
- Three characters: **image (recipe) / container (running instance) / registry (warehouse)**
- One straight path: **Dockerfile → build → image → run → container**, shared via push/pull
- The `docker` command is a CLI; the actual work is done by the **Docker daemon** behind it
- Build usage skills in ②③; dig into the internals in the [internals series](/en/posts/container-namespace-cgroup/)

**→ Next:** [② Daily commands and common flags](/en/posts/docker-daily-commands/)
