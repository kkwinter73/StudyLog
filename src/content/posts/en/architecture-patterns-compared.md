---
title: "Comparing Three Architecture Patterns"
date: 2026-06-19T19:00:00
summary: "Layered, hexagonal, and clean architecture. They all share the same goal: protecting business logic from external technology. Here we sort out the three by their direction of dependency."
tags: ["アーキテクチャ", "設計"]
level: intermediate
lang: en
translationKey: architecture-patterns-compared
---

> 📚 Series: "Learning Architecture and Testing with Go" (2 / 7)

The previous post, ["managing the direction of dependencies"](/en/posts/why-architecture-and-dip/), takes concrete shape as architecture patterns. Let's line up three representative ones and see how they differ.

## Layered Architecture (N-tier)

The most basic one. Responsibilities are split by layer, and dependencies flow one way, from top to bottom.

```text
┌─────────────────────┐
│  Presentation layer  │  HTTP handlers, request/response
├─────────────────────┤
│  Business Logic layer│  use cases, domain rules
├─────────────────────┤
│  Data Access layer   │  DB operations, external API calls
└─────────────────────┘
        dependency direction: top → bottom
```

- **Pros**: easy to understand, easy to divide up the work
- **Cons**: changes in lower layers tend to ripple up (DB concerns leak into the logic)

> 🧭 The typical ASP.NET Core structure `Controller → Service → Repository` is exactly this.

## Hexagonal Architecture (Ports & Adapters)

Business logic sits at the center, and connections to the outside are separated into **ports (interfaces)** and **adapters (implementations)**.

```text
        ┌──── HTTP Adapter
        │
Port ── Core (business logic) ── Port
        │
        └──── DB Adapter
```

The core knows nothing about the outside; it talks through ports. Swap out an adapter and you swap out the technology. It helps to think of it as [DIP](/en/posts/why-architecture-and-dip/) turned into structure.

## Clean Architecture

Hexagonal, but with even stricter rules. **Dependencies must always point "outside → inside,"** and the inner layers know nothing about the outer ones. We'll cover this in detail next time.

## Comparing the Three

| Pattern | Best for | Dependency rule |
| --- | --- | --- |
| Layered | small to mid-scale, simple | one-way, top → bottom |
| Hexagonal | when you want to swap technology | abstract the outside behind interfaces |
| Clean | complex logic | dependencies always point outside → inside (inner knows nothing of outer) |

> 💡 They all share the same goal — protecting business logic from external technology (DB, web, UI). Pick based on scale and complexity; there's no need to reach for the strictest one right away.

## Summary

- Layered is the simplest, but changes in lower layers tend to ripple up
- Hexagonal puts logic at the center and abstracts the outside with ports/adapters
- Clean is a stricter form that pins dependencies to "outside → inside"
- All three aim to "protect logic from external technology." Choose by scale

Next, we'll dig into clean architecture's concentric circles and the "dependency rule."

**← Prev:** [Why Do We Need Architecture?](/en/posts/why-architecture-and-dip/)
**→ Next:** [How to Think About Clean Architecture](/en/posts/clean-architecture-concepts/)
