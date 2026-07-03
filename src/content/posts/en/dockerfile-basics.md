---
title: "Really Understanding Containers ②: Dockerfile Basics"
date: 2026-06-23T17:00:00
summary: "A Dockerfile is the recipe for building an image. Learn how to pick a base OS (debian/alpine), the roles of FROM/COPY/RUN/CMD, and the easily-confused difference between RUN and CMD so you can write your own images."
tags: ["コンテナ", "基礎"]
level: beginner
lang: en
translationKey: dockerfile-basics
---

> 📚 Series "Really Understanding Containers" (2 / 5)

Once you understand [what a container really is](/en/posts/container-namespace-cgroup/), the next step is **how to build the image** it comes from. The recipe for building an image is the **Dockerfile**. Get the base OS choice and the four main instructions down, and you'll be able to write your own.

## What Is a Dockerfile

A Dockerfile is an instruction sheet that says "assemble this image like so." It runs top to bottom, and each line stacks up to form a single image. `docker build` bakes the image from this recipe.

## FROM — Which Base OS to Start From

The first `FROM` picks your foundation. This is exactly the [choice of distribution](/en/posts/linux-distros-and-packages/) itself.

```dockerfile
FROM node:22            # Debian-based (large but safe)
FROM node:22-alpine     # Alpine-based (small)
```

- **alpine** is a few MB and lightweight, but its standard C library is musl, which [can bite you](/en/posts/linux-distros-and-packages/)
- Rough guideline: when in doubt go Debian-based; when you want to shrink the size, go alpine

## The Four Main Instructions

With just these, you can write an image that works.

| Instruction | Role | Example |
| --- | --- | --- |
| `FROM` | Specify the base image | `FROM golang:1.26` |
| `COPY` | Copy host files into the image | `COPY . /src` |
| `RUN` | Run a command **at build time** (creates a layer) | `RUN go build -o /app` |
| `CMD` | Command to run **at startup** (default) | `CMD ["/app"]` |

```dockerfile
FROM golang:1.26
WORKDIR /src
COPY . .
RUN go build -o /app .     # runs once at build time
CMD ["/app"]               # runs every time the container starts
```

## The Difference Between RUN and CMD (Watch Out)

This is the most common misunderstanding. **They run at different times.**

- `RUN` … runs **when building the image**. The result is baked into the image (e.g. installing dependencies, building)
- `CMD` … runs **when starting the container**. The command that launches your actual app

> ⚠️ There is one `CMD` per image. You can override it with `docker run myapp another-command`.
> The similar `ENTRYPOINT` is for fixing "the main thing that always runs," and you combine the two when you only want to swap out the arguments.

> 🧭 In .NET it's the same structure: `FROM mcr.microsoft.com/dotnet/aspnet:8.0` → `COPY` the published output → `ENTRYPOINT ["dotnet","app.dll"]`. Different language, but the way you assemble a Dockerfile is the same.

## Summary

- A Dockerfile is **the recipe for building an image**. It stacks up top to bottom, and `docker build` bakes it
- `FROM` picks the base OS = [choosing a distro](/en/posts/linux-distros-and-packages/). alpine is lightweight but watch out for musl
- Four instructions: **FROM (foundation) / COPY (bring in) / RUN (build time) / CMD (startup)**
- **RUN is build time, CMD is startup.** The timing difference is the key point
- When you want to fix the main entry, combine it with `ENTRYPOINT`

**← Prev:** [① What a Container Really Is](/en/posts/container-namespace-cgroup/)
**→ Next:** [③ Image Layers and Multi-Stage Builds](/en/posts/image-layers-multistage/)
