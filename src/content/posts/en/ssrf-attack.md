---
title: "SSRF — Don't Let the Server Hit Internal Resources"
date: 2026-07-09T11:30:00
summary: "A feature that takes a URL and fetches it server-side can become a hole where an attacker uses your server as a stepping stone to reach internal services and the cloud metadata endpoint. This post covers how SSRF works, the defensive principles (validate destinations, block private ranges, disable redirects), and how to implement it in Go."
tags: ["セキュリティ", "ネットワーク"]
level: intermediate
lang: en
translationKey: ssrf-attack
---

"Give it a URL and the server fetches the contents" is a handy feature, but if you don't validate the destination it becomes a hole where **the attacker uses your server as a stepping stone to hit internal resources**. That's SSRF (Server-Side Request Forgery). Let's walk through how it works, the defensive principles, and a Go implementation.

## How the Attack Works — Abusing "Go Fetch That"

Image previews, webhooks, URL previews, PDF generation — features where **the server fetches a user-specified URL** are everywhere. Instead of an external site, the attacker hands it an **address only visible from the inside**.

- `http://169.254.169.254/latest/meta-data/` — the **metadata endpoint** on the cloud (AWS/GCP/Azure). Left open, it leaks temporary credentials (the IAM role's credentials)
- `http://localhost:8080/admin` — an admin API running on the server itself, invisible from outside
- `http://10.0.0.5/` — an internal service or DB admin console in the same VPC

```text
attacker ──(url=http://169.254.169.254/...)──▶ your server
                                                 │ the server sees it "from inside"
                                                 ▼
                                       169.254.169.254 (metadata)
                                       → grabs credentials, returns them to the attacker
```

> ⚠️ What's scary is that the server sits **inside the network**. An internal service you've firewalled off from the outside will still accept the request as "coming from inside" when it goes through the server.

## The Defensive Principles — Distrust the Destination

The essence of SSRF is trusting the fetch destination. Defense hardens the destination side.

| Principle | What you do |
| --- | --- |
| **Allowlist destinations** | Enumerate the hosts/domains you allow fetching. Strongest by default |
| **Block private ranges** | Reject `10./172.16./192.168.`, `127.`, and link-local `169.254.` |
| **Disable redirects** | Stop the trick where `http://ok.example/` 302s off to `169.254.169.254` |
| **Protect metadata** | On AWS, enforce **IMDSv2** (token required) and lower the hop limit |

- If your use case lets you build an allowlist (you only call fixed APIs, etc.), start there. Even a "fetch anything" feature should at minimum **reject all private/link-local** addresses
- Just like [command injection](/en/posts/command-injection/), the root is the same: **never pass untrusted input straight into a dangerous operation**

## Defending in Go — Resolve the Name, Then Reject the IP

Naively calling `http.Get(userURL)` is SSRF. Instead, **resolve the hostname yourself and reject if the resolved IP is in a private range** before fetching.

```go
func validateAddr(host string) error {
	ips, err := net.LookupIP(host)
	if err != nil {
		return err
	}
	for _, ip := range ips {
		// reject loopback, private, and link-local
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() {
			return fmt.Errorf("blocked address: %s", ip)
		}
	}
	return nil
}
```

- Base the range checks on the standard `net.IP`. If you handle CIDRs yourself, use `net.ParseCIDR` following the ideas in [IP addresses and CIDR](/en/posts/ip-address-and-cidr/)
- `169.254.169.254` (metadata) is caught by `IsLinkLocalUnicast()`

### Watch Out for Redirects and DNS Rebinding

Even after the check you can't relax. **Redirects** and **DNS rebinding** can sneak past validation.

```go
client := &http.Client{
	// never follow redirects (if you must, re-validate the target)
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		return http.ErrUseLastResponse
	},
	Transport: &http.Transport{
		// re-validate the IP we actually connect to (DNS rebinding defense)
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			host, _, _ := net.SplitHostPort(addr)
			if err := validateAddr(host); err != nil {
				return nil, err
			}
			return (&net.Dialer{}).DialContext(ctx, network, addr)
		},
	},
}
```

> ⚠️ **DNS rebinding**: a DNS response that returns a normal IP at validation time and `169.254.169.254` at connect time. That's why rejecting on the **IP you actually connect to** (`DialContext`), not the hostname you validated, is what's reliable.

> 🧭 The idea is the same in C#. Wrap `HttpClient` with allowlist validation and stop redirects with `SocketsHttpHandler.AllowAutoRedirect = false`. The framework changes, but the "distrust the destination" principle doesn't.

## Summary

- SSRF hits features where "the server fetches a user-specified URL", letting an attacker **use the server as a stepping stone to internal resources**
- The prime targets are the **cloud metadata endpoint `169.254.169.254`**, localhost, and internal services
- The defensive principles: **allowlist, reject private/link-local, disable redirects, IMDSv2**
- In Go, **validate the resolved IP** and **re-validate the actual connect IP in `DialContext`** to close off DNS rebinding
- The root is the same as other input-based vulnerabilities — **never pass untrusted input into a dangerous operation without validation**

**Related:** [Command Injection](/en/posts/command-injection/) / [Secure Access to Private Resources](/en/posts/secure-access-private-resources/) / [IP Addresses and CIDR](/en/posts/ip-address-and-cidr/)
