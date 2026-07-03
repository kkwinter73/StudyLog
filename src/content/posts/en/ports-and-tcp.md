---
title: "Using the Network Properly ②: Ports and TCP"
date: 2026-06-23T12:00:00
summary: "What does a port number actually point to, how do you check what's listening with ss -tlnp, and how does a connection begin with TCP's three-way handshake? Build the foundation for reading whether things connect or not."
tags: ["ネットワーク", "基礎"]
level: beginner
lang: en
translationKey: ports-and-tcp
---

> 📚 Series "Using the Network Properly" (2 / 5)

If an IP address is "which machine," then a **port number** is "which app on that machine."
Once you know how to check ports and understand the **three-way handshake** that starts a TCP connection, reading connection trouble gets a lot easier.

## What is a port number

A single machine runs many apps at once — Web, DB, SSH, and so on. The number that decides
**which app** gets the data that arrived via IP is the port. In `192.168.1.10:8080`, that's the `:8080`.

| Port | Use |
| --- | --- |
| 22 | SSH |
| 80 | HTTP |
| 443 | HTTPS |
| 5432 | PostgreSQL |

> 💡 IP = the building's street address, port = the room number. The pair `IP:port` uniquely determines "which app on which machine."

> 🧭 It's the same story whether .NET's Kestrel listens on `localhost:5000` or Go listens with `http.ListenAndServe(":8080", ...)`.
> The app declares "I'll listen on this port" and receives whatever traffic arrives there.

## Checking what's listening — ss -tlnp

Whether "the app is actually waiting on that port" can be checked with `ss` (the successor to the old `netstat`).

```bash
ss -tlnp
# -t TCP  -l listening (LISTEN) only  -n show numbers, no name resolution  -p also show process name
```

```text
State   Local Address:Port   Process
LISTEN  0.0.0.0:8080         users:(("myapp",pid=1234))
LISTEN  127.0.0.1:5432       users:(("postgres",pid=987))
```

> ⚠️ `0.0.0.0:8080` accepts on all interfaces (reachable from outside), while `127.0.0.1:5432` accepts
> **only from itself**. When "it connects locally but not from outside," this is the first thing to suspect.

## How TCP communication flows — the three-way handshake

Before communicating, TCP has both sides exchange a **three-round greeting** to establish the connection. This is the three-way handshake.

```text
Client              Server
    │ ── SYN ──────▶ │   "I want to connect"
    │ ◀── SYN+ACK ── │   "Sure, I'm ready too"
    │ ── ACK ──────▶ │   "Got it, let's start"
    └──── Established. On to sending/receiving data ────┘
```

- Only once this handshake succeeds does data start flowing. If the other side never responds midway, the connection never begins
- Whether it's "the peer is there but refuses" or "it can't reach the peer" changes where in the handshake the failure occurs
  (that difference feeds directly into [next time's troubleshooting](/en/posts/connection-troubleshooting/))

## Summary

- A **port number** points to "which app inside the machine." `IP:port` uniquely determines the destination
- Well-known ports like 22=SSH / 80=HTTP / 443=HTTPS are worth memorizing for speed
- Use **`ss -tlnp`** to check what's listening. Watch the difference between `0.0.0.0` (external OK) and `127.0.0.1` (self only)
- TCP establishes a connection with the **three-way handshake** (SYN→SYN+ACK→ACK) before letting data flow
- Where in the handshake it fails is what distinguishes the different kinds of connection trouble

**← Prev:** [① IP Addresses and CIDR](/en/posts/ip-address-and-cidr/)
**→ Next:** [③ How DNS Works and How to Investigate It](/en/posts/dns-basics-and-tools/)
