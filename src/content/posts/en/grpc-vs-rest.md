---
title: "gRPC vs REST — Resource-Oriented or Procedure-Oriented?"
date: 2026-07-01T17:00:00
summary: "REST means \"operate on resources with HTTP methods\"; gRPC means \"call functions with typed contracts.\" We compare the differences in design philosophy, contracts, streaming, and browser support, and lay out how to choose between them."
tags: ["ネットワーク", "アーキテクチャ"]
level: intermediate
lang: en
translationKey: grpc-vs-rest
---

There are two broad families of API design: **REST (resource-oriented)** and **gRPC (procedure-oriented)**.
I covered [using gRPC for internal communication](/en/posts/internal-service-grpc/) in a separate post, so here I'll focus on the
**differences as API styles**—design philosophy, contracts, streaming, browser support—and how to pick between them.

## REST — Operating on resources

REST is the style of "**laying out data as nouns (resources) and operating on them with HTTP methods**."

```text
GET    /users/1        Get user 1
POST   /users          Create a user
PUT    /users/1        Update user 1
DELETE /users/1        Delete user 1
```

- The URL is the **resource's address**, the method (GET/POST/…) is the **verb**, and the result is a [status code](/en/posts/http-status-codes/)
- It's stateless, and its strength is that you can **hit it directly and see it** with `curl` or a browser

## gRPC — Calling functions

gRPC is the style of "**calling a remote service's function with typed contracts**" (RPC). You define the schema (protobuf) first,
then generate client/server code from it.

```protobuf
service UserService {
  rpc GetUser(GetUserRequest) returns (User);
}
```

- Instead of designing URLs and methods, you **define "the function you want to call"**
- HTTP/2 plus binary (protobuf) makes it **fast and small**. Types are generated from the schema and are strict

> 🧭 Both Go and .NET can generate code in either language from a protobuf definition, so you can **match types across languages**.
> If you've used C#'s WCF, the "decide the contract first" mindset will feel familiar.

## What's different

Even for the same "service-to-service communication," the philosophies and strengths differ.

| Aspect | REST | gRPC |
| --- | --- | --- |
| Design center | Resources (nouns) + HTTP methods | Procedures (functions) + messages |
| Contract | Loose (OpenAPI etc. are optional) | **Required and strict** via protobuf |
| Data format | Text (JSON) | Binary (protobuf) |
| Streaming | Weak | **Four styles, up to bidirectional** (below) |
| Directly from browser | Works as-is | Not possible in principle (needs gRPC-Web) |
| Human access / debugging | Easy (curl) | Needs dedicated tooling |

### gRPC's four communication styles

Whereas REST is basically "one request → one response," gRPC can keep streaming.

- **Unary**: 1→1 (an ordinary call)
- **Server streaming**: 1→many (stream progress or a list)
- **Client streaming**: many→1 (chunked uploads, etc.)
- **Bidirectional**: many↔many (chat or real-time coordination)

## Which to choose

Choose by use case. Neither is always the right answer.

- **Good for REST**: public external APIs, direct access from browsers/mobile, offering something easily to a wide range of clients
- **Good for gRPC**: [internal service-to-service communication](/en/posts/internal-service-grpc/), low latency and high throughput, streaming, matching types across multiple languages

> 💡 The classic pattern is "**external = REST, internal = gRPC**." Outward-facing you take ease and compatibility; inward-facing you take speed and type safety.
> It's fine to use both in a single system.

> ⚠️ You can't call gRPC directly from a browser. To use gRPC for a public frontend, you need **gRPC-Web** or a gateway in between.
> Miss this and you'll end up with "it just doesn't work."

## Summary

- REST is **resource-oriented** (URL + HTTP methods); gRPC is **procedure-oriented** (typed function calls)
- gRPC has a **strict contract via protobuf**, is fast thanks to binary, and offers **four streaming styles**
- REST is **easy, callable directly from a browser, and simple to debug**; gRPC can't be hit directly from a browser (needs gRPC-Web)
- The classic split is **external = REST, internal = gRPC**. Using both in one system is fine
- The axes for choosing: "who's the caller (human/browser or service)?" and "do you need speed, types, or streaming?"

**Related:** [Internal Service Communication and gRPC](/en/posts/internal-service-grpc/) / [HTTP Status Codes](/en/posts/http-status-codes/) / [Ports and TCP](/en/posts/ports-and-tcp/)
