---
title: "Resource-Oriented Design — Building APIs Around Nouns"
date: 2026-07-01T18:00:00
summary: "A REST-like API lists resources (nouns), not operations (verbs), and acts on them via HTTP methods. Here's how to design URLs, the safety and idempotency of methods, statelessness, and the anti-patterns people keep falling into."
tags: ["アーキテクチャ", "設計"]
level: intermediate
lang: en
translationKey: resource-oriented-design
---

In [gRPC vs REST](/en/posts/grpc-vs-rest/) I noted that "REST is resource-oriented." Here I dig into what that means and lay out **how to build a REST-like API**. The key is to *not* write the operation you want into the URL. Model with nouns, and leave the verbs to HTTP methods.

## What Resource-Oriented Means

It's the idea of designing an API as a **collection of resources (nouns)** rather than a **list of operations**.

```text
✕ Procedural: /createUser  /getUser  /updateUser  /deleteUser
◯ Resources: /users (noun) acted on with POST/GET/PUT/DELETE (verbs are the methods)
```

- A resource is a "thing" the API deals with (users, orders, products…)
- "What you do" is expressed by the **HTTP method**, not the URL

> 💡 A verb in the URL is a warning sign. Resource-oriented design **arranges nouns hierarchically**, like `/users/1/orders`.

## How to Design URLs

Represent each resource's "address" plainly. The basic move is to separate collections (plural) from individual items (singular).

| Pattern | Example | What it points to |
| --- | --- | --- |
| Collection | `/users` | All users |
| Individual | `/users/1` | The user with ID=1 |
| Subordinate resource | `/users/1/orders` | The orders of user 1 |
| Filtering | `/orders?status=paid` | Conditions via query string |

- Keep nouns **plural** and consistent (`/users`). Don't create inconsistent spellings
- Do filtering, sorting, and paging with the **query string** (don't mix them into the URL hierarchy)

## What Methods Mean — Safety and Idempotency

HTTP methods have defined properties. Following them lets caching and retries work safely.

| Method | Purpose | Safe | Idempotent |
| --- | --- | --- | --- |
| GET | Retrieve | ✅ (no changes) | ✅ |
| POST | Create | ✕ | ✕ (multiple calls create multiple) |
| PUT | Replace/update | ✕ | ✅ (same result every time) |
| DELETE | Delete | ✕ | ✅ |

- **Safe**: doesn't change state. Give GET no side effects
- **Idempotent**: sending the same request any number of times yields the same result. Robust against network retransmission

> ⚠️ POST alone is not idempotent — meaning **a retry can create a duplicate**. For places like payments, supplement it with an [idempotency key](/en/posts/idempotency-key-implementation/). Designs like "a GET that also updates" get broken by caches and crawlers.

> 🧭 C#'s ASP.NET Core Web API takes the same shape with attribute routing (`[HttpGet("users/{id}")]`, etc.). The framework differs, but the convention of "noun routes + method as verb" is the same.

## Statelessness and Representation

REST keeps interactions **stateless**. The server doesn't remember session state between requests.

- Put any needed context, like auth info, **into every request** ([authenticate at the boundary](/en/posts/auth-boundary-edge-vs-app/))
- The JSON (or whatever) the client receives isn't the resource itself but its **"representation" at that moment**. The same resource can be represented in JSON or another format

> 💡 Because it's stateless, any server can handle a request, which makes it easy to **scale horizontally**. Keep state in the DB or in tokens.

## Anti-Patterns People Keep Falling Into

Typical ways to break resource orientation. Just avoiding them gives you a clean API.

- **Verb URLs**: `/getUser`, `/user/1/activate` → express state changes with `PATCH /users/1` or a subordinate resource
- **Side effects on GET**: `GET /users/1/delete` → don't put destructive operations on GET
- **Huge queries in the body**: overusing POST for retrieval → first consider whether a query string can express it
- **One giant endpoint**: routing everything through `/api` → split it per resource

## Summary

- Resource-oriented design **lists nouns (resources) and leaves the verbs to HTTP methods**
- URLs are **plural nouns + hierarchy**; express filtering with the **query string**
- Follow methods' **safety and idempotency**. POST is non-idempotent, so watch for duplicate creation
- Go **stateless** and carry context every time = easy to scale horizontally
- Just avoiding anti-patterns like **verb URLs and side effects on GET** keeps things clean

**Related:** [gRPC vs REST](/en/posts/grpc-vs-rest/) / [HTTP Status Codes](/en/posts/http-status-codes/) / [Implementing Idempotency Keys](/en/posts/idempotency-key-implementation/)
