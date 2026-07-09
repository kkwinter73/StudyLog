---
title: "Getting Hands-On with Docker ③: Debugging When Stuck"
date: 2026-07-09T22:00:00
summary: "Container keeps dying, can't connect, image is bloated — tackle Docker's three big snags in the right order: reading state (ps -a/logs/inspect), getting inside, and a symptom-to-first-command cheat sheet."
tags: ["コンテナ", "運用", "基礎"]
level: beginner
lang: en
translationKey: docker-troubleshooting
---

> 📚 Series "Getting Hands-On with Docker" (3 / 3)

Even once you know [the commands](/en/posts/docker-daily-commands/), you'll get stuck.
The key is not to fix by guessing but to follow the order: **"read state → inspect inside → isolate by symptom."**
Let's crush Docker's three big snags in that order.

## First, read state — did it die or is it running?

Not showing in `docker ps` = it already stopped. Look at everything first and pick up why it died.

```bash
docker ps -a                 # Show stopped ones too. Read STATUS: Exited(code)
docker logs <name>           # What it printed right before dying
docker inspect <name>        # See config, exit code, mounts — everything
```

- `Exited (0)` … clean exit. **The command simply didn't stay resident** (often a `CMD` mistake)
- `Exited (1)` or `(137)` … abnormal. `137` means **SIGKILL = out of memory ([cgroup](/en/posts/container-namespace-cgroup/))**

> 💡 Read `logs` first. Nine times out of ten the app itself is throwing the error. Check the log before blaming Docker.

## Get inside to investigate — when you can and can't

If it's running, use [`exec`](/en/posts/docker-daily-commands/) to get in and check.

```bash
docker exec -it <name> sh    # Check files, env vars, connectivity inside
docker exec <name> env       # Are the environment variables actually passed?
```

The problem is when it **died and you can't get in**. `exec` only enters a running container. In that case:

```bash
# Start the same image interactively, overriding the command
docker run -it --rm <image> sh
```

> ⚠️ Minimal images (alpine/distroless) sometimes have no `bash`, not even `sh`.
> Then add tools at build time with `RUN` (see [Dockerfile](/en/posts/dockerfile-basics/)), or prepare a separate debug image.

## Can't connect — ports and name resolution

"Can't reach it" is Docker's most frequent snag. Isolate it in two steps.

1. **Can't reach from the host** → is `docker run`'s `-p host:container` correct, and is the app listening on `0.0.0.0`?
2. **Containers can't reach each other** → are they on the same network, and do you call the peer by **service name, not IP**?

```bash
docker port <name>           # Check the actual port forwarding
docker network inspect <net> # See who's on that network
```

> ⚠️ If the app listens on `127.0.0.1`, it's only visible from inside the container and `-p` won't reach it.
> See [container networking and data](/en/posts/container-network-and-data/) for details.

## Image is bloated / build is slow

The cause is almost always how you use [layers and cache](/en/posts/image-layers-multistage/).

- **Cache doesn't hit** → put rarely-changing lines (dependency install) on top, frequently-changing lines (COPY source) below
- **Image is huge** → build tools are left in the final image. Use a [multi-stage build](/en/posts/image-layers-multistage/) to carry only artifacts to the final stage

```bash
docker history <image>       # Visualize which layer eats the space
```

## Symptom → first command to run

A cheat sheet of the first command to type when stuck.

| Symptom | Run first | Suspect |
| --- | --- | --- |
| Dies immediately | `docker ps -a` → `logs` | CMD / app error, exit code |
| `docker` unresponsive | Check Docker Desktop / `dockerd` | Daemon is down |
| Can't reach from host | `docker port` | `-p` order, listen address |
| Containers can't reach each other | `docker network inspect` | Same network, service name |
| Disk full | `docker system df` → `prune` | Piled-up stopped containers/images |
| Build slow every time | `docker history` | Layer order, cache |

> 🧭 The "read logs, then isolate" order is the same as in [symptom-based troubleshooting](/en/posts/symptom-based-troubleshooting/).
> Only the tool changed to Docker; the principle of **not fixing by guessing** is shared.

## Summary

- Order is everything: **read state (`ps -a`/`logs`/`inspect`) → inspect inside → isolate by symptom**
- Nine in ten failures are in the app log. **`docker logs` first.** `137` suggests out of memory
- When you can't get in, start the same image interactively with `docker run -it --rm <image> sh`
- For "can't connect," check the **`-p` order** and the **listen address / service name**
- Bloat and slowness are solved with [layers and multi-stage](/en/posts/image-layers-multistage/)

**← Prev:** [② Daily commands](/en/posts/docker-daily-commands/)

That completes the "Getting Hands-On with Docker" series. Once the usage sticks, dig into why it works
starting from [what a container really is (namespace/cgroup)](/en/posts/container-namespace-cgroup/).
