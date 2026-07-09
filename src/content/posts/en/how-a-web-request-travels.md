---
title: "Communication Behind the Web ③: How a Web Request Travels"
date: 2026-07-09T20:00:00
summary: "From typing a URL to seeing the page, DNS→TCP→TLS→HTTP run in a straight line behind the scenes. Walk the whole flow in one piece, tying the earlier articles into a single map."
tags: ["ネットワーク", "基礎"]
level: beginner
lang: en
translationKey: how-a-web-request-travels
---

> 📚 Series "Communication Behind the Web" (3 / 10)

From typing `https://example.com` in the address bar to the page appearing, a straight line runs behind the scenes:
**parse the URL → DNS → TCP → TLS → HTTP.** This installment walks each step in one piece and serves as the
**hub article** that ties the whole series into a single map.

## The big picture — five steps

```text
① Parse the URL      https://example.com:443/path?q=1
② Resolve via DNS    example.com → 93.184.216.34
③ Establish TCP      three-way handshake (to :443)
④ Encrypt with TLS   verify certificate, agree on keys
⑤ Talk over HTTP     GET /path → 200 OK + HTML
```

Higher is closer to the app, lower is the foundation. The [layered model](/en/posts/network-layers-tcpip-osi/) from before applies in exactly this order.

## ① Parse the URL

A URL folds "which protocol, which host, and where" into one line. The browser first splits it into parts.

```text
https :// example.com : 443 / path ? q=1 # top
scheme     host         port  path  query fragment
```

- If the **scheme** is `https`, TLS (step ④) comes later and the default port is 443 (`http` → 80)
- If `port` is omitted, the scheme's default is used
- `query` is passed to the server; the `fragment` (after `#`) is used **only inside the browser** and is not sent to the server

## ② Resolve the name via DNS

`example.com` is a name for humans. Communication needs an IP, so [DNS](/en/posts/dns-basics-and-tools/) resolves
name → IP. If it's not cached, it queries several DNS servers to get the answer (often over UDP for speed).

> 💡 A failure here means "can't resolve the name" (`Could not resolve host`). At this stage you haven't touched the target server even once.

## ③–④ Connect with TCP, protect with TLS

Once you have the IP, connect to port 443 at that IP via the [TCP three-way handshake](/en/posts/ports-and-tcp/).
For `https`, a **TLS handshake** follows to verify the peer's certificate and agree on encryption keys (details in the [HTTPS/TLS article](/en/posts/https-tls-explained/)).

```text
DNS done → [TCP] SYN/SYN+ACK/ACK → [TLS] verify cert, agree keys → a secure path opens
```

> ⚠️ If "DNS resolves but it won't connect," suspect step ③ onward. `Connection refused` = the peer is there but not listening on that port;
> timeout = it's not reaching due to routing or a firewall; a certificate error = it's being rejected at TLS in step ④.

## ⑤ Talk over HTTP

Once the path is open, you finally send the **HTTP request**, and the server returns a **response**.

```http
GET /path?q=1 HTTP/1.1
Host: example.com

HTTP/1.1 200 OK
Content-Type: text/html
...body...
```

The internal structure (method, headers, body) is covered [next time](/en/posts/http-message-anatomy/), and the meaning
of `200` and friends in the [HTTP status article](/en/posts/http-status-codes/). Once the browser has the HTML, it
**repeats ②–⑤ as many times as needed** for the CSS/JS/images inside it.

> 🧭 The single line `HttpClient.GetAsync(url)` in C# does exactly this ②–⑤ behind the scenes; Go's `http.Get(url)` too.
> It's usually hidden, but when something stalls, seeing which of these five stages stopped makes triage fast.

## Summary

- From URL to page is a straight line: **parse URL → DNS → TCP → TLS → HTTP**
- Parsing decides a lot: the `fragment` (`#`) isn't sent to the server, `https` defaults to port 443, and so on
- The symptom changes by the failing layer: name resolution = DNS, `refused`/timeout = TCP path, certificate = TLS, `4xx/5xx` = HTTP
- This is the map for the series; later installments drill into each step

**← Prev:** [② TCP vs UDP](/en/posts/tcp-vs-udp/)
**→ Next:** [④ Anatomy of an HTTP Message](/en/posts/http-message-anatomy/)
