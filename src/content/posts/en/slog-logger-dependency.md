---
title: "Passing *slog.Logger Around — Dropping the Global Logger for a Dependency"
date: 2026-08-20T11:00:00
summary: "Calling slog.Info from anywhere is convenient until you need tests and context. Here's how to inject *slog.Logger as a dependency, and when to reach for With, context, or a swapped Handler."
tags: ["監視", "運用", "Go"]
level: intermediate
lang: en
translationKey: slog-logger-dependency
---

`slog.Info("...")` works from anywhere, which is handy — until the codebase grows and you hit
"who emitted this log?" and "I want to assert on this output in a test." This post focuses on
**the `*slog.Logger` type itself**: how it splits work with Handler, how to inject it as a
dependency, when to use `With` versus `context`, and how to swap it out in tests.

The [basics of log design](/en/posts/logging-with-slog/) — structure, levels, what never to log —
are assumed here. This post is about **how you carry the logger around**.

## How Logger and Handler split the work

`slog` has two layers. Grasp this and everything else is an application of it.

| Type | Role | How often you swap it |
| --- | --- | --- |
| `*slog.Logger` | The call site API — a thin `Info` / `With` surface | Almost never |
| `slog.Handler` | Decides format, destination, and filtering | Per environment |

```go
h := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
logger := slog.New(h) // build a *slog.Logger
logger.Info("server started", "port", 8080)
```

`Logger` itself holds almost no logic. **Where and in what shape output goes is entirely the
Handler's business.** So tests and per-environment differences are handled by swapping the
Handler, and the calling code never changes.

> ⚠️ The **zero value of `*slog.Logger` is unusable** — its handler is nil, so calling it panics.
> If you store one in a struct field, always fill it in the constructor or fall back to
> `slog.Default()` when nil.

> 🧭 Exactly the C# split between `ILogger` (the call site) and sinks / providers (the destination). `slog.New` is the equivalent of `ILoggerFactory.CreateLogger`.

## Where the global logger breaks down

Call `slog.SetDefault(logger)` and `slog.Info` works everywhere. That's plenty for a small tool,
but three problems show up as an app grows.

- **You can't write tests.** The destination is global, so parallel tests fight over it.
  It plays badly with `t.Parallel()`
- **You can't attach context.** "Every log from this handler should carry `request_id`" isn't
  expressible; you end up writing it by hand at every call
- **The dependency is hidden.** A function signature doesn't tell you whether it logs. And code
  that writes to a global is awkward to extract as a library

> 💡 The rule of thumb is "**will this code be called from elsewhere?**" `main`'s setup and
> throwaway scripts are fine with `slog.Default()`. Anything reused as a package should receive
> its logger.

## Receiving it as a dependency

The straightforward shape: a `*slog.Logger` struct field, injected in the constructor.

```go
type OrderService struct {
	repo   OrderRepository
	logger *slog.Logger
}

func NewOrderService(repo OrderRepository, logger *slog.Logger) *OrderService {
	if logger == nil {
		logger = slog.Default() // a safety net that keeps callers simple
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

The key move is calling `With("component", "order")` once in the constructor. Every log this
service emits now carries `component`, and **callers never have to think about it**.

> ⭐ A logger doesn't need [dependency inversion](/en/posts/why-architecture-and-dip/) applied to
> it. `slog.Handler` is already an interface, so **you don't need to define your own `Logger`
> interface**. Accept the concrete `*slog.Logger`; swapping the Handler covers testing.

## With and WithGroup — stacking context

`With` **returns a new `*slog.Logger`** (the original is unchanged). The attributes you stack
appear on every log through that logger.

```go
log := s.logger.With("request_id", reqID, "user_id", userID)
log.InfoContext(ctx, "processing")     // carries request_id and user_id
```

When attribute names are prone to collision, nest them with `WithGroup`.

```go
log := s.logger.WithGroup("http").With("method", "POST", "path", "/orders")
log.Info("request received")
// {"msg":"request received","http":{"method":"POST","path":"/orders"}}
```

| What you want | What to use |
| --- | --- |
| Attributes on everything from here on | `With` (keep the returned logger) |
| Attributes grouped under a namespace | `WithGroup` |
| An attribute for just this one line | Call-site arguments |

> 💡 `With` lets the Handler pre-format those attributes up front, so **call it once outside the
> loop**. Calling it inside the loop creates a new logger every iteration.

## Whether to put it in context

In an HTTP handler that passes through several middleware layers, threading the logger through
arguments gets painful. There are two options, both used in practice.

```go
// A. Put the logger itself in the context
type ctxKey struct{}

func WithLogger(ctx context.Context, l *slog.Logger) context.Context {
	return context.WithValue(ctx, ctxKey{}, l)
}

func LoggerFrom(ctx context.Context) *slog.Logger {
	if l, ok := ctx.Value(ctxKey{}).(*slog.Logger); ok {
		return l
	}
	return slog.Default() // stay working even when there's nothing to extract
}
```

```go
// B. Put only the ID in the context; the Handler pulls it out and attaches it
func (h *traceHandler) Handle(ctx context.Context, r slog.Record) error {
	if id, ok := ctx.Value(reqIDKey{}).(string); ok {
		r.AddAttrs(slog.String("request_id", id))
	}
	return h.next.Handle(ctx, r)
}
```

| Approach | Upside | Downside |
| --- | --- | --- |
| A. Logger in context | Intermediate layers need to know nothing. Quick to adopt | The dependency becomes implicit; forget to extract and attributes vanish |
| B. Handler attaches it | Call sites only need `InfoContext` | You have to write your own Handler |

This is why the `*Context` methods exist: **`ctx` is handed straight to the Handler**, which
makes approach B possible. Putting a
[distributed tracing](/en/posts/distributed-tracing-otel/) trace ID on every log is the classic
use of this shape.

> ⚠️ If you pick A, make `LoggerFrom` **always fall back to a default**. Return nil and the one
> place that forgot to propagate the context will panic.

## Tests and performance

Because the Handler is swappable, **you can test the log output itself**.

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

It writes to a `bytes.Buffer`, touches no global, and is safe under `t.Parallel()`. When a test
should **discard logs entirely**, use `slog.DiscardHandler`, added in Go 1.24.

On hot paths (per request, inside loops) there are two tools.

```go
// 1. Skip building an expensive value entirely when it won't be emitted
if logger.Enabled(ctx, slog.LevelDebug) {
	logger.DebugContext(ctx, "dump", "payload", expensiveDump())
}

// 2. Use LogAttrs to avoid boxing into ...any
logger.LogAttrs(ctx, slog.LevelInfo, "order created",
	slog.Int("order_id", 1042), slog.Int("amount", 1200))
```

> 💡 That said, **don't start with `LogAttrs`**. Write the plain `Info` first and convert only
> the paths a profile flags. Readability usually matters more.

## Summary

- `slog` has two layers: **`*slog.Logger` (call site) and `slog.Handler` (the output impl)**.
  You swap the Handler
- Reusable code should **receive `*slog.Logger` as a dependency**, calling `With` in the
  constructor to stamp its identity
- You don't need your own Logger interface — `slog.Handler` is already the abstraction
- `With` returns a new logger. Call it **once, outside the loop**. Use `WithGroup` for namespaces
- Via context, pick "logger in context" or "Handler pulls the ID." Either way, **fall back to a default**
- Test by swapping the Handler onto a `bytes.Buffer`. Reach for `Enabled` / `LogAttrs` only when needed

## Next steps

- Add a `*slog.Logger` to one of your service structs and stamp `With("component", ...)` in its constructor
- Grep for direct `slog.Info` calls and route them through the injected logger
- Write a wrapping Handler that attaches `request_id`, then carry a [trace](/en/posts/distributed-tracing-otel/) ID the same way
