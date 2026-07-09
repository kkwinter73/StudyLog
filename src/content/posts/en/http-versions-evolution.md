---
title: "Communication Behind the Web ⑤: The Evolution of HTTP/1.1→2→3"
date: 2026-07-09T19:00:00
summary: "It's the same HTTP, but what was slow and what fixed it differs by version. Trace 1.1's queueing, 2's multiplexing, and why 3 moved to UDP — by what the bottleneck was each time."
tags: ["ネットワーク", "基礎"]
level: intermediate
lang: en
translationKey: http-versions-evolution
---

> 📚 Series "Communication Behind the Web" (5 / 10)

The contents of an [HTTP message](/en/posts/http-message-anatomy/) are almost the same across generations. What changed is
**how it's carried.** Tracing HTTP/1.1, 2, and 3 by "what the bottleneck was and how it was solved" makes labels like
`h2` and `HTTP/3` click. The [TCP vs UDP](/en/posts/tcp-vs-udp/) discussion pays off here.

## HTTP/1.1 — one lane, one car at a time

The long-dominant 1.1 handles **one request at a time, in order**, over a single TCP connection.
You can't send the next request until the previous response returns (so if the front stalls, everything behind it waits).

```text
Conn 1: [req A]──[res A]──[req B]──[res B]  if A is slow, B waits
```

- The workaround was for browsers to **open several connections** (e.g. 6 at once), but each connection pays a handshake cost
- Headers are sent whole, as text, every time — with lots of duplication like `Cookie`

> ⚠️ This "the front stalls and everything behind waits on one lane" problem is called **HTTP-level Head-of-Line blocking.** Solving it is the main goal of 2 and 3.

## HTTP/2 — multiplexing one lane

2 creates multiple virtual lanes called **streams** inside a single TCP connection, and flows requests through them **concurrently** (multiplexing).

| Technique | Effect |
| --- | --- |
| Multiplexing (streams) | Many requests in flight on one connection; no need to open a swarm of connections |
| Binary framing | A fixed format instead of text — fast, reliable parsing |
| Header compression (HPACK) | Compresses duplicate headers to cut transfer size |
| Server push* | Sends resources before they're requested (*later deprecated) |

This solved the HTTP-layer queueing. But because the **underlying TCP is still a single connection**, if one packet is
lost, every stream on that connection stalls waiting for TCP's retransmit — the problem merely **moved to TCP-layer Head-of-Line blocking.**

> 💡 If the dev tools show protocol `h2`, that's HTTP/2. Most sites enable it alongside HTTPS.

## HTTP/3 — swapping the foundation to UDP

3 solved the remaining TCP-layer stall by **changing the whole transport.** It drops TCP and puts a new protocol,
**QUIC**, on top of [UDP](/en/posts/tcp-vs-udp/).

- QUIC holds ordering, retransmission, and congestion control **per stream** → if one is lost, the others don't stall
- The two-step TCP+TLS handshake is **merged into one** → faster connection setup ([TLS is next time](/en/posts/https-tls-explained/))
- Connections are identified by a connection ID, not an IP → they survive Wi-Fi↔mobile switching better

> 🧭 Both .NET and Go: the standard `HttpClient`/`net/http` handle up to 2 automatically, while 3 is at the "enable via config" stage (environment-dependent).
> The joy of this evolution is that your app code stays basically the same while only the carriage underneath gets faster.

## Generations compared

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
| --- | --- | --- | --- |
| Foundation | TCP | TCP | UDP + QUIC |
| Multiplexing | No (multiple conns) | Yes (streams) | Yes (streams) |
| HoL blocking | At the HTTP layer | Remains at TCP layer | Largely solved |
| Headers | Text | HPACK compression | QPACK compression |

## Summary

- HTTP's generational shift is an evolution of **how it's carried (the transport)**, not the message contents
- **1.1**: one request at a time per connection → a stalled front blocks the rest (HoL blocking)
- **2**: **multiplexes** one connection + binary + header compression. But the stall moved to the TCP layer
- **3**: drops TCP for **UDP + QUIC**. Per-stream reliability removes the stall, and the handshake is merged
- Your app code is largely unchanged; only the lower layer gets faster

**← Prev:** [④ Anatomy of an HTTP Message](/en/posts/http-message-anatomy/)
**→ Next:** [⑥ How HTTPS/TLS Works](/en/posts/https-tls-explained/)
