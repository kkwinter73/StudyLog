---
title: "Really Understanding Containers ① What a Container Really Is — namespace and cgroup"
date: 2026-06-23T18:00:00
summary: "A container isn't a 'lightweight VM' — it's just a process isolated by the kernel's namespace and cgroup features. We look at how it differs from a VM, and understand from first principles what carves out 'what you can see' and 'how much you can use'."
tags: ["コンテナ", "基礎"]
level: beginner
lang: en
translationKey: container-namespace-cgroup
---

> 📚 Series "Really Understanding Containers" (1 / 5)

The starting point for understanding what `docker compose up` actually does is "what is a container?"
As we touched on in [the kernel's role](/en/posts/kernel-role-for-containers/), a container is not a lightweight VM but
**just a process isolated by kernel features**. Let's look at namespace and cgroup — the features behind that isolation — from a mechanical standpoint.

## VM vs. container — once more

The decisive difference is whether the [kernel](/en/posts/kernel-role-for-containers/) is duplicated or shared.

| | VM | Container |
| --- | --- | --- |
| OS (kernel) | Boots an entire separate guest OS | **Shares the host's kernel** |
| Startup | Seconds to minutes (an OS has to boot) | Almost instant (same as starting a process) |
| Weight | Heavy (several OSes' worth) | Light (one process' worth) |
| Isolation strength | Strong (a completely separate machine) | Medium (logically separated on the same kernel) |

> ⭐ From the host's point of view a container is just a [normal process](/en/posts/process-vs-thread/). It even shows up in `ps`.
> So why does it look like "a machine all to itself"? — That's the job of namespace and cgroup.

## namespace — carving out "what you can see"

A namespace is a kernel feature that **limits the world a process can see**. It creates the illusion of "there's no one here but me."

| namespace | What it partitions |
| --- | --- |
| PID | The process list (inside the container you appear to be PID 1) |
| NET | Networking (its own IP and port space) |
| MNT | Filesystem mounts (your own root `/`) |
| UTS | Hostname |
| IPC | Inter-process communication resources |
| USER | User/group IDs |

> 💡 The reason `ps` inside a container doesn't show the host's other processes is the PID namespace.
> Looking like "I have my own `/`" is the MNT namespace. It's **just carving out what you can see**.

## cgroup — carving out "how much you can use"

If namespace is about "what you can see," then cgroup (control group) limits **the amount of resources you can use**.

- How much CPU you can use (e.g., up to 0.5 of a core)
- The memory ceiling (get killed by the OOM killer if you exceed it)

```bash
# Run a container capped at 512MB of memory and 0.5 of a CPU core
docker run --memory=512m --cpus=0.5 myapp
```

Without this, a single container could devour all of the host's resources. cgroup builds a "don't bother the neighbors" fence.

## What is docker run doing?

Behind a single `docker run`, roughly this is what happens.

```text
1. Prepare a filesystem (your own /) from the image
2. Create namespaces (isolate what's visible via PID/NET/MNT…)
3. Set CPU/memory ceilings with cgroup
4. Start the process (CMD) inside it
```

> 🧭 If you think of it as "spinning up a VM," it feels heavy — but in reality it's **just isolating a process and starting it**.
> That's why it starts fast and you can run lots of them. This lightness is why containers took off.

## Summary

- A container isn't a lightweight VM — it's **just a process isolated by kernel features**
- A VM duplicates the whole kernel; a container **shares the host's kernel**, so it's light
- **namespace** carves out "what you can see" (PID/NET/MNT…)
- **cgroup** carves out "how much you can use" (CPU/memory)
- `docker run` does "prepare FS → namespace → cgroup → start process"

**→ Next:** [② Dockerfile Basics](/en/posts/dockerfile-basics/)
