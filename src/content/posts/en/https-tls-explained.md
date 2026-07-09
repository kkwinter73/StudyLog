---
title: "Communication Behind the Web ⑥: How HTTPS/TLS Works"
date: 2026-07-09T18:30:00
summary: "HTTPS is 'HTTP + TLS.' Understand how it defends against eavesdropping, tampering, and impersonation by splitting it into three roles: public-key key exchange, certificate-based identity, and symmetric encryption."
tags: ["ネットワーク", "基礎"]
level: intermediate
lang: en
translationKey: https-tls-explained
---

> 📚 Series "Communication Behind the Web" (6 / 10)

Let's open the TLS that appeared in step ④ of the [request's journey](/en/posts/how-a-web-request-travels/). **HTTPS is nothing more than "HTTP + TLS."**
We'll follow, by role, how TLS defends against the three dangers plain HTTP carries — **eavesdropping, tampering, and impersonation** —
without chasing the cryptographic math, focusing on "what is done for what purpose."

## The three dangers of plain HTTP

Without TLS, you're defenseless against a third party sitting in the middle of the path.

| Danger | What it is | TLS countermeasure |
| --- | --- | --- |
| Eavesdropping | Contents are read | **Encryption** |
| Tampering | Contents are rewritten | **Integrity check (MAC)** |
| Impersonation | You're connected to a fake server | **Identity via certificate** |

> ⚠️ "It's HTTPS, so it's safe" means "the path is protected." **Whether the peer you connected to is trustworthy** is a separate matter (phishing sites can use HTTPS too).

## ① Encryption — using symmetric and public keys for what each is good at

There are two kinds of encryption, and TLS **takes the best of both.**

- **Symmetric encryption**: same key to encrypt and decrypt. Fast, but how do you hand that key to the peer safely?
- **Public-key encryption**: encrypt with a public key, decrypt with a private key. Safe to distribute keys, but slow

So TLS "**uses public keys to safely share the seed for a symmetric key, then does all real traffic with the fast symmetric key.**"
That's the heart of the handshake.

## ② Certificates — confirming the peer is genuine

Even with encryption, it's meaningless if the peer you connected to is a fake. So a **server certificate** confirms identity.

```text
Server certificate = domain name + server's public key + signature of a Certificate Authority (CA)
```

- The browser verifies the signature of a trusted **Certificate Authority (CA)** to confirm "this public key really belongs to example.com"
- A certificate is trusted only when its chain of signatures traces up to a **root CA**
- Expired, domain-mismatched, or self-signed certificates make the browser warn you

> 💡 The "won't connect due to a certificate error" mentioned in the [request's journey](/en/posts/how-a-web-request-travels/) is this.
> Before encrypting, TLS **first confirms the peer's identity.**

## ③ The handshake flow

Putting ① and ② into one flow looks like this (TLS 1.3, sketched).

```text
Client                                Server
  │ ── ClientHello ─────────────────▶ │  offers supported cipher suites
  │ ◀── ServerHello + certificate ─── │  picks a suite, presents its cert
  │   verify cert via CA, exchange key material  │
  │ ══════ everything below is symmetric-encrypted ══════ │
  │ ─────────── encrypted HTTP ──────▶ │
```

- Only after this completes does the [HTTP message from ④](/en/posts/http-message-anatomy/) flow, encrypted
- TLS 1.3 cuts round trips, and in [HTTP/3](/en/posts/http-versions-evolution/) the handshake is merged with QUIC for even more speed

> 🧭 In practice you rarely write certificates by hand: automatic issuance via **Let's Encrypt**, or on AWS **ACM + a load balancer**
> terminating TLS, is the norm. Often the app (C#/Go) speaks plain HTTP while the LB in front handles TLS (this leads into ⑨).

## Summary

- **HTTPS is HTTP + TLS.** TLS defends against the three: eavesdropping, tampering, impersonation
- Eavesdropping → **encryption**, tampering → **integrity check**, impersonation → **certificate-based identity**
- TLS uses public keys to **safely share a symmetric key**, then encrypts real traffic with the fast symmetric key
- A certificate is trusted through a **chain of CA signatures**. Expiry / domain mismatch triggers a warning
- "Safe because HTTPS" is about the path; whether the peer is trustworthy is a separate question

**← Prev:** [⑤ The Evolution of HTTP/1.1→2→3](/en/posts/http-versions-evolution/)
**→ Next:** [⑦ Cookies / Sessions / Tokens](/en/posts/cookie-session-token/)
