---
title: "How SMS Notifications Work and What They Cost — Why You Pay Per Message"
date: 2026-07-10T13:00:00
summary: "SMS reaches almost any phone with no app required, but you pay per message. Here's the four-party mechanism (app → delivery API → carrier network → device), how to send with Twilio and friends, and the cost structure — segments, number types, A2P registration fees — that decides 'how much per message.' Plus deliverability, regulation, and when to use SMS vs push."
tags: ["ネットワーク", "アーキテクチャ"]
level: intermediate
lang: en
translationKey: sms-notifications
---

[Push notifications](/posts/push-notifications/) only reach devices that installed your app. **SMS**, by contrast,
reaches **almost any phone with no app required** —— which is why it's the go-to for OTPs (one-time passwords) and critical alerts.
The decisive difference: **you pay per message.** Let's cover the mechanism, how to send, the **cost structure** that
decides "how much per message," deliverability and regulation, and when to use SMS vs push.

## The mechanism — from app to carrier network

You can't send from your server to the device directly. An **SMS provider (CPaaS/aggregator)** sits in the middle — a four-party relay.

```text
① App server ─API─▶ ② SMS delivery API ─link─▶ ③ Carrier (SMSC) ─▶ ④ Device
 (your backend)      (Twilio, etc.)             (each telco's switch)
```

- **② The provider** (Twilio / Vonage / AWS SNS, etc.) **bundles and brokers** connections to carriers worldwide
- **③ The SMSC** (Short Message Service Center) stores and forwards the message on the carrier side
- Contracting directly with carriers is heavy, so going through a CPaaS is the practical norm

> 💡 It closely mirrors push's [four-party model](/posts/push-notifications/). The difference is the counterpart isn't an
> "OS push service" but the **carrier's phone network** — so it reaches any phone number, app or not.

## Sending — fire one message via API

Sending itself is just "POST the destination number, sender, and body to the delivery API." A Twilio-style example in Go:

```go
form := url.Values{
    "To":   {"+819012345678"}, // E.164 format (with country code)
    "From": {"+815012345678"}, // sender number or sender ID
    "Body": {"Your verification code is 123456"},
}
resp, err := http.PostForm(endpoint, form) // in practice add Basic auth, etc.
```

- Pass the destination in **E.164** (the international `+81…` form)
- Sending only means "accepted." Whether it **actually arrived** comes later via the provider's **Webhook (delivery report / DLR)**
- Handle arrival like the [webhook endpoint](/posts/webhook-implementation/): receive it asynchronously and reconcile

> 🧭 In .NET, use Twilio's official SDK or **Azure Communication Services (SMS)**. In Go, an SDK or direct HTTP.
> Either way, the two-stage "send = accepted, arrival = follow-up via Webhook" is the same.

## Cost structure — what decides "how much per message"

SMS's defining trait is **usage-based billing**. Not knowing what sets the unit price means surprises on the invoice.

| Factor | What it means |
| --- | --- |
| **Segment count** | 160 GSM chars (Japanese or emoji: **70 chars**) per message. Over that, it splits and the **count grows** |
| **Destination country/carrier** | Unit price varies hugely by country. Japan is pricier than, say, the US |
| **Number type** | Long code / short code / sender ID (alphanumeric name) differ in both cost and deliverability |
| **Registration fees** | Schemes like US A2P 10DLC charge **setup/monthly fees** to pre-register the brand and use case |

- **Body length** matters. Japanese is 1 segment per 70 chars, so long text **directly raises the count (= cost)**
- **Sender IDs** (alphanumeric "from" names) are heavily restricted in Japan and the US — often unusable or requiring review
- Short codes offer high throughput but **high setup/monthly fees**. Depends on the use case, e.g. mass OTP sending

> ⚠️ Estimating from "X per message" alone misses the mark. Real cost is **segment splitting + per-country rates + fixed fees for numbers/registration** combined.
> In particular, don't forget **Japanese bodies are chunked at 70 chars**.

## Deliverability and regulation — sending doesn't mean arriving

Being on the phone network, SMS is **heavily regulated**. Break the rules and you get blocked or your number suspended.

- **Opt-in required**: don't send without consent. Also provide **opt-out (unsubscribe via STOP, etc.)**
- **Identify the sender**: to fight spoofing and phishing, sender/use-case registration and review are tightening in every country
- **Filtering**: heavy URLs or spammy wording can be **silently blocked** by carriers (the send may look successful yet not arrive)
- **Timing/frequency**: avoid late-night sends and bursts, for both regulation and user experience

> ⭐ For SMS, "send success" and "arrival" are separate. Receive the DLR (delivery report) to **measure actual arrival**
> and surface unreachable numbers/carriers. Like push, build on the assumption that **delivery isn't guaranteed**.

## SMS vs push

Push is free and repeatable; SMS is reliable but paid. **Choose by role.**

| | SMS | Push |
| --- | --- | --- |
| Prerequisite | Phone number only (no app) | App/browser registration required |
| Cost | **Per message** | Nearly free |
| Reach | Almost any device, high open rate | Doesn't reach non-installers |
| Good for | OTP, critical alerts, verification | In-app news, re-engagement |

- The **one time you'll pay to guarantee delivery** (verification codes, payment confirmation) → SMS
- **Repeated free touchpoints** (campaigns, update notices) → push
- In practice, **combine them** (SMS for critical, push for routine, fall back to email if SMS doesn't land)

## Summary

- SMS is a four-party relay: **app → delivery API → carrier network → device**. It reaches with **just a phone number, no app**
- Sending is just a POST to the API. **Arrival is followed up via Webhook (DLR)** — send success ≠ arrival
- Cost is **usage-based**. **Segments (70 chars in Japanese), per-country rates, number type, registration fees** set the price
- Being on the phone network, it's **heavily regulated**. Honor opt-in, opt-out, and sender registration
- **SMS for the reliable one-shot, push for free repetition.** Choose by use case and design a fallback

**Related:** [How Push Notifications Work](/posts/push-notifications/) / [Implementing Webhooks](/posts/webhook-implementation/) / [WebSocket / SSE](/posts/websocket-and-sse/)
