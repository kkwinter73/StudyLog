---
title: "Getting into Private Resources Safely — the Bastion-less, SSH-less Mindset"
date: 2026-06-26T18:00:00
summary: "Get into a production DB or container without SSH, a public IP, or a bastion host. Learn access methods that don't grow your attack surface: session-based connections, port forwarding, and running exec directly against a container."
tags: ["AWS", "運用", "セキュリティ"]
level: intermediate
lang: en
translationKey: secure-access-private-resources
---

You want to peek inside a production DB, or shell into a container to investigate — but opening up [SSH](/en/posts/ssh-and-key-auth/) or a public IP grows your attack surface.
The modern standard is to get in safely through a managed service, **without a bastion or SSH**. Let's cover the mindset.

## Why avoid SSH / public IPs

"Making it possible to get in" is itself a risk.

- A **public IP** means reachable from the internet (even if you narrow it with a [security group](/en/posts/aws-security-groups/), the surface grows)
- **SSH** requires managing keys and opening port 22. If a key leaks, it becomes an entry point
- A **bastion host** left running becomes its own weak point that has to be managed and patched

> 💡 The goal isn't "being able to get in" — it's getting in **only when needed, in a form that leaves a record**.
> The fewer permanent entrances you keep, the safer you are.

## Session-based access (bastion-less)

Clouds offer managed services that "establish a session through an agent" (e.g. Session Manager).
As long as the **agent is installed on the target**, you can connect without opening a port and without a public IP.

- No inbound ports to open (the agent reaches out from the inside)
- Who got in and when is **recorded in an audit log**
- Permissions are controlled with [IAM](/en/posts/aws-security-config-explained/) (no key distribution needed)

## Connecting to a DB with port forwarding

A DB normally lives in private ([a private subnet](/en/posts/aws-igw-and-subnet-mask/)).
You can't reach it directly, so you use **port forwarding** to relay a local port to the remote DB.

```text
local psql/GUI ──→ localhost:15432
        │ (tunnel over the session)
        ▼
   private DB:5432
```

- Connecting to `localhost:15432` on your machine reaches the DB's `5432` through the tunnel
- No SSH, no public IP — you open the tunnel only when you need it

## Getting inside a container

When you want to inspect a running container, use the **exec feature of the container runtime platform** to drop a shell or run a command directly (no bastion in the path).

> ⚠️ A [distroless / minimal image](/en/posts/image-layers-multistage/) has **no shell and no psql**.
> In that case you can't do everything from inside the container, so the DB access above has to go through a separate small bastion (with a CLI installed).
> "Light image" and "operable from inside" are a trade-off.

## Summary

- The more permanent entrances you keep, the bigger your attack surface. Lean toward **avoiding SSH / public IPs / permanent bastions**
- **Session-based access** lets you get in without opening a port or a public IP, and leaves an audit trail
- Connect to a DB with **port forwarding**, relaying a local port (open the tunnel only when needed)
- Get into a container with the **exec feature**. Just note that minimal images have no shell
- Control permissions with [IAM](/en/posts/aws-security-config-explained/) rather than distributing keys — that's the modern approach

Next: review whether your own "get into the DB" procedure still assumes SSH / a bastion.
