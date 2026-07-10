---
title: "How Push Notifications Work — Why a Closed App Still Gets Them"
date: 2026-07-10T10:00:00
summary: "Push notifications reach an app even when it's closed or the device is asleep, thanks to a four-party model: a single persistent connection the OS holds and a push service (APNs/FCM/Web Push). Here's the mechanism, the tokens, the sender-side implementation, and the key design lesson — delivery is not guaranteed."
tags: ["ネットワーク", "アーキテクチャ"]
level: intermediate
lang: en
translationKey: push-notifications
---

[WebSocket / SSE](/posts/websocket-and-sse/) was about pushing from the server *while a connection is open*.
Push notifications go one step further —— they arrive **even when the app is closed or the device is asleep**.
How is that possible? The key is a persistent connection **the OS holds just once**, and the **push service**
on the other end. Let's cover the mechanism, registration tokens, the sender-side implementation, and the design gotchas.

## The four-party model — who hands off to whom

You don't send push notifications **directly** from your server to the device. A **push service** sits in the middle — a four-party relay.

```text
① App server ─send request─▶ ② push service ─persistent conn─▶ ③ OS/browser ─▶ ④ App
 (your backend)              (APNs/FCM/…)        (holds just one)    (show or wake)
```

- **③ The OS holds a single persistent connection** to the push service. Apps don't each open their own TCP connection
- So even when the app has **quit**, the OS receives the message and can show the notification or wake the app
- The OS **multiplexes** every app's notifications over that one connection, saving battery and connections

> 💡 That's the answer to "why does a closed app still get them." It's not the app — **the OS is awake and waiting**.
> That's fundamentally different from WebSocket, where the app owns the connection itself.

## The main channels — APNs / FCM / Web Push

The push service you talk to is fixed per platform. The sender calls each one's API.

| Channel | Target | Auth | Destination identifier |
| --- | --- | --- | --- |
| **APNs** | iOS / macOS | JWT (.p8 key) or certificate | device token |
| **FCM** | Android / iOS / Web | OAuth2 (service account) | registration token |
| **Web Push** | Browsers | VAPID keys | subscription (endpoint URL + keys) |

- **FCM** acts as a front door and **relays** to APNs for iOS and to Web Push for browsers. Standardizing on FCM first is the easy path
- **Web Push** is a W3C standard; the browser's **Service Worker** receives the push even with the page closed
- Both APNs and FCM expose an **HTTP/2**-based send API

> 🧭 In .NET, Azure **Notification Hubs** abstracts over APNs/FCM/Web Push (distinct from SignalR — this one targets
> "closed apps"). In Go, using each vendor's SDK or calling the HTTP API directly is the norm.

## Registration and tokens — how the destination is decided

Before you can send, the **device has to identify itself**. That address is the token / subscription.

```text
1. On launch, the app registers with the OS/browser: "I want to receive push"
2. The push service issues a unique token (the address)
3. The app sends that token to its own app server to store
4. From then on, the server issues send requests to that token
```

- A token is **per device/app, not per user**. One user with several devices means several tokens
- A Web Push subscription includes **encryption keys** (`p256dh`/`auth`) alongside the endpoint; the body is encrypted with them
- Sending always requires the **user's permission** (the browser/OS consent dialog). If denied, you can't send

## The sender side — keep the payload a "signal"

Sending itself is just "POST token + payload to the push service." Here's an FCM example in Go:

```go
// firebase.google.com/go/v4/messaging
msg := &messaging.Message{
    Token: deviceToken,
    Notification: &messaging.Notification{
        Title: "New message",
        Body:  "You have a reply from Tanaka",
    },
    Data: map[string]string{"threadId": "42"}, // extra data the app uses
}
_, err := client.Send(ctx, msg) // handles HTTP/2 + OAuth2 inside
```

- **Payloads are small** (roughly a 4KB cap for APNs/FCM/Web Push). Don't stuff the body in
- Treat a notification as a **signal that "something new arrived"**; have the app fetch the actual content from the server after launch
- Be deliberate about `Notification` (the OS shows it automatically) vs `Data` (the app handles it itself)

> ⚠️ The payload **passes straight through** the push service (a third party). Assume APNs/FCM can read the body —
> never put passwords or personal data in it. Web Push is end-to-end encrypted, but even then keep it minimal.

## Design gotchas — don't build as if delivery is a given

The biggest trap with push is that **delivery is not guaranteed**. Only once you accept that do you get a robust design.

- **Best effort**: push services delay, drop, and collapse messages to sleeping devices. Neither immediacy nor arrival is guaranteed
- **Token expiry**: reinstalls and expiration change the token. Watch for `unregistered` in send responses and **prune dead tokens**
- **Collapsing**: fold same-kind notifications into **the latest one** with a collapse key. Don't bury the user under a burst
- **Priority and battery**: high priority can wake the device, but overuse gets throttled. Reserve it, use normal priority otherwise
- **Silent push**: data-only notifications sync in the background with no UI, but the OS **rate-limits** them hard
- **The source of truth is your own DB**: the notification is a supplementary signal. Even if one is lost, a sync on app launch must always catch up

> 💡 Not "process it when the push arrives," but "**push only speeds up awareness**; the truth is the server sync."
> Same idea as reconciling against the source of truth in [implementing webhooks](/posts/webhook-implementation/).

## Summary

- Push is a four-party relay: **app server → push service → OS → app**. The **single persistent connection the OS holds** reaches even closed apps
- The channels are **APNs / FCM / Web Push**. Standardizing on **FCM** first spans iOS/Android/Web most easily
- The destination is a per-device **token / subscription** — it requires the user's **permission** and it expires
- The payload is a ~4KB **signal**. Keep secrets out; fetch the content from the server after launch
- **Delivery isn't guaranteed.** Prune dead tokens, use collapsing and priority, and keep **the source of truth in your own DB**

**Related:** [WebSocket / SSE](/posts/websocket-and-sse/) / [Implementing Webhooks](/posts/webhook-implementation/) / [The Evolution of HTTP Versions](/posts/http-versions-evolution/)
