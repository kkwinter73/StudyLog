---
title: "Getting Hands-On with Docker ②: Daily Commands and Common Flags"
date: 2026-07-09T22:30:00
summary: "Centered on the key docker run flags (-d/-p/-e/-v/--name/--rm/-it), get comfortable with the everyday commands: pulling images, starting, listing/stopping, getting inside, and cleaning up."
tags: ["コンテナ", "基礎"]
level: beginner
lang: en
translationKey: docker-daily-commands
---

> 📚 Series "Getting Hands-On with Docker" (2 / 3)

Once you have [the big picture](/en/posts/docker-big-picture/), it's time to use your hands.
You'll use maybe ten commands day to day, and the peak is **the `docker run` flags**. Nail those and most of it flows.

## Pull and list images

Before starting anything, get the image — your ingredients.

```bash
docker pull nginx:1.27     # Pull an image from a registry (pin a version with the tag)
docker images              # List images you have locally
```

> 💡 Omitting the tag (`:1.27`) means `:latest`. In production, the rule is to **pin tags, avoid latest** —
> otherwise you can't tell later which version is running.

## Start a container — `docker run` and its main flags

`docker run` is all about the flags. These are the ones you actually use.

| Flag | Meaning | Example |
| --- | --- | --- |
| `-d` | Run in the background (detached) | `-d` |
| `-p` | Forward a host port to the container | `-p 8080:80` |
| `-e` | Pass an environment variable | `-e TZ=Asia/Tokyo` |
| `-v` | Mount a volume/directory | `-v data:/var/lib` |
| `--name` | Give the container a name | `--name web` |
| `--rm` | Auto-remove once stopped | `--rm` |
| `-it` | Attach a terminal interactively | `-it` |

```bash
docker run -d --name web -p 8080:80 nginx:1.27
# → reachable at http://localhost:8080
```

> ⚠️ In `-p 8080:80` the **left is the host, the right is the container**. Memorize it backwards and you
> will always get stuck on "can't connect." See [container networking](/en/posts/container-network-and-data/) for how port forwarding works.

## See what's running, and stop it

Once started, check state and clean up.

```bash
docker ps            # List running containers
docker ps -a         # Include stopped ones too
docker logs web      # See that container's stdout/stderr
docker logs -f web   # -f to follow (like tail -f)
docker stop web      # Stop it (SIGTERM → SIGKILL after a grace period)
docker rm web        # Remove a stopped container
```

> 💡 Logs are the app's [stdout/stderr](/en/posts/stdin-stdout-stderr/) that Docker collects.
> That's why the convention is for the in-container app to **log to stdout, not to a file**.

## Get inside a container to work

When you want to see "what it looks like inside," start a shell with `exec`.

```bash
docker exec -it web bash     # Get into a running container (sh on alpine)
docker exec web env          # Or run just one command without going in
```

`run` and `exec` are different things. **`run` creates a new container / `exec` enters one that's already running**.

## Cleanup (don't let it eat your disk)

Images and containers pile up if you ignore them. Clean up regularly.

```bash
docker rm $(docker ps -aq)   # Bulk-remove stopped containers
docker rmi nginx:1.27        # Remove an image
docker system prune          # Sweep unused containers/images/networks together
docker system df             # What's using how much space
```

> ⚠️ `prune` removes unused resources. Adding `-a` also removes all unused images, so on CI or shared
> machines, check the blast radius first.

## Summary

- Get your ingredients: `pull` to fetch, `images` to check. **Pin tags** and avoid latest
- The peak of starting is the `docker run` flags: **`-d`/`-p`/`-e`/`-v`/`--name`/`--rm`/`-it`**
- `-p` is **host:container** order. Getting this backwards is the classic cause of "no connection"
- See and stop: `ps` / `ps -a` / `logs [-f]` / `stop` / `rm`
- Get inside with `exec -it ... bash`. **run creates new, exec enters existing**
- Make `system prune` / `system df` a habit for disk hygiene

**← Prev:** [① The big picture](/en/posts/docker-big-picture/)
**→ Next:** [③ Debugging when stuck](/en/posts/docker-troubleshooting/)
