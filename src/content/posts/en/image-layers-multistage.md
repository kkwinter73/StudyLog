---
title: "Really Understanding Containers 3: Image Layers and Multi-stage Builds"
date: 2026-06-23T16:00:00
summary: "A Docker image is a stack of layers, one per instruction. Once you get this, you can see how to write Dockerfiles that hit the build cache, and why multi-stage builds shrink the final image so dramatically."
tags: ["コンテナ", "基礎"]
level: beginner
lang: en
translationKey: image-layers-multistage
---

> 📚 Series: "Really Understanding Containers" (3 / 5)

Each instruction in a [Dockerfile](/en/posts/dockerfile-basics/) actually stacks up as a **layer**.
Once you understand this structure, you'll get why some ways of writing make builds faster, and why
[multi-stage builds](/en/posts/deploying-go-apps/) are so effective at shrinking images.

## An image is a stack of layers

Each Dockerfile instruction like `FROM`/`COPY`/`RUN` basically creates one layer.
An image is those layers piled up from the bottom — **read-only strata**.

```text
[CMD]            ← higher layers = later instructions
[RUN go build]
[COPY . .]
[FROM golang]    ← the bottom is the foundation
```

> 💡 Multiple images built on the same base image **share** their common lower layers.
> That makes both disk and pull efficient (you only need to hold each shared layer once).

## Build cache — unchanged layers are reused

For each layer, `docker build` says "if nothing changed since last time, **reuse the cache**."
It rebuilds only the changed layer and **everything above it**.

> ⚠️ The key idea: "everything below the change is reused; everything above is rebuilt." So write
> **things that rarely change first, and things that change often last** to keep the cache warm.
> Order determines your build time.

## Writing to keep the cache warm

The classic move is to separate "installing dependencies" from "copying the source."

```dockerfile
FROM golang:1.26
WORKDIR /src

COPY go.mod go.sum ./     # copy just the dependency definitions first
RUN go mod download       # download deps (cached as long as go.mod doesn't change)

COPY . .                  # source comes later (this is what changes often)
RUN go build -o /app .
```

- If you only tweak one line of source, the `go mod download` layer stays cached and **skips the dependency download**
- If you put `COPY . .` first instead, every one-character edit forces the dependency download to run again

## Multi-stage builds — a smaller final image

Building needs heavy tools like the compiler, but **running only needs the artifact**.
So you split into a "build stage" and a "run stage," and copy only the artifact into the final image.

```dockerfile
# --- build stage (the full set of heavy tools) ---
FROM golang:1.26 AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -o /app .

# --- run stage (just the artifact) ---
FROM gcr.io/distroless/static-debian12
COPY --from=build /app /app    # bring only the artifact from the build stage
ENTRYPOINT ["/app"]
```

- No compiler or source ends up in the final image → it fits in **a few to a dozen-odd MB**
- A great match with [Go's static binaries](/en/posts/deploying-go-apps/). Small means faster pulls and a smaller attack surface

## Summary

- An image is a **stack of layers**, one per instruction. Common layers are shared across multiple images
- `docker build` **reuses everything below a change and rebuilds everything above** (the build cache)
- Writing **things that rarely change (deps) first and things that change often (source) last** keeps the cache warm
- **Multi-stage builds** separate the build stage from the run stage, giving you a small image with just the artifact
- Go's static binary + distroless/scratch gets you to the single-digit MB range

**← Prev:** [2: Dockerfile Basics](/en/posts/dockerfile-basics/)
**→ Next:** [4: Container Networking and Data](/en/posts/container-network-and-data/)
