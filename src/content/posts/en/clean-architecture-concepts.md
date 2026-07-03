---
title: "The Idea Behind Clean Architecture — Concentric Circles and the Dependency Rule"
date: 2026-06-19T18:00:00
summary: "Uncle Bob's concentric circles. The further out, the more it's a 'detail'; the further in, the more it's a 'policy'. The single most important thing: 'dependencies always point outer → inner, and the inner never knows about the outer.' We also clear up common misconceptions."
tags: ["アーキテクチャ", "クリーンアーキテクチャ", "設計"]
level: intermediate
lang: en
translationKey: clean-architecture-concepts
---

> 📚 Series "Architecture and Testing with Go" (3 / 7)

A design principle proposed by Robert C. Martin (Uncle Bob). That famous "concentric circles" diagram gets all the attention, but the essence comes down to a single rule.

## The structure of the concentric circles

The further out, the more it's a "detail" (easy to change); the further in, the more it's a "policy" (hard to change).

```text
┌─ Frameworks & Drivers (outermost) ───────────┐
│  Web framework, DB, external APIs             │
│  ┌─ Interface Adapters ───────────────┐     │
│  │  Controller, Gateway, Presenter     │     │
│  │  ┌─ Application Business Rules ─┐    │     │
│  │  │  Use Cases                    │    │     │
│  │  │  ┌─ Enterprise Rules ──┐    │    │     │
│  │  │  │  Entities (domain)   │    │    │     │
│  │  │  └────────────────────┘    │    │     │
│  │  └────────────────────────────┘    │     │
│  └─────────────────────────────────────┘     │
└───────────────────────────────────────────────┘
```

## The Dependency Rule (the most important thing)

> ⭐ **Dependencies always point in one direction only: "outer → inner." The inner never knows the outer exists.**

- An Entity doesn't know about the UseCase
- A UseCase doesn't know about the Controller
- A Controller may know about the Framework (because it's on the outside)

If an outer import shows up in inner code, that's a design violation. As long as you hold to this one point, the number of circles or their names aren't what matters.

## The responsibility of each layer

```text
① Entity (domain model)
   The business rules themselves. The least likely to change. Depends on nothing.
   e.g. User, Order and their validation

② Use Case
   App-specific rules. Operations like "register" or "confirm."
   Uses Entities and defines interfaces such as Repository.

③ Interface Adapter
   The conversion layer that connects Use Cases to the outside world.
   Controller (input conversion) / Presenter (output conversion) / Gateway (DB conversion)

④ Frameworks & Drivers
   Concrete technologies: web server, DB driver, external API clients, etc.
```

## What's the payoff? (Migrating MySQL → PostgreSQL)

| Layer | With Clean Architecture |
| --- | --- |
| ① Entity | No change |
| ② Use Case | No change (the Repository interface stays the same) |
| ③ Adapter | Rewrite the Repository implementation for PostgreSQL |
| ④ Framework | Swap out the driver |

Only the outer two layers change. You don't touch the logic at all. If SQL had been written directly into the logic, you'd be rewriting everything and redoing all the tests.

## Common misconceptions

> ⚠️ The four circles do NOT mean "you must split into exactly four layers."

- ❌ **You have to split into exactly four layers** → Four layers is overkill for a small app. Understand the principle and pick the right granularity.
- ❌ **Folder structure = architecture** → Splitting into folders is meaningless if the direction of dependencies isn't respected.
- ❌ **Entity = the DB table model** → An Entity is a domain object that holds business rules. The ORM model belongs on the outside.
- ❌ **It should be applied to every project** → For a CRUD-only API it's over-engineering. The value shows up when the logic is complex.

## Summary

- The concentric circles represent "outer = detail / inner = policy"
- The essence is a single thing —— "dependencies point outer → inner, and the inner never knows the outer"
- The four responsibilities: Entity / UseCase / Adapter / Framework
- More important than folder splits or layer counts is respecting the direction of dependencies

Next, we'll bring this idea down to an actual Go directory structure and code.

**← Prev:** [Comparing Three Architecture Patterns](/en/posts/architecture-patterns-compared/)
**→ Next:** [Implementing Clean Architecture in Go](/en/posts/clean-architecture-in-go/)
