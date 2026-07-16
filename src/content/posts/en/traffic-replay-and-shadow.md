---
title: "Record/Replay and Shadowing — Verifying by 'Recording and Running' Production Traffic"
date: 2026-07-15T19:00:00
summary: "Hand-written synthetic tests can't cover the inputs real production sees. So use the real production requests themselves for verification: Record/Replay (record now, run later) and Shadowing (mirror live traffic into the shadows). Here are how the two techniques work, their uses — load testing, regression, bug reproduction, safe new-version checks — and the pitfalls of side effects, PII, and load."
tags: ["テスト", "運用"]
level: intermediate
lang: en
translationKey: traffic-replay-and-shadow
---

Hand-written tests can't cover the **edge inputs, stale data, and unexpected combinations** that flow through production.
So flip the approach: **use the real production requests themselves for verification** — that's Record/Replay and Shadowing.
Both let you hit new code with "real inputs you could never have synthesized". This article lays out how the two work and where to use them.

## Why use production traffic

Synthetic tests (hand-written cases) only cover what the author **could imagine**. But production always carries
inputs not in the spec, half-broken data, and rare timings. These are what break new code.

> ⭐ No test data beats "the inputs that are actually arriving". Record/Replay and Shadowing are the mechanisms for
> applying those real inputs to new code **without affecting users**. You earn test coverage from production traffic, not from human effort.

## Record/Replay — record now, run later

**Record the production requests** (and responses if needed), then **replay** the same requests against the target system later.

```text
① Record phase:  user ─▶ prod ─▶ response     …log/store the requests
② Replay phase:  stored requests ─▶ new version ─▶ response (compare with record, or observe behavior)
```

- Run it **offline, as many times as you want**. With the recording in hand you can test decoupled from production.
- Treat the recorded production responses as the "expected value" and you get **regression detection** (same answer as before?).
- A single recording can be saved as a **bug repro case** and reused directly as a regression test after the fix.

> 💡 The key to record/replay is "the recording becomes an asset". Real inputs recorded once are reusable for load testing,
> regression, and bug repro alike. Unlike synthetic tests, you don't have to think one up and write it each time.

## Shadowing — mirror live traffic into the shadows

**Duplicate production requests in real time** and send one copy to the new version too (traffic mirroring).
What's returned to the user is always the production response; **the new response is discarded (or just recorded for comparison)**.

```text
user ─▶ current ─▶ response (only this goes back to the user)
         └─(copy)─▶ new version ─▶ response (discard / record and observe)
```

- Test the new version at **production-equivalent load and freshness**. Unlike record/replay, you see it on traffic "arriving right now".
- Even if the new version is wrong, **zero user impact** (its response isn't returned). Safely flush out the new version in production.
- Load balancers, reverse proxies, and service meshes (Envoy, etc.) often have a mirror feature.

> 🧭 In .NET you can set up traffic mirroring with the reverse proxy **YARP**. To embed the comparison in code,
> the GitHub "Scientist" pattern (`Scientist.NET`) that runs old (control) and new (candidate) together is also a staple.

## Uses and when to pick which

Even within "using production traffic", each fits different goals.

| Use | Record/Replay | Shadowing |
| --- | --- | --- |
| Load testing (hit at production volume) | Replay recordings multiplied (can amplify) | Real traffic volume as-is |
| Regression (same answer as before?) | ◎ recorded response as expected value | △ compare running alongside current |
| Bug reproduction (reliably reproduce one case) | ◎ replay a single recording as-is | ✕ can't capture the past |
| Safe new-version check (flush out in prod) | △ freshness degrades | ◎ instantly, on current traffic |

> 💡 Roughly: **"the past, repeatedly" = Record/Replay, "the present, in shadow" = Shadowing**. As in new/old API diffing
> during migration, you often use both in stages (→ details in [API response diffing](/posts/api-response-diffing/)).

## Pitfalls — side effects, PII, load

Once you run real requests, **real side effects** come with them. Miss this and you cause an incident.

- **Stop side effects**: block writes, billing, notifications, and email sending at the replay/shadow target. Double billing / double sending is a production incident.
- **PII**: recordings carry tokens, card numbers, personal data. Decide on **masking / retention period** — leakage and legal angle.
- **Load and cost**: shadowing is a double run of current + new. All-traffic is heavy, so start with **sampling** (e.g. mirror just 1%).

> ⚠️ The biggest landmine is side effects. "I thought this path was read-only" but it wrote downstream — a classic.
> The rule: make the target a **side-effect-free stand-in** before you send traffic.

## Summary

- Synthetic tests can't cover production inputs. **Using real requests for verification** is Record/Replay and Shadowing.
- **Record/Replay** = record now, run later. Offline and repeatable; strong for regression, bug repro, and load amplification.
- **Shadowing** = mirror live traffic into the shadows. Production-equivalent freshness/load, flushing out the new version with zero user impact.
- Picking which: **"the past, repeatedly" = Replay / "the present, in shadow" = Shadow**. In migration, use both in stages.
- Pitfalls are **side effects, PII, and load**. Make it a side-effect-free stand-in, mask PII, and start with sampling.

**Related:** [API response diffing](/posts/api-response-diffing/) / [Migration Testing](/posts/migration-testing/) / [Smoke Testing](/posts/smoke-testing/) / [Test Strategy and the Pyramid](/posts/testing-strategy-pyramid/)
