---
title: "Goのテスト入門 — testing とテーブル駆動"
date: 2026-06-19T16:00:00
summary: "Go は標準の testing パッケージだけでテストが完結する。モックは手書き、Arrange-Act-Assert の流れ、そして定番のテーブル駆動テストまでを押さえる。"
tags: ["テスト", "Go", "基礎"]
level: beginner
---

> 📚 シリーズ「Goで学ぶアーキテクチャとテスト」(5 / 7)

[前回まで](/posts/clean-architecture-in-go/)で依存をインターフェースに逃がした。
その疎結合が活きるのがテスト。Go のテストは標準ライブラリだけで書ける。

## なぜテストを書くのか

- **バグを早期発見** — 手動より圧倒的に速い
- **変更を安全にする** — リファクタしてテストが通れば壊れていない
- **設計の品質を上げる** — テストしにくい = 依存が多すぎる、のサイン
- **ドキュメント代わり** — 「何ができるか」がコードで分かる

## 基本形：モックは手書き

インターフェースを満たすモックを書き、UseCase に注入する。

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
	// Arrange（準備）
	repo := &mockUserRepo{users: map[int]*domain.User{
		1: {ID: 1, Name: "田中", Email: "tanaka@example.com"},
	}}
	uc := usecase.NewUserUseCase(repo)

	// Act（実行）
	user, err := uc.GetUser(1)

	// Assert（検証）
	if err != nil {
		t.Fatalf("エラーが発生: %v", err)
	}
	if user.Name != "田中" {
		t.Errorf("Name = %s, want 田中", user.Name)
	}
}
```

ポイント：テスト関数は `Test` で始め、`*testing.T` を取る。致命的なら `t.Fatal`、
継続して報告するなら `t.Error`。**Arrange → Act → Assert** の3段で読みやすく保つ。

> 🧭 C# では xUnit/NUnit + Moq でモックを生成する。Go はインターフェースが小さいので、
> モックライブラリなしで手書きするのが基本。

## よく使うコマンド

```bash
go test ./...              # 全テスト実行
go test -v ./usecase/...   # 詳細表示
go test -run TestGetUser   # 名前で絞り込み
go test -cover ./...       # カバレッジ表示
```

## テーブル駆動テスト（Goの定番）

入力と期待値を表（スライス）にまとめ、`t.Run` でサブテストとして回す。
ケース追加が1行で済むのが強み。

```go
func TestCreateUser(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{name: "正常", input: "tanaka@example.com", wantErr: false},
		{name: "空文字", input: "", wantErr: true},
		{name: "@なし", input: "invalid-email", wantErr: true},
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

> 🧭 C# の `[Theory]` + `[InlineData]` が近い。考え方は同じ「データを変えて同じ検証を回す」。

## まとめ

- Go のテストは標準 `testing` だけで完結。モックは手書きが基本
- テスト関数は `Test` で始め、`Fatal`（致命）/`Error`（継続）を使い分ける
- Arrange-Act-Assert の3段で書くと読みやすい
- ケースが増えるならテーブル駆動。`t.Run` でサブテスト化する

次は「どこまで・どの種類のテストを書くか」という戦略の話。

**← 前:** [クリーンアーキテクチャをGoで実装する](/posts/clean-architecture-in-go/)
**→ 次:** [テスト戦略 — ピラミッドと何をテストするか](/posts/testing-strategy-pyramid/)
