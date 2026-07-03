---
title: "Processes vs. Threads — Setting the Stage for goroutines"
date: 2026-06-22T11:00:00
summary: "What actually differs between a process and a thread, and what do they share? Once you grasp the cost of OS threads, it clicks why Go's goroutines are called 'lightweight threads.'"
tags: ["並行処理", "基礎"]
level: beginner
lang: en
translationKey: process-vs-thread
---

What underpins "concurrency" are **processes** and **threads**. Once you know the difference between the two and the cost of OS threads,
it clicks why Go's [goroutines](/en/posts/goroutine-channel-basics/) are called "lightweight threads."
Here we'll nail down the OS-level mechanics that sit just below goroutines.

## Processes and Threads — Definitions First

Roughly speaking, a **process is the box holding one running program**, and a **thread is a flow of execution actually running inside that box**.

| | Process | Thread |
| --- | --- | --- |
| What it is | A running program (one app) | A flow of execution inside a process |
| Memory | **Has its own memory space** (isolated from other processes) | **Shares the process's memory** |
| Relationship | One or more threads per process | Always belongs to some process |
| Isolation | Strong. One crashing rarely spreads to others | Weak. They touch the same memory, so they affect each other |

> 💡 "A process is an apartment building; threads are its residents." The residents (threads) share the same building (memory)
> as they go about their business, and they're walled off from other buildings (processes).

## What's Shared and What's Separate

This is the heart of concurrency: **threads within the same process share memory**.

- Shared: code, the heap (variables and objects), open files, and so on
- Per-thread: the stack (state of functions currently being called), and the execution position

Because they can share, passing data between threads is fast. But the flip side is that **writing the same data simultaneously corrupts it**
(a data race). That's why you need locks — or, in Go, passing data over channels.

> ⚠️ Processes are safe thanks to their isolation, but exchanging data between them requires a dedicated, heavyweight mechanism (IPC).
> Between threads it's fast, but you have to be careful handling shared memory — this **trade-off** is the starting point of concurrency.

## OS Threads Aren't Free

Threads are lighter than processes, but they're still **resources managed by the OS**, and they have a cost.

- Each thread reserves **stack memory on the order of MB**
- Creating and destroying one requires asking the OS (a system call)
- The **context switch** that decides which thread gets the CPU also takes time

So if you spin up tens of thousands of them with a "one thread per request" model, you hit a ceiling on memory and switching cost.
This limit is the motivation for goroutines, coming up next.

> 🧭 In C#/.NET, the reason you don't create tons of raw `Thread`s and instead use `Task`/`ThreadPool` is the same.
> OS threads are finite and heavy, so the idea of layering a lightweight abstraction on top and reusing them is shared.

## Bridging to goroutines

A Go **goroutine** isn't an OS thread itself — it's a **much lighter unit of execution** that rides on top of one.

- The stack starts at a few KB and grows as needed (orders of magnitude smaller than the MB-scale OS thread stack)
- You can spin up tens or hundreds of thousands of them
- The Go runtime **multiplexes** many goroutines onto a small number of OS threads (M:N scheduling)

```go
// No need to think about OS threads — just add `go` and one more flow of execution appears
go handle(req) // this is the "lightweight thread" = goroutine
```

The goroutine breaks the assumption that "threads are heavy, so you can't spawn them freely" by having the runtime shoulder that burden.
That's why [the basics of goroutines and channels](/en/posts/goroutine-channel-basics/) make more sense once you read them on top of this foundation.

## Summary

- **A process is an isolated box of memory; a thread is a flow of execution running inside it**
- Threads in the same process **share memory**. Fast, but watch out for data races
- OS threads carry MB-scale memory plus creation/switching costs, so **you can't grow them without limit**
- A **goroutine** is a lightweight unit riding on top of OS threads. Starting at a few KB, you can spin up tens of thousands
- The Go runtime places many goroutines onto a few OS threads (M:N) — that's the real nature of "lightweight"

Next up: in [goroutines and channels](/en/posts/goroutine-channel-basics/), we'll look at actually launching them and passing data safely.
