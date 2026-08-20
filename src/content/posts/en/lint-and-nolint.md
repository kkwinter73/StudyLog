---
title: "Intro to lint and //nolint — How Strict Should Static Analysis Be?"
date: 2026-08-20T10:00:00
summary: "Linting hands the machine everything humans shouldn't have to review. Here are the real benefits, the real costs, and how to write //nolint exceptions properly."
tags: ["QA", "Go", "CICD"]
level: beginner
lang: en
translationKey: lint-and-nolint
---

Linting (static analysis) flags suspicious code **without running it**. Done well, it makes code
review lighter; done badly, it fills your codebase with "changes made only to get CI green."
This post covers what Go's linters actually look at, the benefits and costs of adopting them,
and how to use `//nolint` to mark exceptions — plus the trade-offs involved.

Of all the ways to [build quality in rather than bolt it on](/en/posts/qa-quality-built-in/),
linting is the cheapest entry point.

## What linters actually look at

Go gives you two tools at different levels of strictness.

| Tool | Role | What it checks |
| --- | --- | --- |
| `gofmt` | Standard, formatting | Layout. Nothing to argue about, so **always apply it everywhere** |
| `go vet` | Standard, bundled | Only "almost certainly a mistake." Very few false positives |
| `golangci-lint` | Third party | A bundle of linters. Goes as far as matters of policy |

What `go vet` catches is the class of code that compiles but doesn't match intent.

```go
name := "gopher"
fmt.Printf("hello %d\n", name) // vet: arg name for %d verb
```

`golangci-lint` layers more on top: unhandled `error` return values (`errcheck`), unused
identifiers (`unused`), places that could be written more simply (`staticcheck`), and so on.
Configuration lives in `.golangci.yml`.

```yaml
version: "2"
linters:
  default: standard      # errcheck, govet, ineffassign, staticcheck, unused
  enable:
    - revive             # adds naming and style checks
  exclusions:
    rules:
      - path: _test\.go
        linters: [errcheck]
```

> 🧭 In C# terms: `gofmt` ≒ `dotnet format`, `go vet` ≒ compiler warnings, `golangci-lint` ≒ Roslyn Analyzers + StyleCop. Failing CI on lint findings is the same idea as `TreatWarningsAsErrors`.

## The upside — fewer things humans have to look at

The value of linting is less "it finds bugs" and more that **noise disappears from review**.

- **Findings come from a machine, not a person.** No round trips over naming or formatting,
  and no feelings involved
- **It catches the genuinely dangerous class of bug.** Dropped `err` values, mistakes inside
  `defer`, `Printf` type mismatches — humans miss these, linters never do
- **The codebase becomes uniform.** Reading other people's code gets faster, and diffs read better
- **It runs early.** Tens of seconds in CI. It fails before [tests](/en/posts/testing-strategy-pyramid/) do,
  so the rework is small

> 💡 `errcheck` pays off the most. Go has no exceptions — errors come back as return values — so
> **forgetting to receive one becomes a bug that fails silently**. Pair it with a convention of
> [wrapping and returning errors](/en/posts/error-handling-wrapping/) for the biggest effect.

## The downside — false positives and "changes to pass"

There's a real cost, though. Turn on `default: all` without acknowledging it and things get ugly.

| Cost | What actually happens |
| --- | --- |
| False positives | Deliberate code gets flagged. Once ignoring becomes a habit, every finding gets ignored |
| Contorting to pass | Code gets **rewritten less readably** just to silence a finding. Quality drops, CI is green |
| Rule politics | Endless debate over whether a rule is worth it — taste, not engineering |
| CI time and flakiness | More linters, longer builds. A version bump makes **yesterday's code fail today** |

The second one is the worst. Writing `_ = doSomething()` to shut `errcheck` up
**just hides the fact that you're ignoring the error** — nothing improved.

> ⚠️ **Pin your linter version** in CI. With `latest`, CI goes red one day even though you
> changed nothing, and the investigation stops your actual work.

## //nolint — making exceptions explicit

Every rule has legitimate exceptions. In Go you suppress one spot with a `//nolint` comment.

```go
// Line scope (this line only)
_, _ = io.Copy(io.Discard, resp.Body) //nolint:errcheck // draining the body; failure is harmless

//nolint:gosec // fixed internal path only; no user input reaches this
data, err := os.ReadFile(configPath)
```

There are rules about how to write it.

- **No space before `//nolint`** (`// nolint` isn't treated as a machine-readable comment)
- **Always name the linter.** A bare `//nolint` **silences every linter on that line**
- **Write the reason after `//`.** "Why is this an exception" is your explanation to reviewers
  and to yourself six months from now

Where you put it determines the scope.

| Placement | Scope |
| --- | --- |
| End of a statement line | That line only |
| On its own line directly above a declaration | The whole function, type, or variable declaration |
| Before the `package` clause | The entire file (too broad — avoid) |

And you can lint the `nolint`s themselves. Enabling `nolintlint` flags suppressions with no
explanation, and ones that are no longer needed.

```yaml
linters:
  enable:
    - nolintlint
  settings:
    nolintlint:
      require-explanation: true   # ban suppressions with no reason
      require-specific: true      # ban suppressions with no linter name
      allow-unused: false         # flag nolints that no longer suppress anything
```

> ⭐ **A `nolint` with a reason is a recorded design decision, not debt.** One without a reason
> carries no information beyond "it complained, so I silenced it" — you can't even tell whether
> it's safe to delete.

> 🧭 Same role as C#'s `#pragma warning disable CS0168` or `[SuppressMessage(..., Justification = "...")]`. The habit of writing a Justification maps directly onto `//nolint:xxx // reason`.

## Four levels of suppression — where to allow the exception

`nolint` is only one option. The real trade-off is **matching the mechanism to how broad the
exception truly is**.

| Mechanism | Scope | When it fits |
| --- | --- | --- |
| Fix the code | Permanent | Most cases. Consider this first |
| `//nolint:xxx` | One line or one declaration | A local exception you can justify in one line |
| `exclusions` in config | By path (generated code, `_test.go`) | Areas where the rule structurally doesn't apply |
| Disable the linter | Whole project | The rule doesn't match your team's policy |

Work top to bottom, and keep asking: **is this exception really about just this line?** If the
same `nolint` shows up in ten places, that's a signal it isn't a line-level exception at all —
it's **a rule that belongs in configuration**.

> 💡 Conversely, disabling a linter wholesale hides the reasoning from the code. Leave a comment
> in `.golangci.yml` too. As a record of a decision, it deserves the same treatment as `nolint`.

## Adding lint to an existing codebase

A new project can be strict from day one. The hard case is **retrofitting**, where flipping
everything on produces thousands of findings and stalls the work.

```bash
# Only look at the diff: ignore existing findings, fail on newly written lines
golangci-lint run --new-from-rev=origin/main
```

That gets you a workable policy: new code is clean, old code gets fixed when you touch it.
Even if you do want to clean up the backlog, **a huge mechanical diff can't be reviewed** — go
one linter at a time in small PRs.

A sensible order of escalation:

1. Require `gofmt` + `go vet` in CI (no false positives, hard to argue with)
2. Add `errcheck` / `staticcheck` / `unused`. That covers most findings with real consequences
3. Style linters (`revive`, etc.) **only after the team agrees**. Skip the agreement and you get politics
4. Add `nolintlint` so every exception must carry a reason

When you [wire this into CI](/en/posts/cicd-github-actions/), cache aggressively to keep runs
short. A slow linter teaches people not to run it locally, and then CI becomes the first place
anything fails.

## Summary

- Linting's main value is **removing noise from code review**, more than finding bugs
- The costs are false positives and **rewrites that exist only to pass** — the latter lowers
  quality while CI stays green
- Suppress locally with `//nolint:linter // reason`: no leading space, name the linter, give a reason
- Escalate suppression as **fix → `nolint` → path exclusion → disable**, matching mechanism to scope
- Retrofit with `--new-from-rev`. Tighten in stages, and add style rules only by agreement
- Pin the linter version. `latest` produces red CI runs unrelated to your changes

## Next steps

- Add `go vet ./...` to CI, then add `errcheck` and count the findings in your existing code
- Sort those findings yourself into "fix," "`nolint` with a reason," and "exclude"
- Turn on `nolintlint` and check whether your existing `nolint`s carry reasons
