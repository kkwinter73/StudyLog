---
title: "Getting Started with Testing in Go — testing and Table-Driven Tests"
date: 2026-06-19T16:00:00
summary: "In Go, the standard testing package is all you need to write tests. We cover hand-written mocks, the Arrange-Act-Assert flow, and the classic table-driven test."
tags: ["テスト", "Go", "基礎"]
level: beginner
lang: en
translationKey: go-testing-basics
---

> 📚 Series "Learning Architecture and Testing in Go" (5 / 7)

[Last time](/en/posts/clean-architecture-in-go/) we pushed dependencies behind interfaces.
That loose coupling really pays off in testing. Go's tests can be written with just the standard library.

## Why write tests

- **Catch bugs early** — overwhelmingly faster than doing it manually
- **Make changes safe** — if tests pass after a refactor, nothing's broken
- **Improve design quality** — hard to test = a sign of too many dependencies
- **Serve as documentation** — the code shows "what it can do"

## The basics: write mocks by hand

Write a mock that satisfies the interface and inject it into the UseCase.

```go
// user_usecase_test.go
package usecase_test

type mockUserRepo struct{ users map[int]*domain.User }

func (m *mockUserRepo) FindByID(id int) (*domain.User, error) {
	u, ok := m.users[id]
	if !ok {
		return nil, fmt.Errorf("not found")
	}
	return u, nil
}
func (m *mockUserRepo) Store(u *domain.User) error { m.users[u.ID] = u; return nil }

func TestGetUser_正常系(t *testing.T) {
	// Arrange
	repo := &mockUserRepo{users: map[int]*domain.User{
		1: {ID: 1, Name: "田中", Email: "tanaka@example.com"},
	}}
	uc := usecase.NewUserUseCase(repo)

	// Act
	user, err := uc.GetUser(1)

	// Assert
	if err != nil {
		t.Fatalf("error occurred: %v", err)
	}
	if user.Name != "田中" {
		t.Errorf("Name = %s, want 田中", user.Name)
	}
}
```

Key points: test functions start with `Test` and take a `*testing.T`. Use `t.Fatal` for fatal
failures, `t.Error` to report and keep going. Keep things readable with the three stages
**Arrange → Act → Assert**.

> 🧭 In C# you'd generate mocks with xUnit/NUnit + Moq. In Go, interfaces are small, so the norm
> is to hand-write mocks without a mocking library.

## Commonly used commands

```bash
go test ./...              # run all tests
go test -v ./usecase/...   # verbose output
go test -run TestGetUser   # filter by name
go test -cover ./...       # show coverage
```

## Table-driven tests (Go's staple)

Collect inputs and expected values into a table (a slice), and run them as subtests with `t.Run`.
The strength is that adding a case takes just one line.

```go
func TestCreateUser(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{name: "valid", input: "tanaka@example.com", wantErr: false},
		{name: "empty string", input: "", wantErr: true},
		{name: "no @", input: "invalid-email", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			uc := usecase.NewUserUseCase(&mockUserRepo{users: map[int]*domain.User{}})
			_, err := uc.CreateUser("田中", tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("err = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
}
```

> 🧭 C#'s `[Theory]` + `[InlineData]` is close. The idea is the same: "vary the data and run the same check."

## Summary

- Go's tests are complete with just the standard `testing` package. Hand-writing mocks is the norm
- Test functions start with `Test`; use `Fatal` (fatal) / `Error` (continue) appropriately
- Writing in the three stages of Arrange-Act-Assert keeps things readable
- When cases pile up, go table-driven and turn them into subtests with `t.Run`

Next up is the strategy side: "how much, and what kinds of tests to write."

**← Prev:** [Implementing Clean Architecture in Go](/en/posts/clean-architecture-in-go/)
**→ Next:** [Testing Strategy — the Pyramid and What to Test](/en/posts/testing-strategy-pyramid/)
