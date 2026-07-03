---
title: "Why Architecture Matters — Dependencies and the Dependency Inversion Principle (DIP)"
date: 2026-06-19T20:00:00
summary: "As code grows, you reach a state where you're afraid to touch it. The key to preventing that is managing the direction of dependencies. Let's sort out good vs. bad dependencies, and the core idea behind it all: the Dependency Inversion Principle (DIP)."
tags: ["アーキテクチャ", "設計"]
level: beginner
lang: en
translationKey: why-architecture-and-dip
---

> 📚 Series: "Learning Architecture and Testing with Go" (1 / 7)

Boiled down to its essence, any discussion of software architecture comes down to one thing: **how do you control the direction of dependencies?**
Let's start with "why it matters" and the core idea behind it, the Dependency Inversion Principle (DIP).

## You don't need it when small, but it pays off as you grow

A script of a few hundred lines needs no design. But somewhere past 10,000 lines, code without design becomes **"code you're afraid to touch."**

- Changing one place breaks another
- Adding a new feature takes longer and longer
- You can't write tests (or the tests you write are meaningless)
- New members can't understand the whole thing

Architecture prevents this in four ways.

| Goal | What it means |
| --- | --- |
| Resilience to change | Business logic and DB / UI can be changed independently |
| Testability | You can exercise logic without connecting to a DB or API |
| Divisible work | No more "only that one person can touch this area" |
| Swappable technology | Changing the DB doesn't change the business logic |

> 🧭 In C#/.NET you'd tackle the same problems with ASP.NET Core's layered approach, DDD, or CQRS. What you want to achieve in Go is the same — only the tools and conventions differ.

## A dependency is "the direction of influence"

`A` importing `B` = **A depends on B**. If B changes, A is affected; if B breaks, A breaks too.
The direction of a dependency is exactly the direction of influence.

### Bad dependencies (high coupling)

An example where business logic is wired directly to a concrete DB implementation.

```go
package usecase

import "myapp/infrastructure/mysql" // depends on a concrete technology

func GetUser(id int) (*User, error) {
	db := mysql.Connect()            // wired directly to MySQL
	row := db.QueryRow("SELECT ...") // SQL written inline
	// ...
}
```

With this, switching away from MySQL means a rewrite, tests require a real DB, and the DB's concerns leak into the logic.

### Good dependencies (low coupling)

Request the "capability you need" via an interface, and keep the concrete implementation outside the logic.

```go
package usecase

// Requires only the "ability to fetch a user"
type UserRepository interface {
	FindByID(id int) (*User, error)
}

func GetUser(repo UserRepository, id int) (*User, error) {
	return repo.FindByID(id)
}
```

Both the MySQL implementation and the test mock just need to satisfy this interface.

```go
// Production: MySQL implementation
type UserRepo struct{ db *sql.DB }
func (r *UserRepo) FindByID(id int) (*User, error) { /* MySQL-specific logic */ }

// Test: mock implementation
type MockRepo struct{ Users map[int]*User }
func (m *MockRepo) FindByID(id int) (*User, error) { return m.Users[id], nil }
```

## The Dependency Inversion Principle (DIP)

Normally dependencies flow "upper layer (logic) → lower layer (DB implementation)." DIP inverts this so that
**the upper layer defines the interface and the lower layer satisfies it.**

```text
[Before inversion] usecase ──→ mysql            (usecase knows about mysql)

[After inversion]  usecase ──→ Repository(interface)
                                    ↑
                                  mysql         (mysql satisfies usecase's definition)
```

The dependency arrow points the other way. And this **pairs beautifully with Go's implicit interface implementation.**
The `mysql` package doesn't even import `usecase`'s `Repository` — as long as its methods line up, it satisfies the interface automatically.

> 💡 Depend on the "abstraction (interface)," not the "implementation." This is the foundation of every pattern — layered, hexagonal, clean.

## Summary

- The core of architecture is "managing the direction of dependencies"
- Direction of dependency = direction of influence. Depending directly on implementations makes you fragile to change and hard to test
- Depend on interfaces and push implementations outward to get loose coupling
- DIP = the upper layer defines the abstraction and the lower layer satisfies it. A great fit for Go's implicit interfaces

Next, we'll compare three representative architecture patterns that put this principle into practice.

**→ Next:** [Comparing three architecture patterns](/en/posts/architecture-patterns-compared/)
