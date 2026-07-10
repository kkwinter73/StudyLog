---
title: "The Four Layers — Domain / Application / Presentation / Infrastructure"
date: 2026-07-09T23:45:00
summary: "The four layers you keep seeing in layered/DDD architecture. Nail down what each one holds and doesn't hold in a sentence, then sort out the easiest thing to get wrong: the direction of dependencies (naive stacking vs. the inverted version)."
tags: ["アーキテクチャ", "設計"]
level: intermediate
lang: en
translationKey: four-layer-architecture
---

Splitting an app into layers decides "where does what go," so you stop hesitating. Let's take the four
layers you keep seeing — **domain / application / presentation / infrastructure** — through each one's role,
and finish with the thing people get wrong most: the **direction of dependencies**. For the underlying idea,
see [why you need architecture (DIP)](/en/posts/why-architecture-and-dip/).

## The four layers at a glance

First get the "responsibility" and "what goes in / stays out" in one table.

| Layer | Responsibility (in a word) | Holds | Doesn't hold |
| --- | --- | --- | --- |
| Presentation | I/O with the outside | HTTP handlers, request/response conversion | Business rules |
| Application | Coordinating use cases | Flow of an operation, transaction boundary | Business rule internals, SQL |
| Domain | The core of business rules | Entities, value objects, decisions | DB, HTTP, frameworks |
| Infrastructure | Technical details | DB access, external APIs, sending mail | Business decisions |

> ⭐ When unsure, split by "is this **business** or **technology**?" Business goes to domain, technology to infrastructure.

## Domain layer — the core of business rules

The **business itself** that the system expresses. Rules like "compute the order total" or "decide whether
stock is sufficient," along with the **entities** and **value objects** that hold them, live here.

```go
// Business rules live inside the domain. It knows nothing of DB or HTTP.
type Order struct {
    Items []Item
}

func (o Order) Total() Money {  // "how to compute the total" is a business rule
    var sum Money
    for _, it := range o.Items {
        sum = sum.Add(it.Price.Mul(it.Qty))
    }
    return sum
}
```

> 🧭 Same in C#. Ideally you **don't put EF Core attributes or `[JsonProperty]`** on domain types —
> persistence and serialization concerns shouldn't leak into the domain.

## Application layer — the coordinator of use cases

The layer that realizes **one use case**, like "confirm an order." It calls the domain to build the flow
and draws the **transaction boundary**. It **holds no business rules itself** — it just arranges the steps in order.

```go
func (uc *OrderUseCase) Confirm(ctx context.Context, id OrderID) error {
    order, err := uc.repo.Find(ctx, id)   // leave fetching to infrastructure (below)
    if err != nil { return err }
    if !order.CanConfirm() {              // delegate the decision to the domain
        return ErrNotConfirmable
    }
    return uc.repo.Save(ctx, order)       // saving goes to infrastructure too
}
```

> 💡 It's a coordinator, so if it gets thick (full of ifs), that's a sign decisions are leaking out of the domain.
> Pull the rules back into the domain.

## Presentation layer — I/O with the outside

The **contact point** with users or clients. It receives an HTTP request, parses it, does format checks and
auth, calls the application layer, and formats the result into JSON or the like. **UI/API concerns are absorbed here.**

```go
func (h *Handler) Confirm(w http.ResponseWriter, r *http.Request) {
    id := OrderID(r.PathValue("id"))          // pull out the input
    if err := h.uc.Confirm(r.Context(), id); err != nil {
        http.Error(w, err.Error(), 400)       // convert to output shape
        return
    }
    w.WriteHeader(http.StatusNoContent)
}
```

## Infrastructure layer — the technical details

The **technical implementation**: DB access, external APIs, messaging, sending mail. It's the side that
**implements the interfaces** defined by upper layers, and holds no business decisions.

```go
// The repo interface is defined by the upper layer (app/domain); the implementation lives here.
type PostgresOrderRepo struct{ db *sql.DB }

func (r *PostgresOrderRepo) Find(ctx context.Context, id OrderID) (*Order, error) {
    // details like SQL are sealed inside this layer
}
```

## The direction of dependencies — the easiest thing to get wrong

Even split into layers, it's **meaningless unless the arrows point the right way**. There are two styles.

| Style | Direction | The domain's position |
| --- | --- | --- |
| Naive layered | top→down (presentation→app→domain→infra) | ends up depending on infrastructure |
| DDD/Clean/Onion | outside→in (even infra depends inward) | the **center** that depends on nothing |

With naive stacking, the domain depends on the DB (infrastructure), so "swapping the DB breaks the domain."
So you use [dependency inversion (DIP)](/en/posts/why-architecture-and-dip/): **put the repository interface
on the app/domain side and the implementation in infrastructure**. Now the arrows all point inward and the domain stands alone.

> ⚠️ "Split into layers" ≠ "Clean." Only by **placing interfaces inward and inverting the dependency** is
> the domain protected from technology. Details in [concentric circles and the dependency rule](/en/posts/clean-architecture-concepts/).

## Summary

- The four layers split by responsibility: **presentation (I/O) / application (coordination) / domain (business rules) / infrastructure (technology)**
- When unsure, ask "**business or technology?**" Business to domain, technology to infrastructure
- The application layer **only builds the flow**. When decisions pile up, pull them back to the domain
- The most important thing is the **direction of dependencies**. Naive top→down makes the domain depend on infrastructure
- Use [DIP](/en/posts/why-architecture-and-dip/) to place interfaces inward and invert dependencies to point inward
- For the actual Go implementation, see [implementing Clean Architecture in Go](/en/posts/clean-architecture-in-go/)
