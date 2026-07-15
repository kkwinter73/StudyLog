---
title: "Sandboxing — Running Untrusted Code Locked Inside a 'Box'"
date: 2026-07-15T16:00:00
summary: "Run mystery code as-is and the host is theirs. A sandbox locks code inside an isolated box so it can't harm the outside. Here's where sandboxes are used, what they cut off (files, network, system calls), the strength-vs-cost tradeoff from OS features to containers, gVisor, microVMs, and WASM, and the limit called sandbox escape."
tags: ["セキュリティ", "基礎"]
level: intermediate
lang: en
translationKey: sandboxing
---

Run untrusted code normally and it can read your files, talk to the network, and seize privileges.
**Sandboxing** runs code locked inside an **isolated box** so it **can't harm the outside**.
The core idea is **deny by default** — from inside the box, only the minimal, explicitly permitted things are possible.

## Why isolate — running untrusted code safely

Running code that "you didn't write" or "isn't known to be safe" comes up more than you'd think.

- **Browser**: the JavaScript on a page you open is someone else's code. Isolate per tab/site with separate processes
- **Mobile apps**: box each app so it can't freely touch other apps or the whole device
- **Containers/serverless**: safely co-host other people's workloads or functions on the same platform
- **Plugins, extensions, user-submitted code**: PR code that runs in CI, user scripts in a SaaS
- **Malware analysis**: run a dangerous sample in an isolated environment to observe its behavior

> ⭐ A sandbox's goal isn't "prevent bad things" but "**even if bad things happen, confine the damage to the box.**"
> Assuming the code gets hijacked, the core idea is to **minimize the blast radius**.

## What it cuts off — fencing with least privilege

You build the box's walls by narrowing what can be accessed. Typically it restricts:

- **Filesystem**: limit what's visible (files outside the box effectively don't exist)
- **Network**: block/limit outbound. Don't let data be exfiltrated
- **System calls**: narrow what can be asked of the kernel (forbid dangerous syscalls)
- **Resources**: caps on CPU, memory, run time (prevent runaway or resource exhaustion)
- **Privileges**: drop unneeded ones (don't grant root-equivalent)

> 🧭 .NET once offered an **in-process sandbox** via AppDomain / Code Access Security, but that's now deprecated.
> The current norm: "isolate untrusted code **at the OS/process/container layer, not with language features**." The lower the layer, the stronger the boundary.

## How to build it — strength and cost are two sides of a coin

Isolation is "stronger = heavier." Pick the strength that fits the use. The base is [OS features](/posts/container-namespace-cgroup/).

| Method | Isolation strength | Cost | Example |
| --- | --- | --- | --- |
| OS features directly | weak–medium | light | seccomp (syscall limits), chroot, capabilities |
| Container | medium (shared kernel) | light | Docker (namespace + cgroup) |
| User-space kernel | strong | medium | gVisor (intercepts and serves syscalls) |
| MicroVM | strong (separate kernel) | medium–heavy | Firecracker (the base for Lambda, etc.) |
| WASM | medium–strong (capability-based) | light | WASI (hand over only permitted capabilities) |

- Containers are light but **share the host kernel**. A hole in the kernel can become a hole in the box's wall ([user vs kernel space](/posts/user-space-vs-kernel-space/))
- To seriously isolate other people's code, thicken the kernel boundary with **gVisor or a microVM**. That's why AWS Lambda uses microVMs

## The limit — sandbox escape

The box isn't perfect. Breaking the wall to get out is called a **sandbox escape (breakout)**.

- Exploit a kernel or hypervisor vulnerability and you can slip outside the box, to the host
- So **don't rely on a single wall**. Narrow syscalls with seccomp, drop privileges, layer a VM boundary — make it **defense in depth**
- "It's sandboxed, so it's totally safe" is a no. With **patching** and **least privilege** as the base, treat the box as one more layer on top

> ⚠️ Isolation strength always trades off against operational cost and performance. You don't need to put everything in the strongest VM.
> Choosing strength by **how trusted the code is** (your own code, or someone's arbitrary code) is the pragmatic approach.

## Summary

- A sandbox runs untrusted code in an **isolated box** and **confines damage inside it**. The base is **deny by default**
- Use cases are where you "run someone else's code": browsers, mobile apps, containers/serverless, plugins, malware analysis
- It cuts off **files, network, system calls, resources, privileges**. Fence with least privilege
- Build it, by strength: **OS features < container < gVisor < microVM** (+ WASM). A **stronger = heavier** tradeoff
- The box isn't perfect (**sandbox escape**). With defense in depth, patching, and least privilege as the base, choose strength by trust level

**Related:** [Container Isolation (namespace/cgroup)](/posts/container-namespace-cgroup/) / [User Space vs Kernel Space](/posts/user-space-vs-kernel-space/) / [The Kernel's Role for Containers](/posts/kernel-role-for-containers/) / [Supply Chain Attack](/posts/supply-chain-attack/)
