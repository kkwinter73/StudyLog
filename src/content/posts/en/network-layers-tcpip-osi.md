---
title: "Communication Behind the Web ①: The Layered Model (TCP/IP and OSI)"
date: 2026-07-09T21:00:00
summary: "Networking gets dramatically easier once you can tell which layer a problem lives in. Map TCP/IP's four layers onto OSI's seven, and see where IP, ports, DNS, and HTTP each sit."
tags: ["ネットワーク", "基礎"]
level: beginner
lang: en
translationKey: network-layers-tcpip-osi
---

> 📚 Series "Communication Behind the Web" (1 / 10)

Networking trouble and jargon get far clearer the moment you can tell **which layer** something belongs to.
This installment maps **TCP/IP's four layers** onto **OSI's seven**, and places the IP, ports, DNS, and HTTP
you've already learned onto a single map. It's the shared foundation for the rest of the series.

## Why think in "layers"

Communication is a stack of jobs at wildly different levels of abstraction — from "push electricity down a cable"
to "exchange JSON." Treating that as one blob is unmanageable. So we **split it into layers by role, and let each
layer talk only to its neighbors.**

- Upper layers don't care about the **contents** of lower ones (HTTP needn't know whether IP runs over wire or Wi-Fi)
- Swapping one part rarely ripples elsewhere (switch to Wi-Fi and HTTP is untouched)

> 💡 Each layer focuses on its own job, assuming "the layer below will deliver it." This is exactly **separation of concerns**.

## The TCP/IP four-layer model

This is the model you use in practice. Bottom to top: your payload is wrapped by lower layers on the way out,
and unwrapped by upper layers on arrival.

| Layer | Role | Examples |
| --- | --- | --- |
| Application | The agreement between apps | HTTP, DNS, gRPC, TLS |
| Transport | Which app, and how reliably | TCP, UDP (port numbers) |
| Internet | Which machine | IP, routing |
| Network interface | The actual transmission | Ethernet, Wi-Fi |

Slotting in the earlier articles turns it into a map:

- [IP Addresses and CIDR](/en/posts/ip-address-and-cidr/) → **Internet layer** (which machine)
- [Ports and TCP](/en/posts/ports-and-tcp/) → **Transport layer** (which app, and reliability)
- [DNS](/en/posts/dns-basics-and-tools/) → **Application layer** (resolving name → IP)
- [HTTP status codes](/en/posts/http-status-codes/) → **Application layer** (the Web exchange)

## Encapsulation — data going down and up

On send, each layer **adds a header and wraps** the data on its way down; on receive, each layer **strips** it back off on the way up.

```text
[HTTP data]                         ← Application layer
[TCP header|HTTP data]              ← Transport layer (adds port numbers)
[IP header|TCP|HTTP data]           ← Internet layer (adds IP addresses)
[Ethernet|IP|TCP|HTTP data]         ← Interface layer (adds MAC addresses)
```

- Each header carries a "destination" for its layer (IP layer = IP address, transport = port)
- The receiver unwraps in reverse order, and finally the app gets the HTTP data

> ⚠️ When "the server won't connect," the layer to suspect first shifts. A name-resolution failure is the app layer (DNS),
> `Connection refused` is the transport layer (the peer is there but isn't listening on that port),
> and `No route to host` is a sign of the internet layer (it never even reached).

## The OSI seven-layer model — a common vocabulary

OSI is a seven-layer model for teaching and discussion. Implementations follow TCP/IP, but the **vocabulary** is
often spoken in OSI terms ("L4 load balancer," "L7 switch," and so on).

| OSI | TCP/IP | Nickname |
| --- | --- | --- |
| 7 Application / 6 Presentation / 5 Session | Application | L7 |
| 4 Transport | Transport | L4 |
| 3 Network | Internet | L3 |
| 2 Data link / 1 Physical | Interface | L1–L2 |

> 🧭 An "L4 load balancer" distributes by port (never inspecting contents); an "L7 load balancer" distributes by
> looking at the HTTP path or headers. That **L4/L7 phrasing comes straight from OSI's layer numbers**,
> and returns in the [web server / proxy / LB article](/en/posts/web-server-proxy-lb-cdn/).

## Summary

- Communication is a stack of jobs at different abstraction levels. **Splitting into layers that talk only to neighbors** makes it tractable
- In practice it's the **TCP/IP four layers** (application / transport / internet / interface)
- IP = internet layer, ports/TCP = transport layer, DNS/HTTP = app layer — all placeable on the map
- Sending **adds a header and wraps** at each layer; receiving **strips** in reverse (encapsulation)
- The **OSI seven layers** are the shared vocabulary; "L4/L7" originates here

**→ Next:** [② TCP vs UDP](/en/posts/tcp-vs-udp/)
