---
title: "Intro to Log Design — Emitting Logs You Can Actually Read Later with log/slog"
date: 2026-07-29T10:00:00
summary: "Logs are the primary source you read after an incident, so they have to be written for the reader. Structured logging, choosing levels, how to use Go's log/slog, and what must never go into a log."
tags: ["監視", "運用", "Go"]
level: beginner
lang: en
translationKey: logging-with-slog
---

Logs aren't read when you write them — they're read **after something breaks**. And the reader is
you, hunting for the trail of one request among thousands of lines. So design them not as
"output for checking that things work" but as **records you can search and aggregate later**.
This post covers structured logging, choosing levels, writing logs with Go's `log/slog`,
and what must never end up in a log.

Of the [three pillars](/en/posts/observability-basics/), the collection side
([CloudWatch Logs](/en/posts/cloudwatch-logs/)) has its own post; here we focus on
**what the application emits**.

## Why fmt.Println isn't enough

The naive version looks like this:

```go
fmt.Println("order created:", orderID, "amount:", amount)
```

The output is `order created: 1042 amount: 1200`. Fine for eyeballing locally, hopeless in production.

| Problem | Why |
| --- | --- |
| Can't filter | There's no mechanical way to pull out "only the ones where amount > 10000" |
| No who or when | No timestamp, no request ID. With concurrency, lines interleave |
| Can't turn it down | You can't silence the verbose lines in production only |
| Collectors can't parse it | The collection side expects one event per line, with structure |

Logs take their shape from **the reader, not the writer** — and the reader is both human eyes and a query.

> 🧭 Same story as moving from `Console.WriteLine` debugging to `ILogger` + Serilog in C#. Go's answer is `log/slog`, in the standard library since Go 1.21.

## Structured logging — make each line JSON

**Structured logging** means emitting a log line as a **set of keys and values** rather than a sentence.

```go
slog.Info("order created", "order_id", 1042, "amount", 1200)
```

With the JSON handler, that comes out as:

```json
{"time":"2026-07-29T10:12:03.412Z","level":"INFO","msg":"order created","order_id":1042,"amount":1200}
```

Now the collection side can work field by field: filter on `amount > 10000`, follow one
`order_id` through the whole flow, count `level=ERROR` and graph it — all with queries
instead of regexes over text.

> ⭐ The highest-leverage habit: **keep the message a fixed string and put the varying values in attributes.**
> `"order created"` is always the same string, so you can count how many times that event happened.
> `fmt.Sprintf("order %d created", id)` gives every ID its own message, and aggregation dies.

## Log levels — four is enough

Pick a level by asking **who reads it, and when**. Most teams run fine on these four.

| Level | Meaning | Reader |
| --- | --- | --- |
| `DEBUG` | Detail for following the flow during development | Whoever wrote it (off in production) |
| `INFO` | Milestones on the happy path (order accepted, job finished) | Whoever traces things afterward |
| `WARN` | Abnormal but processing continued (retried, value missing so default used) | Whoever skims periodically |
| `ERROR` | The operation failed. Someone has to act | Whoever gets paged |

When the boundary is unclear, ask **"would this wake someone up?"** If yes, `ERROR`; if
looking at it in the morning is fine, `WARN`. That judgment feeds directly into
[alert design](/en/posts/cloudwatch-alarms-and-alerting/).

> ⚠️ Spam `ERROR` and nobody reads it anymore (alert fatigue). "Retried and succeeded" is `WARN`;
> "input was invalid so we returned 400" is caused by the user, so `INFO` or `WARN` is usually plenty.

## log/slog in practice

Go's `log/slog` separates the handler (output format) from the logger (the call site).
Swap the default logger at startup and `slog.Info` works from anywhere.

```go
package main

import (
	"log/slog"
	"os"
)

func main() {
	h := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level:     slog.LevelInfo, // anything below this (DEBUG) is dropped
		AddSource: true,           // attach the emitting file:line
	})
	slog.SetDefault(slog.New(h))

	slog.Info("server started", "port", 8080)
}
```

During development, `slog.NewTextHandler` gives you the human-friendly
`level=INFO msg="server started" port=8080`. The point is that **only the format changes per
environment — the calling code doesn't**.

### Carry shared attributes with With

Values you want attached for the whole operation — a request ID, say — belong in a child
logger, not in every call.

```go
func handleOrder(ctx context.Context, reqID string, orderID int) error {
	log := slog.With("request_id", reqID) // every log below carries request_id

	log.InfoContext(ctx, "order processing started", "order_id", orderID)

	if err := charge(ctx, orderID); err != nil {
		log.ErrorContext(ctx, "charge failed", "order_id", orderID, "error", err)
		return fmt.Errorf("handleOrder: %w", err)
	}

	log.InfoContext(ctx, "order processing done", "order_id", orderID)
	return nil
}
```

Now one `request_id` lines up the whole trail of a request in time order. When you need to
follow it across services, put the trace ID from
[distributed tracing](/en/posts/distributed-tracing-otel/) on the same way.

> 🧭 Same role as `ILogger.BeginScope` in C# or Serilog's `LogContext.PushProperty`.
> The difference: slog's `With` makes you **pass the child logger around explicitly**, so its scope is visible in the code.

> 💡 Pass errors as an attribute, `"error", err`. Don't bake them into the sentence —
> handing over an err you've [wrapped with context](/en/posts/error-handling-wrapping/) preserves the most information.

## What not to log — secrets, duplication, volume

Logs **leave the process**. They get shipped to a collection platform where anyone with
permission can search them.

- **No secrets**: passwords, tokens, card numbers, [secrets](/en/posts/secrets-management/).
  "Just temporarily, for debugging" still persists — so don't
- **Minimize personal data**: scrutinize whether you need the email or name; if a user ID does the job, use that
- **Avoid dumping whole request bodies**: you don't control what's in them. Pick the fields you need
- **Don't log inside loops**: 1000 items becomes 1000 lines, wrecking volume, cost, and searchability at once. Aggregate and log the count in one line

To make sure a struct never leaks wholesale, implement `LogValue()` and **decide its logged shape on the type itself**.

```go
type User struct {
	ID    int
	Email string
}

// slog prints this return value instead (Email is dropped)
func (u User) LogValue() slog.Value {
	return slog.GroupValue(slog.Int("id", u.ID))
}
```

> ⚠️ Log retention costs both storage and transfer. "Emit everything and figure it out later"
> degrades cost and searchability simultaneously. You only want the detail during an incident, so run
> **INFO normally and turn DEBUG up only when you need it**.

## Fix the destination at standard output

The app shouldn't care about filenames or rotation — it just **writes one line at a time to standard output**.
Collecting and shipping is the runtime's job.

```text
app ──stdout──▶ container runtime ──▶ collection agent ──▶ log platform (search, retention)
```

Locally that streams to your terminal, in a container it shows up in `docker logs`, and in
production it lands in CloudWatch Logs — **the destination changes without touching a line of app code**.

> 💡 The `stdout` vs `stderr` split works as described in the [standard I/O post](/en/posts/stdin-stdout-stderr/).
> For structured logs handled as a single stream, sending every level to stdout is the mainstream choice today.

## Summary

- Logs are the primary source read after an incident. Shape them for **the reader** — humans and queries
- Use **structured logging**. Fixed message, varying values as attributes
- Choose levels by asking **"would this wake someone up?"** Spamming `ERROR` kills your alerting
- With `log/slog`, swap the handler at startup and carry shared attributes in a child logger via `With`
- Never log secrets, PII, or floods inside loops. `LogValue()` pins the logged shape onto the type
- Fix the destination at **standard output** and leave collection to the runtime

## Next steps

- Switch an app of yours to slog's JSON handler and put `request_id` on every line
- [Search those logs in Logs Insights](/en/posts/cloudwatch-logs/) and check that you can follow one request in time order
- Take an error rate off those logs, [turn it into a metric](/en/posts/what-to-measure-metrics/), and wire it to an alert
