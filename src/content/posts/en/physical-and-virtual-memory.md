---
title: "Memory Management Basics — Physical vs. Virtual Memory"
date: 2026-06-22T12:00:00
summary: "Each process can act as if it has 'its own vast memory' thanks to virtual memory. Here's what goes wrong with only physical memory, and how virtual memory, paging, and address translation fix it."
tags: ["インフラ", "基礎"]
level: beginner
lang: en
translationKey: physical-and-virtual-memory
---

Of the four jobs listed in [The Role of the Kernel](/en/posts/kernel-role-for-containers/), here we dig into **memory management**.
The reason each process can behave as if it "has its own vast memory" is the mechanism of **virtual memory**.
Let's cover what goes wrong with physical memory alone, and how virtual memory solves it.

## What goes wrong with only physical memory

Physical memory (RAM) is a real, finite chip. If apps used physical addresses directly, problems would erupt.

- **Collisions**: If apps A and B happen to use the same address, they trample each other's data
- **Fragmentation**: Free space exists, but no contiguous region can be secured, so allocation fails
- **The capacity wall**: You can't handle data larger than physical memory

> ⚠️ The moment apps can touch the same physical address raw, [isolation](/en/posts/user-space-vs-kernel-space/) no longer holds.
> A single bug can freely corrupt another app's memory.

## Virtual memory — giving each process its own space

The solution is to **let apps use a made-up address called a "virtual address"**, while the kernel manages the mapping to actual physical addresses behind the scenes. Each process gets **its own vast address space starting from address 0**.

```text
Process A's virtual space ─┐
                           ├─▶ kernel translates ─▶ actual location in physical memory (RAM)
Process B's virtual space ─┘
```

- A's "address 100" and B's "address 100" map to **different physical memory** → no collision
- Apps don't need to care at all about the actual layout or free state of physical memory

> 💡 "A virtual address is like the extension number handed to each employee; a physical address is the actual phone." Extensions can start at 100 at every company, and the switchboard (the kernel) connects you to the real device.

## Paging and address translation

The mapping between virtual and physical is managed in fixed-size units called **pages** (typically 4KB).
Which virtual page maps to which physical page is recorded in a **page table**, and the translation is done quickly by hardware in the CPU called the **MMU (Memory Management Unit)**.

| Term | Meaning |
| --- | --- |
| Page | Unit of management (e.g., 4KB). Allocation and translation happen at this granularity |
| Page table | The virtual page → physical page mapping table (each process has its own) |
| MMU | The hardware inside the CPU that handles translation. Translates on every memory access |
| Page fault | Occurs when there's no corresponding physical page; the kernel handles it |

Because it works per page, physical memory can be allocated even from scattered free space (it doesn't need to be contiguous).
This also eases the fragmentation problem.

## Where it pays off

Knowing virtual memory ties these topics together.

- **Swap**: Evict unused pages to disk, letting you use more than physical memory (slower, but doesn't break down)
- **Isolation**: Each process has its own page table, so they can't peek at each other's memory = safe
- **OOM**: If you still exhaust physical + swap, the kernel kills a process (the OOM Killer)

> 🧭 C#/.NET's GC also manages its managed heap on top of this virtual address space. Go's GC is the same.
> **The language's memory management (GC) and the OS's memory management (virtual memory) are separate layers**, stacked in two tiers.

## Summary

- Using physical memory raw causes **collisions, fragmentation, the capacity wall, and broken isolation**
- **Virtual memory** shows each process a dedicated address space starting from address 0, and the kernel maps it to physical
- The mapping is managed **per page (4KB, etc.)**, translation is handled by the **MMU**, and the mapping table is the **page table**
- If physical runs short, **swap** evicts to disk. If you exhaust it, the **OOM Killer** kicks in
- The language's GC is a **layer above** the OS's virtual memory. Memory management is stacked in two tiers

Next up: peek at `/proc/<pid>/maps` (Linux) to see how a process's virtual address space is laid out.
