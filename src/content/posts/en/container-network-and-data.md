---
title: "Really Understanding Containers 4: Container Networking and Data"
date: 2026-06-23T15:00:00
summary: "Containers reach each other by resolving service names, and data disappears if you leave it alone. Understand how container-to-container communication works, when to use volumes vs. bind mounts, and get a feel for keeping your data around."
tags: ["コンテナ", "基礎"]
level: beginner
lang: en
translationKey: container-network-and-data
---

> 📚 Series "Really Understanding Containers" (4 / 5)

Once you run multiple containers, "how do they talk to each other?" and "how do you keep the data?" become real questions.
Building on your knowledge of [DNS](/en/posts/dns-basics-and-tools/), we'll cover **name resolution by service name** and the
**volumes / bind mounts** that keep your data around.

## Communication between containers — name resolution by service name

Each container has its [own network namespace (NET namespace)](/en/posts/container-namespace-cgroup/).
Put them on the same Docker network, and they can **call each other by service name (container name)**.

```yaml
# docker-compose.yml (excerpt)
services:
  web:
    image: myapp
    environment:
      DB_HOST: db          # connect via the name "db", not an IP
  db:
    image: postgres
```

- Compose automatically creates a shared network and makes each service name **resolvable as a hostname** ([name resolution](/en/posts/dns-basics-and-tools/))
- `web` can connect via `db:5432`. A container's IP changes every time it starts, but **the name doesn't change**

> 💡 Hard-coding an IP breaks on restart. That's why you "connect by name." It's the same idea as [AWS Service Connect](/en/posts/aws-compute-explained/)
> (a mechanism for connecting services by name), with Docker's built-in DNS playing that role here.

## Data disappears if you leave it alone

Containers are meant to be disposable. **Delete a container and the files written inside it vanish with it.**
To keep DB data or uploads, you need a way to push them outside — that's mounting.

## Volumes vs. bind mounts

There are two main ways to persist data. They serve different roles.

| | Volume | Bind mount |
| --- | --- | --- |
| What it is | An area managed by Docker | Directly links **any directory on the host** |
| How you specify it | A name (`pgdata:/var/lib/...`) | A host path (`./src:/app`) |
| Main use | Production data persistence (DBs, etc.) | Development (instantly reflect host code) |
| Portability | High (not tied to the environment) | Depends on the host's path layout |

```yaml
services:
  db:
    image: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data   # volume: persist DB data
  web:
    image: myapp
    volumes:
      - ./src:/app                        # bind mount: link code you're developing
volumes:
  pgdata:
```

> ⚠️ "I recreated the container and the data was gone" is the classic sign of a forgotten mount. **Put data you want to keep in a volume**,
> and put code you want reflected instantly during development in a bind mount — use each for its purpose.

## Summary

- A container has its **own network** via a NET namespace. On the same network, containers **communicate by service name**
- Compose resolves "service name → IP" with its built-in DNS. The IP may change, but the name stays the same
- Containers are disposable. **Data written inside them disappears**, so push it outside
- **Volume** = a Docker-managed persistent area (good for production DBs) / **Bind mount** = a direct link to a host path (good for development)
- Most data loss comes from a forgotten mount. Use a volume when you want to keep it

**← Prev:** [3: Image Layers and Multi-Stage Builds](/en/posts/image-layers-multistage/)
**→ Next:** [5: Registries and docker compose](/en/posts/registry-and-compose/)
