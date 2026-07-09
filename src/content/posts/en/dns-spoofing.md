---
title: "DNS Spoofing and Cache Poisoning — Forging Name Resolution"
date: 2026-07-09T16:00:00
summary: "Hijacking name resolution with a forged response so a domain name points at the attacker's IP. This post sorts out how it works, covers the defenses (DNSSEC / DoH·DoT / port randomization), and explains why the last line of defense on the app side is still TLS certificate validation."
tags: ["セキュリティ", "ネットワーク"]
level: intermediate
lang: en
translationKey: dns-spoofing
---

You think you're reaching `example.com`, but you land on some completely different attacker's server. When this happens at the name-resolution stage, it's **DNS spoofing / cache poisoning**. Let's sort out how it works, the defenses, and what ends up being the last line of defense on the app side. For the basics of name resolution itself, see [DNS Basics and Tools](/en/posts/dns-basics-and-tools/).

## How the Attack Works — Hijacking a Name With a Forged Response

DNS looks up "name → IP", but if that response can be **forged**, the victim ends up believing a domain name maps to the attacker's IP. That's the starting point of the attack.

- **DNS spoofing**: reply to a query with a **forged response faster than the legitimate server**, and get it believed
- **Cache poisoning**: plant that forged response into a **resolver's cache like poison**. Once it's in, for the length of the TTL, everyone using that resolver gets the tainted answer (the damage spreads across a whole population)

Classic DNS allowed this because of the protocol's naïveté.

| Weakness | Why it was forgeable |
| --- | --- |
| **UDP-based** | Connectionless, no handshake to confirm the response's source. A spoofed-sender forged reply is easy to inject |
| **No authentication** | Responses aren't signed, so you can't verify they came from the legitimate server |
| **Only a 16-bit ID to match** | Accepting a response effectively hinges only on a matching transaction ID — brute-forceable |

> ⚠️ The 2008 **Kaminsky attack** showed that by making a resolver look up many non-existent subdomains and firing forged replies, you can poison the cache along with the authoritative server's records. It made clear that brute-forcing the 16-bit ID was realistic, and triggered the emergency standardization of the port randomization discussed below.

## Defense Principles — Sign It, Encrypt It, Add Entropy

The defenses go in three directions: make responses verifiable, keep the path from being sniffed or rewritten, and make it hard to guess.

- **DNSSEC**: attach a **digital signature** to DNS records so you can verify a response wasn't tampered with. Forged responses fail signature validation (protects *integrity* — note it does not encrypt the content)
- **DoT / DoH**: **encrypt the query path with TLS** (DoT = DNS over TLS, DoH = DNS over HTTPS). Prevents on-path eavesdropping and tampering (protects *confidentiality*)
- **Source-port randomization**: randomize the query's source port every time too, so together with the ID there's more entropy to guess (makes brute force impractical — the post-Kaminsky mitigation)

> 💡 DNSSEC and DoH have different goals. DNSSEC is "is the answer genuine (integrity)"; DoH is "is the path unsniffable (confidentiality)". **Only using both** closes off both tampering and eavesdropping. Either one alone is half a solution.

And the most important principle — **don't entrust trust to DNS alone**. Even if name resolution is hijacked, the TLS certificate validation downstream makes the final call on "is this really the legitimate server for that domain".

## How It Interacts With Your App — the Last Line of Defense Is TLS Cert Validation

What realistically helps you as an app developer is to assume you can't blindly trust DNS. Even if DNS is poisoned and the connection IP points at the attacker, **TLS certificate validation** stops the impersonation.

```text
[poisoned]  example.com → (poisoned cache) → attacker's IP
            → verify the cert during the TLS handshake
            → the attacker can't hold a legitimate cert for example.com
            → validation fails, connection aborts (impersonation blocked)
```

- **Don't disable certificate validation**: an `InsecureSkipVerify`-style setting removes this last line of defense yourself. It lets DNS poisoning pass straight through into impersonation
- **Use a trusted resolver + DoH**: lowers the risk of a poisoned path and resolver. Many HTTP clients let you point at a DoH-capable resolver
- **Be extra careful with internal names**: internal service-to-service traffic, which isn't protected by public TLS, is exactly where you should verify the peer with mTLS or similar

In Go, the standard `net/http` validates the server certificate by default. Not touching this is the right answer.

```go
// This is what you must not do (killing validation turns DNS poisoning straight into impersonation)
tr := &http.Transport{
    TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, // ⚠️ removing the last line of defense
}
```

> 🧭 Same in C#/.NET. The basis of trust is not name resolution but **validating the TLS certificate**. Suppressing validation — e.g. always returning `true` from `HttpClientHandler.ServerCertificateCustomValidationCallback` — opens exactly the same hole as Go's `InsecureSkipVerify`.

## Summary

- DNS spoofing / cache poisoning uses a **forged response** to point a domain name at the attacker's IP
- Classic DNS was fragile because of **UDP, no authentication, and matching on only a 16-bit ID** (the Kaminsky attack exposed how realistic brute force was)
- Defenses: **DNSSEC (signing = integrity) / DoT·DoH (encryption = confidentiality) / port randomization (more entropy)**
- The most important principle is **don't entrust trust to DNS alone**
- The last line of defense on the app side is **TLS certificate validation** — the rule is never to disable it with `InsecureSkipVerify` and the like

**Related:** [DNS Basics and Tools](/en/posts/dns-basics-and-tools/) / [SSRF Attack — Making a Server Send Requests It Shouldn't](/en/posts/ssrf-attack/)
