---
title: "DoS and DDoS — How to Absorb Exhaustion Attacks"
date: 2026-07-09T15:30:00
summary: "Exhaustion attacks that take a service down have a layer you can't defend in application code, and a layer you can. This post sorts out the attack types and covers how far Go can hold the line with http.Server timeouts, body size caps, and per-IP rate limiting."
tags: ["セキュリティ", "ネットワーク", "運用"]
level: intermediate
lang: en
translationKey: dos-ddos
---

Sorting out "exhaustion (DoS) attacks" that make a service unusable, from the defender's point of view. The conclusion up front: **you can't defend bandwidth-filling attacks in code (leave those upstream), but the app itself can be built so its resources aren't drained** — the second half shows how to build that in Go.

## How the Attacks Work — DoS and DDoS

DoS (Denial of Service) exhausts a resource until a service can't respond. Doing this in a **distributed way from a large fleet of machines (a botnet)** is DDoS (Distributed DoS). A single source is easy to block; distributed traffic is hard because it's "indistinguishable from legitimate users".

Attacks split broadly into three layers, by which resource they exhaust.

| Layer | Example | Exhausted resource |
| --- | --- | --- |
| **Volumetric** | UDP flood, DNS/NTP amplification | Link bandwidth |
| **Protocol** | SYN flood | Connection tables, firewall state |
| **Application** | slowloris, hammering expensive endpoints | Workers, connections, CPU/memory |

- **Amplification** spoofs the source address, sends a small request, and makes a responder return a reply tens of times larger to the victim. It builds a big attack from little bandwidth
- **slowloris** uses no bandwidth at all. It opens many connections and sends requests **deliberately slowly**, tying up the server's connection slots. This "cheap but effective" nature is what makes application-layer attacks nasty

> 💡 A volumetric attack "washes you away with a fat pipe"; an application-layer attack "plugs your workers with one cheap move". You absorb the former upstream and the latter through how the app is built — different layers own different jobs.

## Principles of Defense — You Can't Code It All Away

The line matters first. **A bandwidth-filling attack is already too late by the time it reaches your server.** Your own code can't stop it, so it gets absorbed upstream.

- **The upstream layer's job**: CDN, DDoS scrubbing services, upstream rate limiting. Absorb or block traffic before it reaches the app
- **The app's job**: the "resilience" not to have its resources drained by a single move. Timeouts, body size caps, connection limits, and **graceful degradation** under overload (shed some load to stay alive)

> ⚠️ "We put in a WAF/CDN, so we're safe" doesn't hold. Application-layer attacks that slip past the edge, and access from inside, still land on the app. **Defense in depth** — every layer does at least its own job.

## Defense in Go — Timeouts Are the First Wall

Go's `http.Server` is **unbounded when no timeouts are set**, which is exactly what slowloris exploits. Always set the timeouts first.

```go
srv := &http.Server{
	Addr:              ":8080",
	Handler:           mux,
	ReadHeaderTimeout: 5 * time.Second,  // cut off drip-fed headers
	ReadTimeout:       10 * time.Second, // whole read incl. body
	WriteTimeout:      10 * time.Second, // cap on writing the response
	IdleTimeout:       60 * time.Second, // idle cap on keep-alive connections
}
log.Fatal(srv.ListenAndServe())
```

- `ReadHeaderTimeout` is the direct counter to slowloris — don't keep holding a connection that never finishes its headers
- `IdleTimeout` stops lingering keep-alive connections from eating connection slots

## Defense in Go — Body Caps and Rate Limiting

Against attacks that exhaust memory with a huge request body, cap it with `http.MaxBytesReader`.

```go
func handler(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // cut off at 1 MiB
	var in Payload
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "payload too large or invalid", http.StatusRequestEntityTooLarge)
		return
	}
	// ...
}
```

For hammering from the same source, rate-limit per IP with a token bucket from `golang.org/x/time/rate`.

```go
type ipLimiter struct {
	mu       sync.Mutex
	buckets  map[string]*rate.Limiter
}

func (l *ipLimiter) get(ip string) *rate.Limiter {
	l.mu.Lock()
	defer l.mu.Unlock()
	lim, ok := l.buckets[ip]
	if !ok {
		lim = rate.NewLimiter(10, 20) // steady 10 req/s, burst 20
		l.buckets[ip] = lim
	}
	return lim
}

func (l *ipLimiter) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		if !l.get(ip).Allow() {
			http.Error(w, "rate limited", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}
```

> ⚠️ Left alone, that map keeps accumulating IPs and eats memory (itself a target for an exhaustion attack). In production, keep a last-seen timestamp and sweep periodically, or use an LRU. Also, behind a CDN `r.RemoteAddr` is the proxy's IP — design it to read `X-Forwarded-For` **only from a trusted front tier**.

> 🧭 C# / ASP.NET Core maps one-to-one. Kestrel's request timeouts and `MaxRequestBodySize` give you the timeouts and body cap; rate limiting comes from the built-in Rate Limiting middleware (`AddRateLimiter`). The layered thinking carries over unchanged.

## Summary

- DoS is resource exhaustion; DDoS is the same **distributed** so it's hard to tell from legitimate users
- Attacks come in three layers — **volumetric, protocol, application**. Amplification and slowloris are dangerous because they're "cheap but effective"
- **Volumetric attacks can't be coded away.** Leave them to the upstream CDN, scrubbing, and rate limiting
- Make the app resilient with **timeouts, body caps, per-IP rate limiting, and graceful degradation**
- In Go, the four `http.Server` timeouts + `MaxBytesReader` + `x/time/rate` are the first kit

**Related:** [Brute Force and Password Spray](/en/posts/brute-force-password-spray/) / [Man-in-the-Middle (MITM) Attacks](/en/posts/mitm-attack/) / [Deploy Rollback Strategy](/en/posts/deploy-rollback-strategy/)
