---
title: "Communication Behind the Web ⑨: Web Server / Reverse Proxy / LB / CDN"
date: 2026-07-09T17:00:00
summary: "A request passes through several 'boxes' before it reaches your app. Separate by role what a web server, reverse proxy, load balancer, and CDN each take off the app's plate."
tags: ["ネットワーク", "基礎"]
level: intermediate
lang: en
translationKey: web-server-proxy-lb-cdn
---

> 📚 Series "Communication Behind the Web" (9 / 10)

The [request's journey](/en/posts/how-a-web-request-travels/) drew the browser wired straight to the app, but in production
**several boxes** line up in between. Web server, reverse proxy, load balancer, CDN — different names, but each is a relay that
"takes work off the app's plate up front." Separate them by role and they're not scary. The series finale.

## The big picture — the order a request passes through

```text
Browser
  │  (if nearby)
  ▼
CDN ──── returns static files here (cached at points of presence worldwide)
  │  (only dynamic stuff goes deeper)
  ▼
Load balancer ── terminates TLS + distributes across several nodes
  │
  ▼
Reverse proxy / Web server ── routing, static serving
  │
  ▼
App (C# / Go) ── only the actual business logic
```

The deeper you go, the more it narrows to "work only that app can do"; the closer to the front, the more it's "shared work for everyone."

## Web server and reverse proxy

- **Web server** (Nginx / Apache, etc.): receives HTTP; its core job is returning **static files** (HTML/CSS/images) directly
- **Reverse proxy**: an agent that **relays received requests to the app behind it** and returns the response to the client

The same software (Nginx, etc.) often does both. Dynamic processing goes to the app; static serving and TLS termination are handled up front.

> 💡 Whereas a "forward proxy" stands on the client side and proxies **outgoing** traffic,
> a reverse proxy stands on the server side and proxies **incoming** traffic. Opposite directions.

> 🧭 It's standard **not to expose** C#'s Kestrel or Go's `net/http` directly, but to put Nginx/ALB in front.
> The app deals only with trusted internal traffic while the front takes the brunt of TLS and attacks (this echoes [the auth-boundary article](/en/posts/auth-boundary-edge-vs-app/)).

## Load balancer — distributing across nodes

Because one node can't cope and its failure hurts, you run **several nodes** of the same app and put a **load balancer (LB)** in front.

- Spreads requests to free nodes (round-robin, etc.)
- **Health checks** automatically pull unhealthy nodes out → service continues even if one dies
- Often **terminates TLS** here and passes plaintext to the back ([⑥ TLS](/en/posts/https-tls-explained/))

The **L4/L7** from up through ⑧ pays off here ([① layered model](/en/posts/network-layers-tcpip-osi/)):

| Type | Layer it reads | Basis for distribution |
| --- | --- | --- |
| L4 LB | Transport layer | IP / port only (doesn't inspect contents; fast) |
| L7 LB | Application layer | HTTP path / headers (e.g. route `/api` to a different pool) |

> ⚠️ Once you spread across nodes, a design that keeps [⑦'s session](/en/posts/cookie-session-token/) in each node's memory breaks
> (the next request may land on a different node). So put sessions in a shared store, or use the token approach.

## CDN — caching close to the user

A **CDN** caches **static content** at points of presence (edges) placed worldwide and serves from the one nearest the user.

- Physically near = fast. It also **absorbs heavy traffic at the edge**, lowering load on the origin (your own servers)
- Whether and how long to cache is controlled by the `Cache-Control`/`ETag` [touched on in ④](/en/posts/http-message-anatomy/)
- Dynamic responses and per-user data aren't cached and pass through to the app behind

> 💡 "Static at the front (CDN/web server), dynamic at the back (app)." This division is the basic shape of speed and scale.

## Summary

- A request passes **CDN → LB → proxy/web server → app**, each front-most box taking on shared work
- **Web server / reverse proxy**: static serving, TLS termination, relaying to the app behind. Don't expose the app directly
- **Load balancer**: distributes across nodes + health checks for availability. **L4 is speed / L7 is smarts**
- **CDN**: caches static content at edges near users, improving speed and origin load
- In a distributed setup, **don't keep sessions in each node's memory** (use a shared store / tokens)

With that, the "boxes a request passes through" are all in place. The finale covers bidirectional and push communication that goes beyond HTTP's one-way model.

**← Prev:** [⑧ CORS (Cross-Origin Requests)](/en/posts/cors-explained/)
**→ Next:** [⑩ WebSocket / SSE](/en/posts/websocket-and-sse/)
