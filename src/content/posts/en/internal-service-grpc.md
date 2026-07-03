---
title: "Inter-Service Communication and gRPC — Separating the Public Boundary from the Internal"
date: 2026-06-26T12:00:00
summary: "The API you expose to the outside world and the internal calls services make between themselves behind the scenes should be treated differently. Keep internal traffic off the load balancer, wire it up with name resolution, and use typed, fast gRPC — here are the key points of that setup."
tags: ["ネットワーク", "アーキテクチャ"]
level: intermediate
lang: en
translationKey: internal-service-grpc
---

Once you split things into services, communication comes in two flavors: **the API you expose to the outside** and **the internal calls services make between each other behind the scenes**. Not mixing these two is the crux of good design. Let's look at **gRPC**, commonly used for internal traffic, and how to draw the line against the public boundary.

## Separating public from internal

Not everything needs to be a public API sitting behind a [load balancer (LB)](/en/posts/aws-networking-explained/).

- **Public boundary**: the entry point for requests coming from the outside (browsers, mobile). Put it on an LB and apply authentication and TLS
- **Internal communication**: calls between services. Never exposed to the outside, and kept entirely [inside a dedicated network](/en/posts/container-network-and-data/)

> 💡 The reason internal-only services don't go on an LB is simple: there's no need to reach them from outside — so [don't expand the attack surface](/en/posts/aws-security-groups/).
> Narrow the entry point and wire the back end together over a closed network.

## What is gRPC

gRPC is an RPC (remote procedure call) that runs over HTTP/2. It generates typed clients and servers from a schema (protobuf).

| | REST/JSON | gRPC |
| --- | --- | --- |
| Data format | Text (JSON) | Binary (protobuf) |
| Speed/size | Normal | Fast, small |
| Typing | Loose (matched by hand) | Generated from schema (strict) |
| Bidirectional streaming | Weak | Strong |
| Ease for humans to poke at | High (visible with curl) | Low (needs dedicated tools) |

> 🧭 gRPC is a first-class citizen in both Go and .NET. You can generate code for both languages from a single protobuf definition, and the real strength is that **even services written in different languages can communicate with matched types**.

## Resolve internal targets by service name

The destination for internal traffic is resolved [by service name](/en/posts/container-network-and-data/).
[IPs get swapped out](/en/posts/ip-address-and-cidr/), but names don't change — so this holds up well against scaling and restarts.

```text
Public API (BFF) ──(gRPC, connect by service name)──▶ Internal service:50051
        ▲ on the LB (public)                            internal-only, not on the LB
```

- Internal services don't go through an LB; you connect directly via service discovery (name → current IP)
- They listen on a dedicated internal port (e.g., 50051)

## When to use which

- **Public boundary (poked by people or browsers)**: REST/HTTP plus [status codes](/en/posts/http-status-codes/). Easy and simple to debug
- **Internal (service to service)**: gRPC. Type-safe, fast, over a closed network

## Summary

- Split communication into a **public boundary** and **internal communication**. Keep the internal side off the outside world
- **gRPC** is typed RPC over HTTP/2 + protobuf. Fast, strict, and strong at bidirectional streaming (but awkward for humans to poke at)
- Keep the internal side off the LB and connect directly by **resolving service names** (robust against IP changes)
- Rule of thumb: **public = REST/HTTP, internal = gRPC**
- Even across languages, protobuf lets you match types

**Related:** [Container Networking and Data](/en/posts/container-network-and-data/) / [Ports and TCP](/en/posts/ports-and-tcp/) / [AWS Compute (Service Connect)](/en/posts/aws-compute-explained/)
