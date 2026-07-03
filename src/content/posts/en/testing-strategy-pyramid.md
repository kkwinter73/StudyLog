---
title: "Testing Strategy — The Pyramid and What to Test"
date: 2026-06-19T15:00:00
summary: "In what ratio should you write unit, integration, and E2E tests? A look at the test pyramid, plus what you should prioritize testing and what you can skip."
tags: ["テスト", "設計"]
level: intermediate
lang: en
translationKey: testing-strategy-pyramid
---

> 📚 Series: "Learning Architecture and Testing with Go" (6 / 7)

After [how to write tests](/en/posts/go-testing-basics/) comes "which ones, and how many." Rather than adding tests blindly, keep the shape of the pyramid in mind.

## The Test Pyramid

A healthy suite has many at the bottom (unit) and few at the top (E2E).

```text
        ╱  E2E  ╲        few, slow, expensive (browser actions, whole API)
      ╱──────────╲
    ╱ integration ╲      middle (DB connection, between components)
  ╱────────────────╲
 ╱    unit tests    ╲    many, fast, cheap (per function / method)
╱────────────────────╲
```

| Type | Target | Speed | DB | Example |
| --- | --- | --- | --- | --- |
| Unit | Functions, methods | Fast | Not needed | UseCase logic |
| Integration | Multiple components | Medium | Often needed | UseCase + Repository |
| E2E | The whole system | Slow | Needed | HTTP request → response |

> ⚠️ When the pyramid becomes an "inverted triangle" (all E2E), you end up with a slow, brittle test suite. The basic move is to build a thick foundation of fast unit tests.

## What Should You Test

```text
✅ Prioritize
  - Business logic (Entity, UseCase)
  - Validation (rejecting invalid input)
  - Error handling (behavior on the unhappy path)
  - Boundary values (0 items, 1 item, upper limits)

❌ No need to write
  - Framework features themselves (HTTP routing, etc.)
  - Verifying how external libraries behave
  - Trivial methods like getters/setters
```

## Testable Code = Good Design

Difficulty writing tests is a design problem surfacing.

| Hard-to-test code | Easy-to-test code |
| --- | --- |
| Depends on global variables | Dependencies injected via interfaces |
| Connects to the DB directly inside a function | Side effects (DB/file/network) separated out |
| One function does too much | A single responsibility |
| Dependencies hardcoded (new) | Injected from outside |

> 💡 The right direction isn't "it's hard to test, so I won't"—it's "revisit the design so it's easy to test." If you push dependencies outward with [clean architecture](/en/posts/clean-architecture-concepts/), unit tests fall into place naturally.

## Summary

- Thick on unit, thin on E2E — keep the "pyramid" shape
- Prioritize logic, validation, the unhappy path, and boundary values
- Don't test the framework or external libraries themselves
- Difficulty writing tests is a sign to revisit the design

Finally, on to the idea of "QA" (quality assurance) that wraps around testing.

**← Prev:** [Getting Started with Testing in Go](/en/posts/go-testing-basics/)
**→ Next:** [QA — Building Quality In](/en/posts/qa-quality-built-in/)
