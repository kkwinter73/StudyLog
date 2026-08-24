---
title: "Intro to Value Objects — Replacing string and int with Types That Mean Something"
date: 2026-08-24T10:00:00
summary: "Hold an amount as an int and currency handling plus validation become the caller's problem. What a value object is, how to build one in Go (immutable, self-validating, comparable with ==), and where to stop."
tags: ["アーキテクチャ", "設計", "Go"]
level: beginner
lang: en
translationKey: value-object
---

`amount int64`, `email string`, `userID string` — they work, but **nothing guarantees the value
is valid**. A value object turns a meaningful value into a type, sealing validation and behavior
inside the value itself. This post covers what a value object is, how to implement one in Go
(immutability, self-validation, comparison), and where to stop building them.

Of the two kinds of resident in the domain layer of a
[four-layer architecture](/en/posts/four-layer-architecture/), this is about the **values**,
not the entities.

## What makes something a "value" — versus an entity

There's exactly one distinguishing question: **what determines identity?**

| | Entity | Value object |
| --- | --- | --- |
| Identity | Determined by an **ID** | Determined by **the values it holds** |
| Examples | User, order, product | Amount of money, email address, date range, address |
| Change | Attributes change, it's still the same thing | Change it and it's **a different thing** |
| Equality | `a.ID == b.ID` | All fields equal |

"Tanaka renamed themselves and is still the same Tanaka" — that's an entity. Meanwhile ¥1000
that becomes ¥1200 is **a different value**, not "the ¥1000, changed."

> ⭐ When unsure, ask **"do I want to assign it an ID?"** If yes, entity. If the value itself is
> the whole identity, value object.

> 🧭 The same idea as C#'s `record` / `readonly record struct` getting value equality for free. Go structs are value types with structural `==` from the start, so **you get record-like behavior by default**.

## The minimal shape in Go — validate in the constructor

Define a type, funnel construction through **one entry point**, and validate there. That alone
guarantees "no invalid value exists."

```go
package money

import (
	"errors"
	"fmt"
)

// Unexported fields — nobody outside can assemble one arbitrarily
type Money struct {
	amount   int64  // smallest unit (1 yen for JPY, cents for USD)
	currency string // "JPY", "USD"
}

func New(amount int64, currency string) (Money, error) {
	if amount < 0 {
		return Money{}, errors.New("money: amount must not be negative")
	}
	if currency != "JPY" && currency != "USD" {
		return Money{}, fmt.Errorf("money: unsupported currency %q", currency)
	}
	return Money{amount: amount, currency: currency}, nil
}

func (m Money) Amount() int64    { return m.amount }
func (m Money) Currency() string { return m.currency }
```

Now whoever receives a `Money` **doesn't have to validate it**. "Any `Money` that exists is
valid" is stated by the type.

> ⚠️ Even with unexported fields, **the zero value is still constructible** — `money.Money{}`
> compiles outside the package. You can't fully seal it, so decide whether the zero value is
> harmless ("0, no currency") or gets rejected at the point of use. This is a place where Go
> makes you compromise.

> 💡 Don't hold money in a `float64` — `0.1 + 0.2 != 0.3`. Use **an integer in the smallest
> unit**. That's true regardless of value objects, but sealing it in a type makes it impossible
> to get wrong.

## Immutability — return a new value instead of mutating

A value object **is not changed after construction**. Behavior isn't "rewrite myself" but
"**return the result as a new value**."

```go
func (m Money) Add(other Money) (Money, error) {
	if m.currency != other.currency {
		// The business rule lives in the type; callers can't forget the currency check
		return Money{}, fmt.Errorf("money: currency mismatch: %s vs %s", m.currency, other.currency)
	}
	return Money{amount: m.amount + other.amount, currency: m.currency}, nil
}
```

The key detail is a **value receiver** (`m Money`). With a pointer receiver you could write
`m.amount += ...`, and immutability is gone.

| What you're doing | How to write it |
| --- | --- |
| Reading or computing | Value receiver (`func (m Money) ...`) returning a new value |
| Changing state | **Don't.** Value objects get no setters |

The payoff of immutability is that **nothing you pass it to can rewrite it**. It can be a map
key, and it's safe to share across [goroutines](/en/posts/goroutine-channel-basics/).

## Equality — when == works

For Go structs, **if every field is comparable, `==` is structural equality** out of the box.

```go
a, _ := money.New(1000, "JPY")
b, _ := money.New(1000, "JPY")
fmt.Println(a == b) // true — all fields equal
```

Include a non-comparable type, though, and `==` is a compile error.

| Field contains | `==` |
| --- | --- |
| Numbers, strings, bools, arrays, comparable structs | Works |
| **Slices, maps, funcs** | Compile error |

When you do hold a slice (address lines, say), write your own `Equal`.

```go
type Address struct {
	lines []string // has a slice, so == is unavailable
}

func (a Address) Equal(other Address) bool {
	return slices.Equal(a.lines, other.lines)
}
```

> 💡 Put the other way round: **a value object that avoids slices pays off**. `==` just works,
> it can be a map key, and you never write comparison code.

## Crossing boundaries — DB and JSON

Unexported fields reach neither the database nor JSON as-is (outside packages can't see them).
Give the type the conversions its boundaries need.

```go
// For database/sql: reading (Scanner) mutates, so pointer receiver
func (m *Money) Scan(src any) error {
	v, ok := src.(int64)
	if !ok {
		return fmt.Errorf("money: cannot scan %T", src)
	}
	m.amount, m.currency = v, "JPY"
	return nil
}

// Writing (Valuer) takes a value receiver
func (m Money) Value() (driver.Value, error) { return m.amount, nil }
```

```go
// For JSON
func (m Money) MarshalJSON() ([]byte, error) {
	return json.Marshal(map[string]any{"amount": m.amount, "currency": m.currency})
}
```

> ⚠️ `UnmarshalJSON` and `Scan` are **entry points that bypass your validation**. The data comes
> from outside, so run the same checks here — calling `New` and assigning the result is the
> safest form.

> 🧭 This is the layer C# handles with `IEquatable<T>`, `TypeConverter`, or EF Core's `ValueConverter`. In Go you just implement the standard interfaces (`sql.Scanner`, `json.Marshaler`) on the type.

## Where to stop — where it pays and where it's overkill

Turn every `string` into a type and you get nothing but conversion code. **It pays when these
conditions line up:**

- **There are rules for validity** (email address, phone number, non-negative amount)
- **There's behavior** (add after matching currencies, check whether two ranges overlap)
- **Mixing them up causes incidents** (`userID` and `orderID` are both strings, and swapping
  them still compiles)

The third one is prevented by defining the type alone, so it pays off at nearly zero cost.

```go
type OrderID string
type UserID string

func Find(id OrderID) (*Order, error) { /* ... */ }
// Find(userID) is a compile error — caught by the type, not by a test
```

And the cases where you **shouldn't** bother:

| Case | Why |
| --- | --- |
| Values just passed through (descriptions, notes) | No rules, no behavior. `string` is fine |
| Handing an external API's response straight on | It's a shape from outside your boundary; a type adds only conversions |
| One field, no validation | You only added a name. Conversion cost beats the benefit |

> ⭐ The test is: **"can every caller be relied on to remember this validation?"** If not, make
> it a type. That's fair to treat as the only reason to introduce a value object.

## Summary

- A value object is one whose **identity is its value**. If identity comes from an ID, it's an entity
- Funnel construction through **one validating constructor**; after that, "it exists, so it's valid"
- Keep it **immutable** — value receivers returning new values, and no setters
- If all fields are comparable, `==` works as-is. Holding a slice means writing `Equal`
- DB and JSON entry points (`Scan` / `UnmarshalJSON`) **bypass validation** — run the same checks
- Build one when callers can't be trusted to validate. Don't type-wrap pass-through values

## Next steps

- Find a value in your code whose validation is duplicated in two or more places, and make that one a type
- Define ID types (`UserID` / `OrderID`) and confirm that swapping them is a compile error
- Put the new type in your [domain layer](/en/posts/four-layer-architecture/) and push DB conversion out to the boundary
