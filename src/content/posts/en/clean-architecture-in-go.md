---
title: "Implementing Clean Architecture in Go"
date: 2026-06-19T17:00:00
summary: "Using go-clean-arch as a reference, we implement the full domain / usecase / repository / delivery / infrastructure layout end to end, including wiring up dependency injection in main.go."
tags: ["アーキテクチャ", "クリーンアーキテクチャ", "Go"]
level: intermediate
lang: en
translationKey: clean-architecture-in-go
---

> 📚 Series "Learning Architecture and Testing with Go" (4 / 7)

Let's take [the concentric circles and rules from last time](/en/posts/clean-architecture-concepts/)
and map them onto a Go directory layout and code. This is a minimal setup based on
bxcodec's go-clean-arch.

## Directory layout

```text
myapp/
├── domain/              ← ① Entity (domain model)
│   └── user.go
├── usecase/             ← ② Use Case
│   └── user_usecase.go
├── repository/          ← Repository interface definition
│   └── user_repository.go
├── delivery/http/       ← ③ Interface Adapter (HTTP handler)
│   └── user_handler.go
├── infrastructure/      ← ④ Frameworks & Drivers (DB implementation)
│   └── postgres/user_repository.go
└── main.go              ← wiring (dependency injection)
```

## ① Entity (domain layer)

Give the Entity its own business rules. It depends on nothing.

```go
// domain/user.go
package domain

import (
	"errors"
	"strings"
	"time"
)

type User struct {
	ID        int
	Name      string
	Email     string
	CreatedAt time.Time
}

func (u *User) IsValid() error {
	if u.Name == "" {
		return errors.New("name is required")
	}
	if !strings.Contains(u.Email, "@") {
		return errors.New("invalid email address")
	}
	return nil
}
```

## Repository interface (defined by the usecase side)

Declare the "capabilities you need" from the inside. It knows nothing about the implementation.

```go
// repository/user_repository.go
package repository

import "myapp/domain"

type UserRepository interface {
	FindByID(id int) (*domain.User, error)
	Store(user *domain.User) error
	// FindAll, Update, Delete ...
}
```

## ② Use Case

It depends only on the interface, and delegates validation to the Entity.

```go
// usecase/user_usecase.go
package usecase

type UserUseCase struct {
	repo repository.UserRepository // doesn't know the concrete implementation
}

func NewUserUseCase(repo repository.UserRepository) *UserUseCase {
	return &UserUseCase{repo: repo}
}

func (uc *UserUseCase) CreateUser(name, email string) (*domain.User, error) {
	user := &domain.User{Name: name, Email: email, CreatedAt: time.Now()}

	if err := user.IsValid(); err != nil { // rules are delegated to the Entity
		return nil, fmt.Errorf("validation error: %w", err)
	}
	if err := uc.repo.Store(user); err != nil {
		return nil, fmt.Errorf("failed to save user: %w", err)
	}
	return user, nil
}
```

## ④ Repository implementation (infrastructure layer)

It satisfies `repository.UserRepository` **implicitly**. It doesn't even import the interface.

```go
// infrastructure/postgres/user_repository.go
package postgres

type UserRepository struct{ db *sql.DB }

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) FindByID(id int) (*domain.User, error) {
	u := &domain.User{}
	err := r.db.QueryRow(
		"SELECT id, name, email, created_at FROM users WHERE id = $1", id,
	).Scan(&u.ID, &u.Name, &u.Email, &u.CreatedAt)
	return u, err
}

func (r *UserRepository) Store(user *domain.User) error {
	_, err := r.db.Exec(
		"INSERT INTO users (name, email, created_at) VALUES ($1, $2, $3)",
		user.Name, user.Email, user.CreatedAt,
	)
	return err
}
```

## ③ HTTP handler (delivery layer)

```go
// delivery/http/user_handler.go
package http

type UserHandler struct{ useCase *usecase.UserUseCase }

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(r.PathValue("id"))
	user, err := h.useCase.GetUser(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}
```

## main.go = wiring (dependency injection)

Inject dependencies from the outside in. **Only main knows everyone; each layer knows only what's inside it.**

```go
func main() {
	db, _ := sql.Open("postgres", "postgres://...")

	userRepo := postgres.NewUserRepository(db)     // ④ create the outermost implementation
	userUseCase := usecase.NewUserUseCase(userRepo) // ② inject the Repository
	userHandler := handler.NewUserHandler(userUseCase) // ③ inject the UseCase

	mux := http.NewServeMux()
	mux.HandleFunc("GET /users/{id}", userHandler.GetUser)
	http.ListenAndServe(":8080", mux)
}
```

```text
Assembly flow:
  postgres.UserRepository(④) ──inject──▶ usecase(②) ──inject──▶ handler(③) ──▶ HTTP
  * Entity(①) is just a struct definition, so no assembly is needed
```

> 💡 The key point is that you can pass `userRepo` (a concrete type) to the UseCase
> as a `repository.UserRepository` (an interface). Because Go uses implicit
> implementation, it just works as long as the methods line up.

## Summary

- Split layers into packages; the inner ones (domain/usecase) don't import the outer ones
- The Repository interface is defined by "the side that uses it" (the usecase)
- The implementation (postgres) satisfies the interface implicitly, without importing it
- main.go is the wiring layer. It injects dependencies from outside in, and each layer knows only what's inside it

Next we move on to "testing," where this loose coupling pays off.

**← Prev:** [The ideas behind Clean Architecture](/en/posts/clean-architecture-concepts/)
**→ Next:** [Getting started with testing in Go](/en/posts/go-testing-basics/)
