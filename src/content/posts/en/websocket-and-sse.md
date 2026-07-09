---
title: "Communication Behind the Web ⑩: WebSocket / SSE"
date: 2026-07-09T16:30:00
summary: "When you want the server to 'push right now,' request-per-answer HTTP isn't enough. Weigh the limits of polling against bidirectional WebSocket and server→client one-way SSE, choosing by the direction you need."
tags: ["ネットワーク", "基礎"]
level: intermediate
lang: en
translationKey: websocket-and-sse
---

> 📚 Series "Communication Behind the Web" (10 / 10, final)

HTTP so far has been one-way: "the client asks, the server answers." But when you want to deliver a **server-side change right now** —
chat, notifications, stock prices, progress bars — that isn't enough. This installment picks between the two solutions by the direction you need:
**WebSocket** (bidirectional) and **SSE** (server→client, one way). The series finale.

## Why plain HTTP isn't enough

The [HTTP message from ④](/en/posts/http-message-anatomy/) is complete as "one request = one response."
The server **can't speak unless asked.** A client wanting to know about new data has no choice but to ask repeatedly (polling).

```text
Client               Server
  │ ─ anything new? ─▶ │  no
  │ ─ anything new? ─▶ │  no         ← a run of wasted shots
  │ ─ anything new? ─▶ │  one now!   ← and it noticed late
```

- **Short polling**: ask at fixed intervals. Long intervals mean latency; short ones mean more wasted requests
- **Long polling**: the server holds the response until there's a change — pseudo-push. Better, but needs to re-open the connection

> ⚠️ Polling can't escape the trade-off: "the tighter the interval, the closer to real time, but the more empty requests hit the server."

## SSE — server→client one-way push

**SSE (Server-Sent Events)** keeps one HTTP connection open and lets the server **keep streaming events whenever it likes.**
It suits "server-originated one-way" flows: notifications, progress, feeds.

```text
Client               Server
  │ ─ GET /events ──▶ │  keeps the connection open
  │ ◀── event: ping   │  on every update
  │ ◀── event: news   │  streams from the server (the client only receives)
```

- It's just HTTP inside (`Content-Type: text/event-stream`). **No special protocol**, so it's lightweight to adopt
- **Automatic reconnection** on disconnect and resume-by-event-ID are built into the spec
- It's strictly **one-way**. To send from the client, use a normal HTTP request separately

## WebSocket — a persistent bidirectional connection

**WebSocket** starts over HTTP, then **upgrades** midway to a dedicated protocol, holding a persistent connection where
**both sides can send messages.** It's for cases that need "both directions": chat, collaborative editing, games.

```http
# Starts as HTTP, then switches protocol midway
GET /ws HTTP/1.1
Upgrade: websocket
Connection: Upgrade

HTTP/1.1 101 Switching Protocols   ← from here on, into the ws:// world
```

- Once established, **either** the client or the server can send at any time
- The HTTP header round trips disappear, an advantage in real-time responsiveness and overhead
- The URL scheme is `ws://` / `wss://` (`wss` adds TLS — the same relationship as [⑥](/en/posts/https-tls-explained/))

> 💡 `101 Switching Protocols` is a rare [HTTP status](/en/posts/http-status-codes/) that declares "we stop being HTTP from here." WebSocket uses this one HTTP exchange as a springboard.

## Which to choose

Choose by "the direction you need." Don't reach for WebSocket excessively.

| Use | Direction | Fit |
| --- | --- | --- |
| Occasional update check | client→server | Polling is enough |
| Notifications, progress, price feed | server→client, one way | **SSE** |
| Chat, collaborative editing, games | Bidirectional | **WebSocket** |

> 🧭 In C#, **SignalR** abstracts WebSocket and auto-falls back where it's unsupported. In Go, `gorilla/websocket`,
> or hand-writing SSE over the standard `net/http`, is the norm. Asking "**would SSE suffice first?**" keeps the setup lighter.

> ⚠️ Both **hold the connection open**, so the [⑨ LB](/en/posts/web-server-proxy-lb-cdn/) and proxies need
> extended timeouts, stickiness, and connection-count planning. Note that "always connected" consumes server resources.

## Summary

- Plain HTTP is **client-initiated one-way**. Server-initiated instant notification drags along polling waste
- **SSE** = a single open HTTP connection, **server→client one-way** push. Lightweight, auto-reconnect; good for notifications/progress
- **WebSocket** = a **bidirectional** persistent connection upgraded via `101`. Good for chat/collab/games
- Choose by "**the direction you need.**" One-way → SSE; both directions → WebSocket
- Persistent connections need care around LB/proxy timeouts and resource use

That completes the series. Back at [①'s map](/en/posts/network-layers-tcpip-osi/), you can see at a glance which layer each installment was about.

**← Prev:** [⑨ Web Server / Reverse Proxy / LB / CDN](/en/posts/web-server-proxy-lb-cdn/)
**↩ To the start:** [① The Layered Model](/en/posts/network-layers-tcpip-osi/)
