---
title: "Playwright — Driving a Real Browser to Run E2E Tests"
date: 2026-07-15T18:00:00
summary: "Unit tests check functions; E2E tests check 'when a user operates through the browser, does the whole production-like system behave as expected'. Playwright is the go-to tool that automates a real browser to do this. Here's what makes it good (auto-waiting that kills flakiness, locators, auto-retrying assertions) and where it sits in the test pyramid."
tags: ["テスト", "QA"]
level: intermediate
lang: en
translationKey: playwright-e2e
---

Unit tests verify correctness one function at a time. But whether "log in, add an item to the cart, and check out" works —
i.e. whether **the whole system behaves as expected when a user operates the screen** — a function test can't tell you. That gap is filled by
**E2E (End-to-End) testing**, and **Playwright** is the go-to tool that does it by automating a real browser.

## What Playwright is — auto-driving a browser

Playwright is a browser automation framework from Microsoft. It drives real **Chromium / Firefox / WebKit**
from code, doing "open a page → click a button → type → check what's shown" in the human's place.

```ts
import { test, expect } from '@playwright/test';

test('log in and see the dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

- The target is the **whole production-like system, through the screen** (front + API + DB…). A backend you wrote in
  Go gets verified end-to-end as it's hit from the browser.
- The primary language is **TypeScript/JavaScript**. There are also official bindings for **Python, Java, and .NET (C#)**.

> 🧭 For C#/.NET, `Microsoft.Playwright` is officially provided and works straight from NUnit/xUnit.
> The concepts (locators, auto-waiting, assertions) are shared across languages, so everything below applies regardless of language.

## Auto-waiting — the core that kills flaky tests

The biggest cause of flaky E2E tests is **timing**: the button isn't rendered yet, the request hasn't finished.
People used to paper over this with fixed waits like `sleep(2s)` — too short on slow machines, wasted time on fast ones.

Before each action, Playwright **automatically waits until the element is actionable** (checks it's visible, enabled, not covered… before clicking).

```ts
// Don't write fixed waits. Playwright auto-waits for "is it clickable" before the click.
await page.getByRole('button', { name: 'Save' }).click();
```

> ⭐ "Don't write explicit `sleep`" is the Playwright way. Fixed waits are the root of flakiness, and
> auto-waiting structurally eliminates it. This is the biggest difference from the Selenium generation.

## Locators — grabbing elements by look and role

Element selection (**locators**) is recommended to be written by **user-visible attributes**, not brittle CSS/XPath.
It survives DOM structure changes and doubles as an accessibility check.

| Locator | Grabs by | Example |
| --- | --- | --- |
| `getByRole` | role + accessible name (most recommended) | `getByRole('button', { name: 'Submit' })` |
| `getByLabel` | form label | `getByLabel('Email')` |
| `getByText` | visible text | `getByText('Add to cart')` |
| `getByTestId` | an explicit marker attribute | `getByTestId('submit')` |

> 💡 When in doubt, prefer `getByRole`. Grabbing by "how the user perceives it" keeps tests from breaking on
> implementation churn (class-name changes, etc.). Add a `data-testid` only when you truly need a test-only marker.

## Web-first assertions — verification retries automatically too

Verification via `expect(...)` also **retries for a short window** until the condition holds (a Web-first assertion).
Elements that appear asynchronously later can be checked directly, no fixed wait.

```ts
// "A toast should appear" — auto-retries for a few hundred ms+ before judging
await expect(page.getByText('Saved')).toBeVisible();
await expect(page).toHaveURL(/\/dashboard/);   // waits for the navigation to finish too
```

> ⚠️ Only Playwright's `expect(locator)` family retries. If you resolve to a value first — like `expect(await locator.count())` —
> it judges on that instant's value, i.e. no retry, and you're back to flaky. Pass the locator as-is.

## Debug tooling, and where it sits in the pyramid

Playwright's tools for writing and fixing tests are strong.

- **codegen**: `npx playwright codegen <URL>` records your browser actions and generates test code. Use it as a starting draft.
- **Trace Viewer**: replays a failed run **on a timeline** (with DOM snapshots before/after each action, network, and console).
- **UI mode**: run and watch tests interactively while developing with `--ui`.

But E2E is **slow, flaky, and heavy to diagnose**. In test strategy it's the **top of the pyramid** —
keep the count small and guard only "the user experiences that truly matter (the critical paths)".

> 🧭 Do unit and integration thickly with Go's `go test` (→ [/posts/go-testing-basics/](/posts/go-testing-basics/)),
> and E2E thinly with Playwright. For the division of roles see [/posts/testing-strategy-pyramid/](/posts/testing-strategy-pyramid/).

## Summary

- **E2E testing** verifies "when a user operates the screen, does the whole system behave as expected". Playwright is the go-to.
- It drives real browsers (Chromium/Firefox/WebKit). Official languages: TS/JS, Python, Java, **.NET (C#)**.
- **Auto-waiting** banishes fixed `sleep` and structurally kills flakiness — the biggest strength.
- Write locators from the **user's viewpoint** (`getByRole` etc.). Assertions **auto-retry** too (pass the locator as-is).
- codegen / Trace Viewer make writing and fixing fast. But E2E is the **top of the pyramid** — keep it small, guard only critical paths.

### Next steps

- Write one Playwright test for the "if this breaks it's fatal" flow in your own app.
- Combine with [/posts/smoke-testing/](/posts/smoke-testing/) and run one or two E2E tests as a post-deploy sanity check.
