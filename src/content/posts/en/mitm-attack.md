---
title: "Man-in-the-Middle (MITM) — Protect the Path With TLS"
date: 2026-07-09T15:00:00
summary: "How a man-in-the-middle attack works — an attacker sits between client and server to read or alter traffic. This post covers the principles of defending with TLS, and the certificate-verification footgun you'll be tempted to reach for in Go."
tags: ["セキュリティ", "ネットワーク"]
level: intermediate
lang: en
translationKey: mitm-attack
---

A man-in-the-middle (MITM) attack is when an attacker wedges between client and server to read or rewrite the traffic. The conclusion up front: **assume the path is untrusted, use TLS correctly, and never disable certificate verification** — nearly all the defense collapses into that one sentence.

## How the Attack Works — Sitting in the Middle of the Path

MITM doesn't break the crypto; it **wedges into the middle of the communication path and routes traffic through the attacker**. Three common entry points.

- **ARP spoofing**: on a LAN, flood forged ARP replies claiming "I'm the gateway" so the victim's traffic flows to the attacker
- **Rogue Wi-Fi (Evil Twin)**: stand up an access point with the same SSID as the legitimate one and pass through — while peeking at — traffic from devices that connect
- **Downgrade attacks**: force an encrypted connection down to plaintext or a weak cipher so the contents become readable (e.g. HTTPS dropped to HTTP)

Once any of these lands, the attacker can **eavesdrop** on requests and responses, and can also rewrite them — **tampering**.

> ⚠️ "It's the corporate network, so it's safe" doesn't hold. ARP spoofing works if the attacker is on the same LAN. Path safety is guaranteed **by crypto and certificates, not by where you are on the network.**

## Principles of Defense — Don't Trust the Path

MITM defense starts from "the channel itself cannot be trusted." The principles are simple.

| Principle | What you do |
| --- | --- |
| **TLS everywhere** | Encrypt every path, internal traffic included. Leave no plaintext segment |
| **Verify certificates** | Always check the server cert is issued by a trusted CA and matches the hostname |
| **HSTS** | Tell the browser "this domain is always HTTPS," shutting down downgrades to HTTP |
| **Certificate pinning** | Accept only specific certs/public keys. Use it **sparingly**, where you control the path (e.g. mobile apps) |

- Pinning is powerful but breaks easily on cert renewal. **Don't reach for it casually** — only when you can design the renewal operations too
- The one thing you must never do is **"disable verification because it doesn't work."** That opens the door to MITM yourself.

## Defending in Go — Safe by Default, Dangerous If You Turn It Off

`net/http` verifies the server certificate by default. **Use it plainly and you're already resistant to MITM.**

```go
// The default http.Client verifies the server cert. This is enough.
resp, err := http.Get("https://api.example.com/health")
if err != nil {
    log.Fatal(err) // if the cert is bad you get an error here (= you're protected)
}
defer resp.Body.Close()
```

The trouble starts when someone wants to silence a certificate error and writes this. **It must never ship to production.**

```go
// Anti-pattern: disabling cert verification — waves MITM straight through
tr := &http.Transport{
    TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, // ⚠️ never do this
}
client := &http.Client{Transport: tr}
```

`InsecureSkipVerify: true` declares "trust whoever's on the other end." It accepts a fake server's or a wedged-in attacker's certificate unconditionally, so even with TLS in place **the contents are fully exposed and freely rewritable.**

Instead, **pin a minimum version** to prevent downgrades to weak protocols.

```go
// Good direction: keep verification on, pin the minimum version to TLS 1.2
cfg := &tls.Config{
    MinVersion: tls.VersionTLS12, // stricter: tls.VersionTLS13
}
tr := &http.Transport{TLSClientConfig: cfg}
client := &http.Client{Transport: tr}
```

For service-to-service traffic where you want both ends to verify "is the other side real too," use **mTLS** (make the client present a certificate as well). You configure it via `ClientCAs` and `ClientAuth` on `tls.Config`.

> 🧭 C#'s `HttpClient` also verifies certificates by default. The dangerous equivalent is returning `true` unconditionally from `HttpClientHandler.ServerCertificateCustomValidationCallback` — exactly the same footgun as Go's `InsecureSkipVerify: true`, so be suspicious the moment you see a `return true;`.

## Summary

- MITM isn't crypto-breaking; it's **wedging into the middle of the path**. ARP spoofing, rogue Wi-Fi, and downgrade attacks are the common entry points
- The pillars of defense are **TLS everywhere, certificate verification, and HSTS**. Adopt pinning only where you can design the renewal operations
- Go's `net/http` **verifies certificates by default** — use it plainly and you're protected
- `tls.Config{InsecureSkipVerify: true}` waves MITM straight through — an **anti-pattern; don't ship it**
- Pin `MinVersion: tls.VersionTLS12/13` against downgrades; use **mTLS** for mutual verification between services

**Related:** [Session Hijacking and Fixation](/en/posts/session-hijacking-fixation/) / [DNS Spoofing](/en/posts/dns-spoofing/) / [SSH and Key Authentication](/en/posts/ssh-and-key-auth/)
