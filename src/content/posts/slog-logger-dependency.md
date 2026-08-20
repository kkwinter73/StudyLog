---
title: "*slog.Logger を持ち回す — グローバルロガーをやめて依存として渡す"
date: 2026-08-20T11:00:00
summary: "slog.Info をどこからでも呼べるのは便利だが、テストと文脈で詰まる。*slog.Logger を依存として渡す設計と、With / context / Handler 差し替えの使い分けを整理する。"
tags: ["監視", "運用", "Go"]
level: intermediate
---

`slog.Info("...")` はどこからでも呼べて手軽だが、規模が大きくなると「このログは誰が出したのか」
「テストで出力を検証したい」で詰まる。この記事では **`*slog.Logger` という型そのもの**に注目して、
Handler との役割分担、依存として渡す設計、`With` と `context` の使い分け、テスト時の差し替え方を押さえる。

[ログ設計の基本](/posts/logging-with-slog/)（構造化・レベル・書かないもの）は前提として扱う。
ここは**ロガーをどう持ち回すか**の話だ。

## Logger と Handler の役割分担

`slog` は2層に分かれている。ここを掴むと残りは全部その応用だ。

| 型 | 役割 | 差し替える頻度 |
| --- | --- | --- |
| `*slog.Logger` | 呼び出し口。`Info` / `With` などの薄い API | ほぼ固定 |
| `slog.Handler` | 出力の形式・宛先・フィルタを決める実装 | 環境ごとに差し替える |

```go
h := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
logger := slog.New(h) // *slog.Logger を作る
logger.Info("server started", "port", 8080)
```

`Logger` 自体はロジックをほとんど持たない。**「どこに、どんな形で出すか」は全部 Handler 側**にある。
だからテストや環境差の対応は Handler の差し替えで済み、呼び出しコードは一切変わらない。

> ⚠️ `*slog.Logger` の**ゼロ値は使えない**。Handler が nil なので呼ぶと panic する。
> 構造体フィールドに持たせるときは、必ずコンストラクタで詰めるか nil なら `slog.Default()` に倒す。

> 🧭 C# の `ILogger`（呼び出し口）と Sink / Provider（出力先）の分離とちょうど同じ。`slog.New` が `ILoggerFactory.CreateLogger` に相当する。

## グローバルロガーで詰まるところ

`slog.SetDefault(logger)` しておけば `slog.Info` がどこからでも使える。小さいツールならこれで十分だが、
アプリが育つと3つ効いてくる。

- **テストが書けない**。出力先がグローバルなので、並列テストで奪い合う。
  `t.Parallel()` と相性が悪い
- **文脈を付けられない**。「この handler のログには常に `request_id` を付けたい」ができず、
  呼び出しごとに手で書くことになる
- **依存が隠れる**。関数シグネチャを見てもログを出すか分からない。ライブラリとして切り出すとき、
  勝手にグローバルへ書く実装は使いにくい

> 💡 判断の目安は「**そのコードを他から呼び回すか**」。`main` の初期化や使い捨てスクリプトは
> `slog.Default()` で十分。パッケージとして再利用するものは受け取る形にする。

## 依存として受け取る

素直な形は、構造体フィールドに `*slog.Logger` を持たせてコンストラクタで注入すること。

```go
type OrderService struct {
	repo   OrderRepository
	logger *slog.Logger
}

func NewOrderService(repo OrderRepository, logger *slog.Logger) *OrderService {
	if logger == nil {
		logger = slog.Default() // 呼び出し側の手間を減らす保険
	}
	return &OrderService{repo: repo, logger: logger.With("component", "order")}
}

func (s *OrderService) Create(ctx context.Context, o Order) error {
	if err := s.repo.Save(ctx, o); err != nil {
		s.logger.ErrorContext(ctx, "save failed", "order_id", o.ID, "error", err)
		return fmt.Errorf("OrderService.Create: %w", err)
	}
	s.logger.InfoContext(ctx, "order created", "order_id", o.ID)
	return nil
}
```

コンストラクタで `With("component", "order")` を1回かけておくのが要点。
以降このサービスが出す全ログに `component` が付き、**呼び出し側は何も意識しない**。

> ⭐ ロガーは[依存性逆転](/posts/why-architecture-and-dip/)の対象にしなくていい。
> `slog.Handler` がすでにインターフェースなので、**自前の `Logger` インターフェースを定義する必要はない**。
> `*slog.Logger` を具体型のまま受け取るのが素直で、テストも Handler 差し替えで足りる。

## With と WithGroup — 文脈を積む

`With` は**新しい `*slog.Logger` を返す**（元は変わらない）。積んだ属性はそのロガー経由の全ログに付く。

```go
log := s.logger.With("request_id", reqID, "user_id", userID)
log.InfoContext(ctx, "processing")     // request_id と user_id が付く
```

属性名が衝突しやすい場合は `WithGroup` で入れ子にする。

```go
log := s.logger.WithGroup("http").With("method", "POST", "path", "/orders")
log.Info("request received")
// {"msg":"request received","http":{"method":"POST","path":"/orders"}}
```

| やりたいこと | 使うもの |
| --- | --- |
| 以降ずっと付けたい属性 | `With`（結果を変数に受けて持ち回す） |
| 属性を名前空間で束ねたい | `WithGroup` |
| その1行だけの属性 | 呼び出し時の引数 |

> 💡 `With` は呼んだ時点で Handler 側に属性を事前整形させるので、**ループの外で1回呼ぶ**のが得。
> ループの中で毎回 `With` すると、その都度ロガーが増える。

## context に載せるかどうか

ミドルウェアを何層も通す HTTP ハンドラでは、引数でロガーを持ち回すのが辛くなる。
選択肢は2つあり、どちらも実際に使われている。

```go
// A. ロガー自体を context に入れる
type ctxKey struct{}

func WithLogger(ctx context.Context, l *slog.Logger) context.Context {
	return context.WithValue(ctx, ctxKey{}, l)
}

func LoggerFrom(ctx context.Context) *slog.Logger {
	if l, ok := ctx.Value(ctxKey{}).(*slog.Logger); ok {
		return l
	}
	return slog.Default() // 取り出せなくても動く形にする
}
```

```go
// B. ID だけ context に入れ、Handler 側で取り出して付ける
func (h *traceHandler) Handle(ctx context.Context, r slog.Record) error {
	if id, ok := ctx.Value(reqIDKey{}).(string); ok {
		r.AddAttrs(slog.String("request_id", id))
	}
	return h.next.Handle(ctx, r)
}
```

| 方式 | 利点 | 欠点 |
| --- | --- | --- |
| A. ロガーを context に | 中間層が何も知らなくていい。導入が速い | 依存が暗黙になる。取り出し忘れると属性が消える |
| B. Handler で付与 | 呼び出し側は `InfoContext` だけでよい | Handler を自作する必要がある |

`InfoContext` などの `*Context` 系メソッドが存在する理由がここにある。**`ctx` は Handler にそのまま渡される**ので、
B のように「context から値を拾って属性にする」Handler が書ける。
[分散トレーシング](/posts/distributed-tracing-otel/)の trace ID を全ログに載せるのは、この形が定番だ。

> ⚠️ A を選ぶなら `LoggerFrom` は**必ず既定値に倒す**。nil を返す実装にすると、
> context を引き継ぎ忘れた1箇所で panic する。

## テストと性能

Handler を差し替えられるので、**ログ出力自体をテストできる**。

```go
func TestCreate_logsOnFailure(t *testing.T) {
	var buf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&buf, nil))

	svc := NewOrderService(failingRepo{}, logger)
	_ = svc.Create(context.Background(), Order{ID: 7})

	if !strings.Contains(buf.String(), `"level":"ERROR"`) {
		t.Errorf("expected an ERROR log, got: %s", buf)
	}
}
```

`bytes.Buffer` に出すだけなので、グローバルを触らず `t.Parallel()` も安全に効く。
逆に**ログを完全に捨てたい**テストでは Go 1.24 で入った `slog.DiscardHandler` が使える。

性能が気になる経路（毎リクエスト・ループ内）では2つ手がある。

```go
// 1. 高コストな値の組み立てを、出力されないなら丸ごと省く
if logger.Enabled(ctx, slog.LevelDebug) {
	logger.DebugContext(ctx, "dump", "payload", expensiveDump())
}

// 2. LogAttrs で ...any の箱詰めを避ける
logger.LogAttrs(ctx, slog.LevelInfo, "order created",
	slog.Int("order_id", 1042), slog.Int("amount", 1200))
```

> 💡 とはいえ**最初から `LogAttrs` で書く必要はない**。まず素直な `Info` で書き、
> プロファイルで問題になった経路だけ置き換える。可読性の方が普段は効く。

## まとめ

- `slog` は **`*slog.Logger`（呼び出し口）と `slog.Handler`（出力の実装）**の2層。差し替えるのは Handler
- 再利用されるコードは `*slog.Logger` を**依存として受け取る**。コンストラクタで `With` して素性を付ける
- 自前の Logger インターフェースは要らない。`slog.Handler` がすでに抽象になっている
- `With` は新しいロガーを返す。**ループの外で1回**。名前空間が欲しければ `WithGroup`
- context 経由は「ロガーを入れる」か「Handler で ID を拾う」の2択。**既定値に倒す実装**を忘れない
- テストは Handler を `bytes.Buffer` に差し替える。`Enabled` / `LogAttrs` は必要になってから

## 次にやること

- 手元のサービス構造体に `*slog.Logger` を足し、コンストラクタで `With("component", ...)` を付ける
- `slog.Info` の直接呼び出しを grep して、注入されたロガー経由に置き換える
- `request_id` を付与する Handler をラップして書き、[トレース](/posts/distributed-tracing-otel/)の ID も同じ経路で載せてみる
