---
title: "Protobuf — Schema-First Binary Serialization"
date: 2026-07-15T17:00:00
summary: "Protobuf (Protocol Buffers) is a binary serialization format where you define your data's types in a .proto and generate code. It's smaller and faster than JSON, typed, and cross-language. It's the base for gRPC but works standalone. Here's the difference from JSON, writing a .proto and why only numbers travel on the wire, schema evolution with field numbers as the star, and caveats like not being human-readable."
tags: ["ネットワーク", "アーキテクチャ"]
level: intermediate
lang: en
translationKey: protobuf
---

**Protobuf (Protocol Buffers)** is Google's **schema-first binary serialization format**.
You declare your data's types in a `.proto` file and **generate** code for each language. It's famous as the base for [gRPC](/posts/grpc-vs-rest/),
but it also works as a standalone data format. This post focuses not on gRPC but on **Protobuf as a "way to pack data."**

## Why Protobuf — the difference from JSON

The use is the same as JSON: "passing structured data around." But the character differs a lot.

| | JSON | Protobuf |
| --- | --- | --- |
| Format | text | **binary** |
| Size | large (key names sent every time) | **small** (only numbers sent) |
| Speed | slower | **fast** |
| Human-readable | yes | no (needs the `.proto`) |
| Schema | optional (can send without one) | **required** (`.proto`) |
| Cross-language | up to the parser | **typed via code generation** |
| Evolution | loose (fragile) | **strictly managed by number** |

> ⭐ Protobuf's strengths are "**small, fast, typed**." The costs are "not human-readable, schema required."
> Use it where speed and types pay off (internal services, high-volume traffic); JSON suits APIs humans read directly. That's the split.

## Write a `.proto` and generate code

First declare the types in a `.proto`. Each field gets a **number**. This is the most important part.

```proto
syntax = "proto3";

message User {
  int32           id    = 1;   // 1,2,3… are field numbers (the wire identifiers)
  string          name  = 2;
  repeated string roles = 3;   // repeated = array
}
```

Compile this `.proto` with `protoc` and it **generates typed classes/structs** for Go and other languages. You don't hand-write them.

```text
What flows on the wire is "number 2 → "Alice"", not the string "name"
   → that's why it's small. But reconstructing it needs the .proto (the number↔name mapping)
```

> 🧭 In Go it's `protoc` + `protoc-gen-go`; in .NET, `Grpc.Tools` generates code from the `.proto`.
> Both share the point that "**the `.proto` is the single source of truth, and code is a generated artifact**." Not editing the artifact is the same idea as [this blog's posts](/posts/single-source-of-truth/).

## Schema evolution — field numbers are the star

What makes Protobuf strong in practice is that you can **grow the schema without breaking it**. The key is the field **number**.

- **Adding is OK**: add a new field with a **new number**. Old code **ignores** numbers it doesn't know (forward compat). New code reads a **default** when it's absent (backward compat)
- **Don't reuse a number**: repurposing a used number makes old data misread. Seal retired numbers with `reserved`
- **Renaming is safe**: only numbers are on the wire, so **as long as you keep the number, you can change the field name**
- **Changing a type is generally not OK**: an incompatible type change breaks the data

> 💡 This is the same idea as [DB schema migration's expand-contract](/posts/db-schema-migration-expand-contract/) — **add while keeping backward compat, and seal the old.**
> By tying meaning to an immutable ID (the number), old and new code can safely read the same data.

## Caveats

- **Not human-readable**: being binary, debugging needs dedicated tools or the `.proto`. Dumping it raw in logs tells you nothing
- **The `.proto` must be shared**: sender and receiver need the **same schema** (schema coupling). Make distribution and versioning a mechanism
- **proto3 defaults**: by default a scalar doesn't distinguish "unset" from "zero value." To distinguish, add `optional` to give it presence
- **Number discipline is vital**: misnumbering or reusing numbers is the top source of incidents. Review `.proto` strictly

## Summary

- Protobuf is **schema-first binary serialization**. Define types in a `.proto` and **generate code** (the base for gRPC, but usable standalone)
- Versus JSON it's **small, fast, typed** — but **not human-readable and schema-required**. Use it where speed and types pay off
- Only **field numbers** travel on the wire (names aren't sent). Hence it's small, and reconstruction needs the `.proto`
- Schema evolution has the **number as the star** — adding is OK, **reusing a number is not**, renaming is fine. Same idea as expand-contract
- Caveats: **readability, schema sharing, proto3 defaults, number discipline**. Manage the `.proto` strictly as the source of truth

**Related:** [gRPC and REST](/posts/grpc-vs-rest/) / [Internal Service Communication and gRPC](/posts/internal-service-grpc/) / [DB Schema Migration (expand-contract)](/posts/db-schema-migration-expand-contract/) / [Single Source of Truth](/posts/single-source-of-truth/)
