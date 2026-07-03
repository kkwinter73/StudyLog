---
title: "Using the Network Properly ④ Diagnosing Connection Problems"
date: 2026-06-23T10:00:00
summary: "connection refused and connection timed out have completely different causes. The former means 'reached but rejected', the latter 'never reached'. Bringing firewalls/SGs into the picture, this lays out where to look, in order, when things won't connect."
tags: ["ネットワーク", "基礎", "運用"]
level: beginner
lang: en
translationKey: connection-troubleshooting
---

> 📚 Series "Using the Network Properly" (4 / 5)

The grand finale of the series. "It won't connect" can mean many things. The key is the **difference between refused and timed out**. Pulling together everything so far — IP, ports, [TCP](/en/posts/ports-and-tcp/), and [DNS](/en/posts/dns-basics-and-tools/) — we build an order for diagnosis.

## refused vs. timed out — what's the difference

These two errors have **opposite causes**. Mix them up and your investigation gets lost.

| | connection refused | connection timed out |
| --- | --- | --- |
| What's happening | **Reached** the other side but was rejected | **Doesn't reach** the other side / no reply comes back |
| TCP handshake | Server immediately returns a reject (RST) | No reply to the [SYN](/en/posts/ports-and-tcp/); keeps waiting |
| Typical cause | App isn't running / isn't listening on that port | Blocked by firewall/SG, wrong IP, no route |
| How it feels | Error comes back **instantly** | Error after **waiting seconds to tens of seconds** |

> 💡 Remember it as **"instant reject = refused, kept waiting = timed out"**. When an answer comes back instantly, it means you reached the other side. Being kept waiting is a sign the handshake signal itself is being dropped along the way (= there's a wall in between).

## The order of diagnosis

When things won't connect, working down from upstream is fastest.

```text
1. Does the name resolve?  → dig name +short        (wrong IP / can't resolve = DNS problem)
2. Does it reach the host? → ping host-IP           (no response = suspect route/FW)
3. Is the port open?       → curl -v / nc -vz IP port (see whether it's refused or timeout)
4. Is the server listening?→ ss -tlnp (on the server) (is it listening on 0.0.0.0?)
```

- If you get **refused** → go to the server side. Is the app running and [listening](/en/posts/ports-and-tcp/) on that port? `ss -tlnp`
- If you get **timed out** → suspect a wall in between. On to firewalls/SGs next.

## Firewalls / Security Groups

This is the most frequent cause of `timed out`. Because **traffic gets silently dropped at the wall**, you don't even get a rejection — you're just left waiting.

- A firewall is a set of rules for "which IPs/ports are allowed through." Traffic that isn't allowed is discarded.
- AWS **security groups (SGs)** are a virtual firewall in front of the instance. You write them with a [CIDR](/en/posts/ip-address-and-cidr/) plus a port, like "allow 443 from [`0.0.0.0/0`](/en/posts/ip-address-and-cidr/)."

> ⚠️ The classic "works locally but times out in production (EC2)" is usually **the SG not having that port open**. Checking the SG's inbound rules before the app or the network route is faster.

> 🧭 SGs use a "let through only what's allowed (whitelist)" model. By default everything is closed, and only what you explicitly open gets through. With this model, the golden rule is to first suspect "can't connect = maybe I just never opened it?"

## Summary

- **refused = reached but rejected (instant error) / timed out = doesn't reach (kept waiting)**. Opposite causes.
- Diagnose from upstream down: **DNS (dig) → reachability (ping) → port (curl/nc) → listening (ss)**.
- For refused, suspect the server side (app running, listening port); for timed out, suspect a wall in between (FW/SG).
- The most frequent cause of timed out is **a firewall/SG blocking traffic**. Check the allow rules by CIDR + port.
- If only production won't connect, look at the **SG's inbound rules** first.

That covers "can it connect." How to read the responses the server sends back once you're connected is up next, in the HTTP status codes edition.

**← Prev:** [③ How DNS Works and How to Investigate It](/en/posts/dns-basics-and-tools/)
**→ Next:** [⑤ How to Read HTTP Status Codes](/en/posts/http-status-codes/)
