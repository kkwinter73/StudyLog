---
title: "QA — Building Quality In"
date: 2026-06-19T14:00:00
summary: "Testing is the activity of 'finding bugs'; QA is the activity of 'building a system where bugs are unlikely to be born.' Here we organize Go's static analysis and CI, plus the virtuous cycle of quality that architecture brings."
tags: ["テスト", "QA", "設計"]
level: intermediate
lang: en
translationKey: qa-quality-built-in
---

> 📚 Series "Learning Architecture and Testing with Go" (7 / 7 · finale)

To close the series, let's talk about QA. Not testing alone, but as **a system that builds quality in**.

## The difference between testing and QA

- **Testing**: the activity of finding bugs
- **QA**: the activity of building a system where bugs are unlikely to be born (testing is one part of it)

What QA includes ── test design and execution / code review / CI/CD / static analysis (linters) /
monitoring and alerting / incident response processes.

## The further "upstream" you build quality in, the cheaper it is

```text
Fix cost
 high │                      ╱  ← most expensive when found in production
      │                  ╱
      │              ╱
 low  │  ╱──────╱
      └──────────────────────────→
       design  impl  test  release  ops
```

> 💡 The more upstream (design, implementation) you catch it, the cheaper the fix. So rather than
> "test everything later," it's ultimately faster to reject issues with static analysis and tests the moment you write the code.

## Quality measures you can take in Go

```bash
# Static analysis
go vet ./...          # Go's standard static analysis
golangci-lint run     # run multiple linters together

# Testing
go test ./...         # unit tests
go test -race ./...   # race condition detection
go test -cover ./...  # coverage

# Formatting (one shared correct answer for the whole team)
go fmt ./...
```

> 🧭 In Go, `go fmt` gives one unambiguous formatting. Not having "indentation debates" is a quietly effective QA win. (In C#/.NET you'd rely on editorconfig plus a formatter like `dotnet format`, but the answer isn't as canonically single.)

## The flow of building it into CI

```text
Pull Request → CI runs automatically
  ├─ go fmt        format check
  ├─ go vet        static analysis
  ├─ golangci-lint linter
  ├─ go test -race all tests
  └─ go test -cover coverage
Once everything passes → review → merge → auto deploy
```

The knack is to let human review focus on "design and naming," and leave mechanical nitpicks to CI.

## The virtuous cycle of architecture and QA

```text
Dependencies are separated
  → you can test layer by layer → tests are fast → CI is fast
  → the barrier to writing tests drops → tests increase → bugs decrease
  → you gain confidence in changes → you can refactor → quality improves ──┐
  └──────────────────────────────────────────────────────────────────────┘
```

> ⭐ Architecture and testing aren't separate topics. Good design makes tests easy to write,
> and the habit of writing tests keeps the design good. They reinforce each other.

## Summary

- Testing = finding bugs / QA = building a system where bugs are unlikely to be born
- The further upstream you build quality in, the cheaper it is. Reject issues the moment you write the code
- Go comes with `vet` / `golangci-lint` / `test -race` / `fmt`
- Automate mechanical checks in CI, and let review focus on design
- Good architecture and testing create a virtuous cycle

With this, the "Learning Architecture and Testing with Go" series is complete.
Looking back from [the first article](/en/posts/why-architecture-and-dip/), you should be able to see that
everything connects through "the direction of dependencies."

**← Prev:** [Testing Strategy — the pyramid and what to test](/en/posts/testing-strategy-pyramid/)
**↩ Back to the start of the series:** [Why we need architecture](/en/posts/why-architecture-and-dip/)
