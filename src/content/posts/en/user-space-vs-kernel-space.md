---
title: "User Space vs. Kernel Space — Why the World Is Split in Two"
date: 2026-06-22T10:00:00
summary: "The 'user space' where apps run and the 'kernel space' where the OS core runs. Why they're separated, what differs, and how you cross the boundary — covering system calls and mode switches."
tags: ["インフラ", "基礎"]
level: beginner
lang: en
translationKey: user-space-vs-kernel-space
---

On top of an OS, the world where code runs is split into two: **user space** and **kernel space**.
In [The Kernel's Role](/en/posts/kernel-role-for-containers/) I touched on this boundary in just one section; here I tackle it head-on.
We'll understand it through three questions: why split it, what differs, and how you cross it.

## The Two Spaces — What Actually Differs

They live in the same memory-based world, but their **privileges and capabilities** are completely different.

| | User space | Kernel space |
| --- | --- | --- |
| Who runs | Apps (your Go binary, etc.) | The kernel (the OS core) and drivers |
| Privileges | Restricted. Can't touch hardware directly | Full power. Can operate the CPU, memory, and devices directly |
| Can do | Compute, read/write its own memory | Process management, memory allocation, device operations |
| On failure | Just that process dies | The whole OS can go down with it (kernel panic) |

> 💡 The CPU itself has a hardware distinction between a "privileged mode" and an "unprivileged mode."
> User-space code is run in unprivileged mode, where instructions that touch hardware simply can't be executed.

## Why Split It — Protection and Stability

The reason is simple: **to keep one runaway app from taking down the entire OS**.

- If you let apps touch hardware directly, one buggy program could corrupt memory or disk and drag everything down with it
- So apps are confined to unprivileged mode, and all dangerous operations are done by **asking the kernel to do them on your behalf**
- The kernel checks whether the requested operation is valid before executing it. This becomes the **wall of protection**

> ⭐ The core principle that "apps don't touch hardware directly — they ask the kernel" comes from this privilege wall.
> Because the wall exists, even if one app crashes, the OS and the other apps survive.

## Crossing the Boundary — System Calls and Mode Switches

When an app wants to do a hardware-related operation like reading a file or communicating over the network,
it asks the kernel through a fixed gateway called a **system call**. At this moment the CPU
**switches from user mode to kernel mode (a mode switch)**, and returns once the work is done.

```text
App:    calls read()
   │  ── mode switch (user → kernel) ──▶
Kernel: checks permissions, actually reads from disk
   │  ◀── mode switch (kernel → user) ──
App:    receives the read data and continues
```

This round trip has **a small cost**. So when performance matters, tricks to "reduce the number of system calls"
(like batching reads and writes with buffering) start to pay off.

> 🧭 Both C#/.NET's `FileStream` and Go's `bufio` are mechanisms for **batching to reduce** these round trips internally.
> Reading 4KB at a time is faster than reading one byte at a time, because it crosses the boundary fewer times.

## Where It Pays Off

Knowing this two-layer structure makes a lot of things look a level clearer.

- **Containers**: they share the host's single kernel (kernel space) and isolate only the app side (user space).
  That's why [containers are lightweight](/en/posts/kernel-role-for-containers/)
- **Blast radius of a crash**: an app's bug stops at that process. It's rare for the OS to go down too (= that's a kernel-side problem)
- **Performance tuning**: "it's slow" being caused by calling too many system calls is a common story

## Summary

- The world is split into **user space (apps, restricted)** and **kernel space (OS core, full power)**
- The privilege wall is built by the CPU's **hardware mechanism** of privileged/unprivileged modes
- The reason to split is **protection and stability** — to keep a runaway app from taking down the entire OS
- You cross the boundary via **system calls**, and each crossing triggers a **mode switch** (a small cost)
- Batching reads and writes to **reduce the number of boundary crossings** is the go-to move for performance

Next up: actually peek at system calls (on Linux, `strace ./app` lets you observe the system calls an app makes).
