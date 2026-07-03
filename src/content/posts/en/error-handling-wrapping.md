---
title: "Errors Are Values — Wrapping and errors.Is / As"
date: 2026-06-19
summary: "In Go, errors aren't exceptions but values. Here's how to add context with fmt.Errorf's %w while using errors.Is / errors.As to uncover what an error really is."
tags: ["エラーハンドリング", "標準ライブラリ"]
level: intermediate
lang: en
translationKey: error-handling-wrapping
---

Go has no exceptions. Functions **return errors as values**, and the caller handles them with `if err != nil`.
It looks verbose, but the strength is that "where and what went wrong" stays right there in the call flow.

## The basic shape

```go
f, err := os.Open("config.yaml")
if err != nil {
	return fmt.Errorf("cannot open config file: %w", err)
}
defer f.Close()
```

`%w` **wraps the original error** and adds context.
`%v` just turns it into a string, but `%w` keeps a reference to the original error, so you can trace what it really is later.

## errors.Is — "Is this *that* error?"

Checks for a match against a sentinel error (a fixed value like `io.EOF`), seeing through the layers of wrapping.

```go
data, err := readAll(r)
if errors.Is(err, io.EOF) {
	// finds EOF no matter how many times it's been wrapped
	return nil
}
```

## errors.As — "Extract the contents by type"

When you want to use the fields of a custom error type, use `errors.As`.

```go
type NotFoundError struct{ Key string }

func (e *NotFoundError) Error() string {
	return fmt.Sprintf("%q not found", e.Key)
}

var nf *NotFoundError
if errors.As(err, &nf) {
	log.Printf("missing key = %s", nf.Key) // access the contents with a typed value
}
```

| What you want to do | What to use |
| --- | --- |
| Check for a match with a specific value | `errors.Is(err, target)` |
| Extract it as a specific type | `errors.As(err, &target)` |
| Add context and return it upward | `fmt.Errorf("...: %w", err)` |

## When to wrap, and when not to

- **Wrap**: when the caller would benefit from knowing "which operation failed"
- **Don't wrap**: when you don't want to leak internal implementation details (return a new error instead of using `%w`)

> 🧭 When in doubt, wrap. You can always peel it back later with `errors.Is/As`. Throwing information away is something you can do anytime.

## Summary

- Errors are values. Branch on them plainly with `if err != nil`
- Wrap with `%w` to stack up context
- Use `errors.Is` to match a value, `errors.As` to extract a type
- Decide whether to wrap based on "does this help the caller?"
