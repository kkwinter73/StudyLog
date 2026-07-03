---
title: "The Kernel's Role — the Manager Between Hardware and Apps (Groundwork for Understanding Containers)"
date: 2026-06-22T09:00:00
summary: "Why containers are 'lightweight' clicks into place once you know what the OS kernel does. We nail down what the kernel does between hardware and apps to build a foundation for understanding containers."
tags: ["コンテナ", "インフラ", "基礎"]
level: beginner
lang: en
translationKey: kernel-role-for-containers
---

People often say "containers are lighter than VMs," but *why* they're lighter clicks into place once you understand **the role of the OS kernel**.
This article steps one level below containers themselves to nail down **what the kernel does between hardware and apps**.

## What the Kernel Is — the Manager Standing in Front of the Hardware

Apps **don't touch hardware directly** — CPU, memory, disk, network. The thing that stands in the middle and brokers access is the **kernel** (the core of the OS). An app **asks** the kernel "I want to read a file," "I need memory," and the kernel operates the hardware and returns the result.

```text
[ App (your Go binary, etc.) ]
            ↓ request (system call)
[ Kernel: manager of resources ]
            ↓ operate
[ Hardware: CPU / memory / disk / NIC ]
```

Why not let apps touch it directly? Because if multiple apps fought over the hardware at the same time, things would break. With the kernel acting as the **sole manager** doling it out, each app can behave as if it "has a machine all to itself."

## The Four Jobs the Kernel Handles

Brokering hardware access breaks down roughly into four kinds.

| Job | What it's doing | How it looks from the app |
| --- | --- | --- |
| Process management | Deciding which app gets to use the CPU and when | It looks like the app has the CPU all to itself |
| Memory management | Carving out physical memory and lending it to each app | It looks like the app has its own vast memory |
| File system | Presenting data on disk as files/directories | You can read and write via names like `/var/log/app.log` |
| Device/network | Abstracting devices like NICs and disks | You use devices via sockets or files without thinking about the hardware |

> 💡 The common idea is **abstraction**. The kernel re-presents raw hardware in forms that are easy for apps to work with: "processes," "memory spaces," "files," "sockets."

## User Space and Kernel Space — the Boundary and System Calls

The world in memory is split in two: the **user space** where apps run, and the **kernel space** where the kernel runs. Apps can't step directly into kernel space — they can only make requests through a fixed gateway: **system calls**.

```text
User space     | app code (privilege: restricted)
   --- system call (open / read / write …) ---
Kernel space   | kernel code (privilege: full authority over hardware)
```

Thanks to this boundary, even if one app crashes, the whole OS and other apps aren't dragged down with it. They're isolated by a wall of privilege.

> 🧭 In C#/.NET, when you call `File.ReadAllText()`, internally it ultimately reaches an OS system call (`read`, etc.). Go's `os.ReadFile()` is the same. **The bottom of a high-level API connects to the kernel in every language.**

## Bridging to Containers — Sharing a Single Kernel

Here's the main point. **The decisive difference between VMs and containers is how they handle the kernel.**

- **VM**: Stands up an entire separate guest OS (i.e., a kernel). Several OSes run at once, so it's heavy.
- **Container**: **Shares the host's kernel as-is** and isolates only the app. There's just one OS, so it's light.

So with only one kernel, how do you create the feeling of "a machine all to itself"? Two kernel features simply carve up the world a process can see.

| Feature | Role | What it partitions |
| --- | --- | --- |
| namespace | Limits what's visible | Process list, network, file tree, hostname, etc. |
| cgroups | Limits how much can be used | CPU and memory ceilings |

> ⭐ A container isn't a "lightweight VM" — it's **just a process, isolated by the kernel's isolation features**. From the host, `ps` shows it as an ordinary process. That's why containers are light and fast.

In other words, a container is what you get when you turn up, by one notch, the job the kernel already did — "allocate resources per process and isolate them." That's why, to truly understand [what a container is](/en/posts/aws-compute-explained/), it pays to first nail down the role of the kernel underneath.

## Summary

- The kernel is the **sole manager** standing between hardware and apps. Apps don't touch hardware directly
- Its jobs fall into four big buckets: **process / memory / file / device-network**. The common thread is "abstraction"
- Apps can only ask the kernel via **system calls**. This boundary is what produces isolation
- **A VM duplicates the whole kernel; a container shares the host's kernel.** That's why containers are light
- Container isolation is realized by kernel features: **namespace (what's visible) + cgroups (how much can be used)**

Next up: seeing exactly what namespace and cgroups partition, tied to the behavior of `docker run`.
