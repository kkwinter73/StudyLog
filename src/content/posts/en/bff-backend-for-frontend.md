---
title: "BFF (Backend for Frontend) — A Dedicated Backend Per Screen"
date: 2026-07-14T13:00:00
summary: "Serve both web and mobile from one general-purpose API and it strains — over-fetching, chatty calls. So you place a dedicated backend (BFF) per client type and let it aggregate downstream services and shape responses for the screen. Here's what it solves, where it sits, its benefits and trade-offs, and how it differs from GraphQL."
tags: ["アーキテクチャ", "設計"]
level: intermediate
lang: en
translationKey: bff-backend-for-frontend
---

**BFF (Backend for Frontend)** is a pattern that places a **dedicated backend per client type**.
You keep one BFF per frontend — a web one, a mobile one — and let it **aggregate** downstream services and **shape** responses for the screen.
This post is for grasping what a BFF solves, where it sits, and what it costs.

## What it solves — the strain of one general-purpose API

Trying to serve multiple clients (web, iOS, Android) from **a single general-purpose API** strains.

- **Over-fetch**: fields even mobile doesn't need come back. Heavy to transfer and render
- **Under-fetch**: one screen hits the API many times (chatty). Slow on a mobile connection
- **Leaking concerns**: client-specific needs like "change the display for this one screen" leak into the shared API or the frontend, bloating them

> ⭐ A general-purpose API tends to become "the greatest common divisor of all clients" — optimal for none.
> A BFF flips the idea: prepare a **"just right" backend per screen (per client)**.

## Where it sits — between the client and downstream services

A BFF stands **between** the client and the downstream services that hold the actual business logic.

```text
Web       ─▶ Web BFF     ─┐
iOS       ─▶ iOS BFF     ─┼─▶ auth / orders / inventory / … (the downstream microservices)
Android   ─▶ Android BFF ─┘
```

- **Aggregates** calls to multiple downstream services and returns the data a screen needs **in one response**
- **Shapes** the response into **just the right form for that screen** (drop unneeded fields, rename)
- Pulls client-specific concerns (auth, session, display logic) **into the BFF** so downstream stays clean

> 🧭 It's close to what .NET calls an API gateway / aggregation layer, but the point is to **split it "per client type."**
> Unlike one gateway shared by all clients, a BFF is **kept separate** — a web one, a mobile one. That's its essence.

## Benefits — you can optimize per screen

- **Just-right responses**: return only the data each screen needs, in the form it needs. Over- and under-fetch vanish
- **Fewer round trips**: aggregation happens server-side (near downstream), so the client's back-and-forth drops
- **Absorbs downstream change**: the BFF absorbs downstream service rework and shields the client (a change buffer)
- **Client-specific auth can live in the BFF**: e.g. don't put an SPA's token in the browser — hold it in a
  Cookie session on the BFF side ([cookie/session](/posts/cookie-session-token/)). A standard setup that shrinks the exposure surface

## Trade-offs — more to run, and bloat

A BFF isn't free. See the costs before adopting it.

- **More of them**: you build, deploy, and operate one BFF per client. Overkill at small scale
- **Duplication**: similar code tends to duplicate across BFFs. Over-share it and you're back to the general-purpose API's strain
- **Bloat risk**: being convenient, business logic piles into the BFF and its responsibility vs downstream blurs. Keep the BFF to **shaping and aggregation**
- **Ownership**: generally **the team building that frontend** owns its BFF. If ownership is unclear, it gets neglected

> 💡 If "there's only one client type" or "the API is simple," a BFF is overkill. Start with a general-purpose API and
> split once per-client needs start to collide — that's pragmatic. **GraphQL** (the client queries the exact shape it needs)
> is another way to solve over/under-fetch, and can be an alternative to a BFF.

## Summary

- A BFF places a **dedicated backend per client type** — a web one, a mobile one
- It solves the strain of one general-purpose API: **over-fetch, under-fetch (chatty), and leaking client-specific concerns**
- The BFF's job is downstream **aggregation** and screen-facing **shaping**, plus **pulling in** things like client-specific auth
- Benefits: "just-right responses, fewer round trips, absorbing downstream change." Holding an SPA's token in the BFF is a standard setup
- Costs: **more services, duplication, bloat, ownership**. Overkill at small scale or one client type — and GraphQL can be an alternative

**Related:** [Comparing Three Architecture Patterns](/posts/architecture-patterns-compared/) / [Web Server, Proxy, LB, CDN](/posts/web-server-proxy-lb-cdn/) / [Cookie, Session, Token](/posts/cookie-session-token/) / [Boundary Authentication](/posts/auth-boundary-edge-vs-app/)
