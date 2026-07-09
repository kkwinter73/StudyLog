---
title: "Communication Behind the Web ④: Anatomy of an HTTP Message"
date: 2026-07-09T19:30:00
summary: "HTTP is, in the end, just an exchange of text. Break requests and responses into 'start line, headers, body,' and pin down the roles of the methods and the key headers."
tags: ["ネットワーク", "基礎"]
level: beginner
lang: en
translationKey: http-message-anatomy
---

> 📚 Series "Communication Behind the Web" (4 / 10)

At the end of the previous [request's journey](/en/posts/how-a-web-request-travels/), once the path is open, the
**HTTP message** itself flows — so let's open it up. HTTP is no special magic; it's text in a fixed shape:
**start line, headers, blank line, body.** Once you can read this, debugging APIs and reading the browser dev tools
both get far easier. For what the status codes mean, see the [HTTP status article](/en/posts/http-status-codes/).

## The basic shape of a message

Requests and responses share the same structure. Only the first line (the start line) differs by role; the rest is common.

```http
<start line>
<Header-Name>: <value>
<Header-Name>: <value>
            ← blank line (the boundary between headers and body)
<body>
```

- **Start line**: for a request, "method path version"; for a response, "version status"
- **Headers**: any number of `Name: value` pieces of metadata
- **Blank line**: marks "end of headers" (required)
- **Body**: the actual data (JSON, HTML, image, …). Sometimes absent

## Example request

```http
POST /api/users HTTP/1.1
Host: example.com
Content-Type: application/json
Authorization: Bearer eyJhbGc...
Content-Length: 27

{"name":"kkwinter","age":30}
```

- Line 1 = **method `POST`** + **path `/api/users`** + version
- `Host` is required (so many sites can share one IP — it says which site the request is for)
- `Content-Type` is the body's format; `Content-Length` is its byte count

## Example response

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/users/42
Cache-Control: no-store

{"id":42,"name":"kkwinter"}
```

- Line 1 = version + **status `201 Created`** (meaning in the [status article](/en/posts/http-status-codes/))
- `Location` is where the newly created resource lives; `Cache-Control` governs caching

## Methods — "what you want to do"

If the path is "which resource," the method is "what you want to do to it." The common ones and their traits:

| Method | Meaning | Safe¹ | Idempotent² |
| --- | --- | --- | --- |
| GET | Retrieve | Yes | Yes |
| POST | Create / submit | No | No |
| PUT | Replace (full update) | No | Yes |
| PATCH | Partial update | No | No |
| DELETE | Delete | No | Yes |

¹ Safe = doesn't change server state　² Idempotent = same result no matter how many times you send it

> 💡 Idempotency is the crux of resend/retry design. Even on a flaky network, GET/PUT/DELETE can be resent safely.
> Making POST safe to resend is covered in [idempotency key implementation](/en/posts/idempotency-key-implementation/).

> 🧭 ASP.NET's `[HttpGet]`/`[HttpPost]` attributes, or Go's `r.Method == http.MethodPost` branch, are just looking at
> the method in this start line. The framework may differ, but the message on the wire is identical.

## A map of the key headers

There are many headers, but grouping them by role makes them easy to remember.

| Category | Examples | Role |
| --- | --- | --- |
| Content | `Content-Type`, `Content-Length` | Body's format / size |
| Auth | `Authorization`, `Cookie` | Who / state (detailed in [⑦](/en/posts/cookie-session-token/)) |
| Cache | `Cache-Control`, `ETag` | Whether it can be reused |
| Negotiation | `Accept`, `Accept-Language` | Desired format / language |
| CORS | `Origin`, `Access-Control-*` | Cross-origin permission (detailed in [⑧](/en/posts/cors-explained/)) |

## Summary

- An HTTP message is text in a fixed shape: **start line, headers, blank line, body**
- The start line is a request "method path version" or a response "version status"
- **Methods** express intent. GET/PUT/DELETE are idempotent, POST/PATCH are not → this drives retry design
- Headers read easily once **grouped by role**: content, auth, cache, negotiation, CORS
- `Host` is required (the destination that lets many sites share one IP)

**← Prev:** [③ How a Web Request Travels](/en/posts/how-a-web-request-travels/)
**→ Next:** [⑤ The Evolution of HTTP/1.1→2→3](/en/posts/http-versions-evolution/)
