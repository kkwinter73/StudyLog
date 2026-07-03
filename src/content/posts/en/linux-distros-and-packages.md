---
title: "Getting Serious About Linux ①: Distributions and Package Management"
date: 2026-06-22T19:00:00
summary: "The 'distro differences' you first hit when picking a Docker FROM line or a server. Learn the personalities of the Debian family, Red Hat family, and Alpine, plus how to use apt/yum/apk — all tied directly to image selection."
tags: ["Linux", "コンテナ", "基礎"]
level: beginner
lang: en
translationKey: linux-distros-and-packages
---

> 📚 Series "Getting Serious About Linux" (1 / 6)

The first thing you run into when writing a Docker `FROM` line or choosing a server is "which Linux?"
Let's cover the differences between the Debian family, Red Hat family, and Alpine, along with their
**package management (apt/yum/apk)**, framed to connect directly to [choosing a container image](/en/posts/deploying-go-apps/).

## What is a distribution?

The core of Linux (the kernel) is nearly the same across the board. What differs is the **"bundle"
of tools, package management, standard directory layout, and so on** wrapped around it. The school of
thought behind each bundle is a **distribution**.

> 💡 The [kernel is the common foundation](/en/posts/kernel-role-for-containers/), and distros are the "toppings on the lunchbox" on top of it.
> That's why the basic commands and mechanics are the same on any distro; the differences mostly show up in package management and default layout.

## The personalities of the three families

| Family | Representatives | Package management | Personality |
| --- | --- | --- | --- |
| Debian family | Debian, Ubuntu | apt (`.deb`) | Rich in docs and packages. A safe default when unsure |
| Red Hat family | RHEL, CentOS, Rocky, Fedora | yum / dnf (`.rpm`) | The go-to for enterprise servers. EC2's Amazon Linux is in this family too |
| Alpine | Alpine Linux | apk | Tiny (a few MB). Popular for container images |

## Package management (apt / yum / apk)

A package manager centrally handles "install, remove, and update software" via commands.
The commands differ per family, but what they do is the same.

```bash
# Debian family (apt)
apt update && apt install -y curl

# Red Hat family (dnf / old yum)
dnf install -y curl

# Alpine (apk)
apk add --no-cache curl
```

| Task | apt | dnf/yum | apk |
| --- | --- | --- | --- |
| Update list | `apt update` | (automatic) | (automatic) |
| Install | `apt install` | `dnf install` | `apk add` |
| Remove | `apt remove` | `dnf remove` | `apk del` |

## How this matters for choosing a Docker image

The tag suffix on a base image is exactly this distro choice.

```dockerfile
FROM node:22            # Debian family (large but safe)
FROM node:22-alpine     # Alpine (small)
```

- **Alpine is a few MB and lightweight**, so pulls are fast and the attack surface is small. Favored in CI and containers
- However, Alpine's standard C library is **musl** (a different beast from the common glibc). You can hit
  snags where binaries that assume glibc don't run or behave subtly differently

> ⚠️ If you make Go a [static binary with `CGO_ENABLED=0`](/en/posts/deploying-go-apps/), it becomes libc-independent and
> runs safely on Alpine, `scratch`, or `distroless` alike. Being able to sidestep the musl problem is a strength of Go.

> 🧭 .NET also picks a distro via tags, like `mcr.microsoft.com/dotnet/runtime:8.0` versus `...:8.0-alpine`.
> The "base image tag = distro choice" structure is common across languages.

## Summary

- The kernel is shared; a distro is a difference in the **bundle of surrounding tools and layout**
- Three families: **Debian family (apt) / Red Hat family (dnf, yum) / Alpine (apk)**. EC2's Amazon Linux is Red Hat family
- Package management just differs in commands; "install, remove, update" is the same
- A Docker base image's tag is the distro choice itself. **Alpine is light, but watch out for musl**
- A Go static binary lets you avoid the musl problem while keeping the image minimal

**→ Next:** [② Basic Commands and Pipes/Redirects](/en/posts/linux-basic-commands/)
