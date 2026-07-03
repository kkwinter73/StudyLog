---
title: "Using the Network Properly ③ How DNS Works and How to Inspect It"
date: 2026-06-23T11:00:00
summary: "How DNS resolves a name (example.com) into an IP address, when to use A vs CNAME records, and how to inspect it with dig/nslookup. Get to where you can isolate 'can't connect by name' problems."
tags: ["ネットワーク", "基礎"]
level: beginner
lang: en
translationKey: dns-basics-and-tools
---

> 📚 Series "Using the Network Properly" (3 / 5)

When you type `example.com` into your browser, a **name → IP address** conversion runs behind the scenes. That's **DNS (name resolution)**.
Let's nail down how it works, the main record types, and how to inspect it with `dig`/`nslookup`, so you can isolate "can't connect by name" issues.

## How name resolution works

People remember names (`example.com`), but communication happens over IPs (`93.184.216.34`). DNS is the bridge between them.
Roughly, it asks around until it reaches the answer.

```text
App → resolver (the one who asks) → root → TLD (handles .com) → authoritative server (handles example.com)
                                                                  └→ "it's 93.184.216.34"
```

- A result you looked up once is **cached** for a while (TTL). That's why it doesn't go all the way to root every time
- From the app's point of view, it's a "hand over a name, get back an IP" mechanism. The [OS resolver](/en/posts/user-space-vs-kernel-space/) handles it on your behalf

> 💡 It's a lot like a phone book. Look up a "name (company name)" and get back a "number (IP)." DNS distributes and manages that phone book at a global scale.

## Main records — A and CNAME

DNS has several kinds (records); the two you'll use most are these.

| Record | Meaning | Example |
| --- | --- | --- |
| A | name → points directly at an **IP address** | `example.com → 93.184.216.34` |
| CNAME | name → forwards to **another name** (alias) | `www.example.com → example.com` |

- **A** is the final "address." **CNAME** is an alias meaning "same as over there," a forward
- Follow a CNAME's target and you'll always end up at an A record

> ⚠️ There's a constraint that you can't attach a CNAME to a domain's apex (`example.com` itself) (by spec).
> This is where things like AWS Route 53's Alias record come in, to work around it.

## Inspecting with dig / nslookup

You can check "what IP a name resolves to" right from your terminal. An essential skill when troubleshooting.

```bash
dig example.com +short        # Show just the resolved IP (the one you'll use most)
dig www.example.com           # Details (you can see the CNAME chain and TTL too)
dig example.com MX            # Query a specific record type

nslookup example.com          # A simpler version. Often available even where dig isn't
```

> 💡 First use `dig +short` to check **whether the expected IP comes back**. If nothing comes back or you get a different IP, suspect a **DNS misconfiguration** before anything about connectivity. It's the classic cause of "the server is alive but I can't connect by name."

## Summary

- DNS is the mechanism that resolves **name → IP address**. The resolver asks around the distributed servers
- Results are **cached for the duration of the TTL**. It doesn't go to root every time
- **A** = points directly at an IP / **CNAME** = a forward to another name (alias). It always ends at an A record
- Use **`dig <name> +short`** to check the resolved IP. If it differs from what you expect, suspect a DNS misconfiguration
- "The server is alive but I can't connect by name" is often caused by DNS

**←Prev:** [② Ports and TCP Communication](/en/posts/ports-and-tcp/)
**→Next:** [④ Isolating Connection Problems](/en/posts/connection-troubleshooting/)
