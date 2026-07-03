---
title: "Using Networks Properly ⑤ How to Read HTTP Status Codes"
date: 2026-06-23T09:00:00
summary: "Once you're connected, the server tells you how it responded via a status code. Learn the five classes (2xx–5xx), the meaning of the common codes, and how 4xx vs 5xx points you to different places to look — and debug APIs faster."
tags: ["ネットワーク", "基礎"]
level: beginner
lang: en
translationKey: http-status-codes
---

> 📚 Series "Using Networks Properly" (5 / 5)

If [isolating connection trouble](/en/posts/connection-troubleshooting/) is about **whether you can connect**, this one is about **what happens after** you're connected. The server returns an **HTTP status code** with every response. Once you know how to read it, API debugging makes it obvious "whose fault is it."

## Start with the five classes

The leading digit of the three determines the broad category. The trick is to **look at the first digit first**.

| Class | Meaning | In a word |
| --- | --- | --- |
| 1xx | Informational | Still processing (rarely seen day to day) |
| 2xx | Success | It worked |
| 3xx | Redirect | "Go somewhere else" instruction |
| 4xx | Client error | **Your request** is off |
| 5xx | Server error | Something went wrong **on the server side** |

> 💡 The crux of debugging is **4xx vs 5xx**. For 4xx, suspect the request you sent; for 5xx, suspect the server (and whatever is behind it). That one distinction alone decides "which side to investigate."

## What the common codes mean

These are the ones you see most often in practice. Rather than rote memorization, tie each to "which class is it."

| Code | Meaning | Common cause |
| --- | --- | --- |
| 200 OK | Success | All good |
| 301 / 302 | Permanent / temporary redirect | http→https, URL change |
| 400 Bad Request | The request is malformed | Broken JSON, missing required parameter |
| 401 Unauthorized | Authentication required / failed | Token not attached, expired |
| 403 Forbidden | Authenticated, but no permission | Insufficient access rights |
| 404 Not Found | The target doesn't exist | Wrong URL/path |
| 500 Internal Server Error | Internal server error | App exception / bug |
| 502 / 503 | Bad upstream / temporarily unavailable | Backend app down, overloaded, restarting |

> ⚠️ **401 and 403 are different things.** 401 = "I don't know who you are (authentication)"; 403 = "I know who you are, but you're not allowed (authorization)." For 401, check the token; for 403, check the permission settings.

## Where to look for 4xx / 5xx

For "connected but got an error," branch your investigation by class.

```text
4xx → Recheck your own request (URL, headers, body, auth token)
5xx → Go look at the server side (app logs/exceptions, backend services, load)
      502/503 is the classic "LB is alive but the backend app isn't responding"
```

> 🧭 502/503 shows up often in setups with a [load balancer](/en/posts/aws-networking-explained/) out front. The LB itself responds, so TCP connects, but if the backend app is down or still starting up you get a 502/503. This is exactly where [graceful shutdown](/en/posts/deploying-go-apps/) helps (it reduces 5xx during switchover).

## Seeing it for real with curl

You can check status codes directly with `curl`. This is the basic move when investigating.

```bash
curl -I https://example.com                       # Fetch headers only (code is on the first line)
curl -s -o /dev/null -w "%{http_code}\n" URL       # Print just the code
curl -v https://example.com                        # Verbose (you can see the redirect chain too)
```

> 💡 The `-w "%{http_code}"` we use to verify this blog's deploys is exactly this. 200 means success; for 3xx, check where it redirects; for 4xx/5xx, use the table above to guess the cause.

## Summary

- A status code is the server's reply **after** you're connected. Look at the **first digit (class)** first
- **2xx success / 3xx redirect / 4xx client / 5xx server**
- The crux of debugging is **4xx (your request) vs 5xx (server side)**
- 401 (authentication) ≠ 403 (authorization); 404 is a wrong path; 502/503 is a sign the backend app isn't responding
- Check the code with `curl -I` or `-w "%{http_code}"`, then let the class decide where to look

**← Prev:** [④ Isolating connection trouble](/en/posts/connection-troubleshooting/)

That completes the "Using Networks Properly" series. Across "whether you can connect (①–④)" and "the response after connecting (⑤)," you should now be able to isolate both connection trouble and API debugging.
