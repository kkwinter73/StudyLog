---
title: "クリーンアーキテクチャをGoで実装する"
date: 2026-06-19T17:00:00
summary: "go-clean-arch を参考に、domain / usecase / repository / delivery / infrastructure の構成と、main.go での依存の注入（配線）までを通して実装する。"
tags: ["アーキテクチャ", "クリーンアーキテクチャ", "Go"]
level: intermediate
---

> 📚 シリーズ「Goで学ぶアーキテクチャとテスト」(4 / 7)

[前回の同心円とルール](/posts/clean-architecture-concepts/)を、Go のディレクトリ構成と
コードに落とす。bxcodec の go-clean-arch を参考にした最小構成。

## ディレクトリ構成

```text
myapp/
├── domain/              ← ① Entity（ドメインモデル）
│   └── user.go
├── usecase/             ← ② Use Case
│   └── user_usecase.go
├── repository/          ← Repository インターフェース定義
│   └── user_repository.go
├── delivery/http/       ← ③ Interface Adapter（HTTP ハンドラ）
│   └── user_handler.go
├── infrastructure/      ← ④ Frameworks & Drivers（DB 実装）
│   └── postgres/user_repository.go
└── main.go              ← 配線（依存の注入）
```

## ① Entity（domain 層）

ビジネスルールを Entity 自身に持たせる。何にも依存しない。

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
		return errors.New("名前は必須です")
	}
	if !strings.Contains(u.Email, "@") {
		return errors.New("メールアドレスが不正です")
	}
	return nil
}
```

## Repository インターフェース（usecase 側が定義）

「必要な能力」を内側で宣言する。実装は知らない。

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

インターフェースだけに依存し、バリデーションは Entity に委譲する。

```go
// usecase/user_usecase.go
package usecase

type UserUseCase struct {
	repo repository.UserRepository // 具体実装を知らない
}

func NewUserUseCase(repo repository.UserRepository) *UserUseCase {
	return &UserUseCase{repo: repo}
}

func (uc *UserUseCase) CreateUser(name, email string) (*domain.User, error) {
	user := &domain.User{Name: name, Email: email, CreatedAt: time.Now()}

	if err := user.IsValid(); err != nil { // ルールは Entity に委譲
		return nil, fmt.Errorf("バリデーションエラー: %w", err)
	}
	if err := uc.repo.Store(user); err != nil {
		return nil, fmt.Errorf("ユーザー保存に失敗: %w", err)
	}
	return user, nil
}
```

## ④ Repository 実装（infrastructure 層）

`repository.UserRepository` を **暗黙的に** 満たす。インターフェースを import すらしない。

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

## ③ HTTP ハンドラ（delivery 層）

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

## main.go ＝ 配線（依存の注入）

外側から内側へ依存を注入していく。**main だけが全員を知り、各層は自分の内側しか知らない。**

```go
func main() {
	db, _ := sql.Open("postgres", "postgres://...")

	userRepo := postgres.NewUserRepository(db)     // ④ 最外層の実装を作る
	userUseCase := usecase.NewUserUseCase(userRepo) // ② Repository を注入
	userHandler := handler.NewUserHandler(userUseCase) // ③ UseCase を注入

	mux := http.NewServeMux()
	mux.HandleFunc("GET /users/{id}", userHandler.GetUser)
	http.ListenAndServe(":8080", mux)
}
```

```text
組み立ての流れ:
  postgres.UserRepository(④) ──注入──▶ usecase(②) ──注入──▶ handler(③) ──▶ HTTP
  ※ Entity(①) は構造体定義のみなので組み立て不要
```

> 💡 ポイントは `userRepo`（具体型）を `repository.UserRepository`（インターフェース）として
> UseCase に渡せること。Go は暗黙実装なので、メソッドが揃っていればそのまま通る。

## まとめ

- 層をパッケージで分け、内側（domain/usecase）は外側を import しない
- Repository インターフェースは「使う側（usecase）」が定義する
- 実装（postgres）はインターフェースを import せず暗黙的に満たす
- main.go が配線役。外→内へ依存を注入し、各層は内側しか知らない

次は、この疎結合が活きる「テスト」に入る。

**← 前:** [クリーンアーキテクチャの考え方](/posts/clean-architecture-concepts/)
**→ 次:** [Goのテスト入門](/posts/go-testing-basics/)
