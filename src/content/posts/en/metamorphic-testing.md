---
title: "Metamorphic Testing — Verifying Inputs With No Known Answer via 'Relations'"
date: 2026-07-15T15:00:00
summary: "Complex computation, search, machine learning — programs where you can't write the correct answer for an input are hard to test (the oracle problem). Metamorphic testing verifies not the correct answer for each output but the 'relation the outputs must satisfy when you change the input' (a metamorphic relation, MR). Here's the oracle problem, concrete MR examples, the source/follow-up flow, and the benefits and limits."
tags: ["テスト", "QA"]
level: intermediate
lang: en
translationKey: metamorphic-testing
---

Writing `assertEqual(expected, actual)` requires that you **know the expected value**. But many programs — complex computation, search, machine learning —
are ones where you **can't write the correct answer for an input**. That's where **metamorphic testing** comes in.
It checks correctness not by the right answer for each output, but by **the "relation" the outputs must satisfy when you change the input**.

## The test oracle problem — when you can't write the expected value

The mechanism that gives you a test's "expected value (the correct answer)" is called a **test oracle**. The situation where there's none / you can't build one
is the **oracle problem**. It's common in programs like these.

- Complex numerical computation and simulation (you can't compute the answer by hand)
- Search engines and recommendation (hard to define "the correct search result")
- Machine learning models (asked "what's the correct prediction for this input," there's no strict answer)
- Rendering and compilers (the output is huge; you can't check it one by one)

> ⭐ Without an oracle you can't write traditional "input → expected value" tests. But **even if you don't know "the answer itself,"
> you can know "if I change the input this way, the output should be like this"** — that's the opening.

## Metamorphic relations (MR) — the "relation the outputs must hold"

A **metamorphic relation (MR)** is a **relation between multiple inputs and outputs** that must hold for any correct program.
The point is you can verify it **without knowing the correct value**.

| Target | Example metamorphic relation (MR) |
| --- | --- |
| Trig `sin` | `sin(x)` equals `sin(π − x)` |
| Sum of a list | the sum doesn't change when reordered (permutation invariance) |
| Search engine | adding a condition doesn't increase results (count of "A" ≥ count of "A AND B") |
| Shortest path | adding one node doesn't shorten an existing shortest path |
| ML classifier | adding an irrelevant change doesn't flip the prediction (robustness) |

> 💡 You may not remember the exact value of `sin(1.2345)`, but you can say "it should equal `sin(π−1.2345)`."
> Testing in the form of "if this relation breaks, it's a bug" is the idea behind metamorphic testing.

## How to test — source and follow-up

The procedure is simple. Make one input (a **source case**) and an input transformed from it per the MR (a **follow-up case**),
and check whether both outputs **satisfy the MR**.

```go
// MR: sin(x) == sin(π − x) — a relation that must hold without knowing the correct value
func TestSin_Metamorphic(t *testing.T) {
    for _, x := range []float64{0.1, 0.7, 1.2, 2.5} {
        src := MySin(x)                 // source case
        follow := MySin(math.Pi - x)    // follow-up case (input transformed by the MR)
        if math.Abs(src-follow) > 1e-9 { // verify the relation between the outputs
            t.Errorf("MR violated: sin(%v)=%v but sin(π−%v)=%v", x, src, x, follow)
        }
    }
}
```

- The **source → follow-up input transformation** (`x` → `π − x`, list → reordered, adding a condition to a query…) is the heart of the MR
- What you verify isn't "matching the expected value" but "**the relation between the source and follow-up outputs**"
- Inputs can be generated randomly at scale. You run many cases **without preparing correct answers**

> 🧭 This is a cousin of **property-based testing (PBT)**. Where PBT checks "properties that hold for any input," MT focuses specifically on
> "**the output relation before and after transforming the input**." FsCheck in .NET, or rapid in Go, gives you a PBT scaffold to implement it.

## The benefits and what to watch

- **Benefits**: you can test with no oracle. It automates well with random inputs and pays off in "hard-to-test" areas (ML, numerical computation)
- **Watch ①, finding MRs is the crux**: finding good MRs takes **domain understanding**. That's where the real thinking goes
- **Watch ②, it's only a necessary condition**: MRs holding **isn't a proof of correctness**. E.g. a bug where `MySin` always returns 0
  satisfies `sin(x)=sin(π−x)=0` and **slips through**. **Combine** it with traditional tests to close the gaps

## Summary

- Metamorphic testing verifies inputs with no known answer via **the relation between outputs (MR)**. It's an answer to the **oracle problem**
- An MR is "a relation between inputs and outputs that must hold if correct": `sin(x)=sin(π−x)`, sum's permutation invariance, search monotonicity
- The flow is **source case → follow-up case transformed by the MR → verify the output relation**. Automatable with no answers prepared
- It pays off in hard-to-test areas like **ML, numerical computation, search**. It's a cousin of **property-based testing**
- Watch out: "**finding good MRs needs domain knowledge**" and "passing MRs is a **necessary condition, not a proof**." Combine with traditional tests

**Related:** [Test Strategy and the Pyramid](/posts/testing-strategy-pyramid/) / [Go Testing Basics](/posts/go-testing-basics/) / [Smoke Testing](/posts/smoke-testing/)
