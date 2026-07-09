---
title: "Communication Behind the Web ②: TCP vs UDP"
date: 2026-07-09T20:30:00
summary: "Both live in the transport layer, but TCP is 'reliable and in order' while UDP is 'fast but fire-and-forget.' Contrast what each guarantees and gives up, and get a feel for which to choose."
tags: ["ネットワーク", "基礎"]
level: beginner
lang: en
translationKey: tcp-vs-udp
---

> 📚 Series "Communication Behind the Web" (2 / 10)

The transport layer has two headline protocols. **TCP** is "reliable and in order," **UDP** is
"fast but fire-and-forget." Contrasting what each guarantees and gives up makes it click why
"HTTP uses TCP while video and DNS use UDP." This continues from the [layered model](/en/posts/network-layers-tcpip-osi/).

## TCP — the protocol that chooses reliability

TCP first establishes a connection with the [three-way handshake](/en/posts/ports-and-tcp/), then provides **reliability** on top.

- **Ordering**: reassembles arriving data into the order it was sent
- **Retransmission**: detects missing packets and resends them (confirmed by the peer's ACK)
- **Flow / congestion control**: adjusts send rate so the peer or link isn't overwhelmed

```text
Send              Receive
 seq=1 ──────────▶ ACK=1   arrived
 seq=2 ────╳       (loss)  didn't arrive
 seq=2 ──────────▶ ACK=2   recovered by retransmit
```

> 💡 TCP promises the app that "everything arrives, in the right order." The price is the **latency and overhead** of handshakes, ACKs, and retransmits.

## UDP — the protocol that chooses speed

UDP does no handshake; it just **throws** packets. It guarantees neither order nor delivery, but it's light and fast.

- No connection setup → it can send from the very first round trip
- No ordering or retransmit → what's lost stays lost (the app handles it if needed)
- Small header; broadcast/multicast possible

It suits "I'd rather have it now than have it arrive late, even if some is lost": audio, video, games, DNS queries, and so on.

> ⚠️ UDP is "fast" but doesn't come with reliability "for free." If you need reliability, the app has to build it itself.

## Comparison

| Aspect | TCP | UDP |
| --- | --- | --- |
| Connection | Established up front (handshake) | None |
| Ordering | Yes | No |
| Retransmit (reliability) | Yes | No |
| Speed / overhead | Slower, heavier | Fast, light |
| Typical use | HTTP, SSH, DB, mail | Video/audio, games, DNS |

> 🧭 In C#, `TcpClient`/`TcpListener` and `UdpClient` are separate classes precisely because this difference in nature
> shows up right in the API. In Go too, you just pick `net.Dial("tcp", ...)` vs `net.Dial("udp", ...)` and the underlying behavior changes wholesale.

## Which to choose — and how that boundary moved

The rule of thumb: **data you can't afford to corrupt → TCP; data where "now" is everything → UDP.** Web bodies and APIs are TCP, no debate.

But recently the boundary has moved. As later installments cover, **HTTP/3 puts QUIC on top of UDP**,
adding "TCP-grade reliability" back on itself over "UDP's speed." So *TCP or UDP* isn't fixed —
it's a design choice about **which layer supplies the missing guarantees.**

> 💡 "UDP has no reliability" is true, but "choosing UDP means giving up reliability" is false. You can add it higher up (see the [HTTP evolution article](/en/posts/http-versions-evolution/)).

## Summary

- TCP provides reliability via **ordering, retransmission, and congestion control** (with a handshake first). The cost is latency and weight
- UDP is **fire-and-forget**. It guarantees neither order nor delivery, but it's light and fast
- Rule of thumb: "can't afford corruption → TCP," "now is everything → UDP." HTTP/SSH/DB are TCP; video/DNS are UDP
- Reliability **can be added at a higher layer**. HTTP/3 does exactly this with UDP + QUIC

**← Prev:** [① The Layered Model](/en/posts/network-layers-tcpip-osi/)
**→ Next:** [③ How a Web Request Travels](/en/posts/how-a-web-request-travels/)
