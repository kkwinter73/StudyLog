---
title: "How Email Notifications Work and Deliverability — SPF / DKIM / DMARC to Stay Out of Spam"
date: 2026-07-10T14:00:00
summary: "Email is something everyone has, nearly free, and rich. But the hardest part is landing in the inbox rather than spam. Here's the mechanism (app → delivery service → receiving MTA → inbox), how to send via API, and the core of deliverability — SPF / DKIM / DMARC authentication, bounce/complaint handling, and sender reputation. Plus when to use email vs push vs SMS."
tags: ["ネットワーク", "アーキテクチャ"]
level: intermediate
lang: en
translationKey: email-notifications
---

The third notification article after [push](/posts/push-notifications/) and [SMS](/posts/sms-notifications/). **Email**
is something everyone has an address for, and you can send **rich bodies nearly for free**. But the hardest part isn't "sending" —
it's **landing in the inbox rather than spam**. That's **deliverability**. Let's cover the mechanism, how to send, and the core of
deliverability: **SPF / DKIM / DMARC** authentication, bounce handling, and reputation.

## The mechanism — from app to inbox

You *can* send straight from your own server, but in practice you go through an **email delivery service (ESP)** — a four-party relay.

```text
① App server ─API─▶ ② Delivery service ─SMTP─▶ ③ Receiving MTA ─▶ ④ Inbox
 (your backend)      (SendGrid/SES, etc.)       (Gmail's receiving server, etc.)
```

- **② The ESP** (SendGrid / Amazon SES / Postmark, etc.) **handles** sending-IP reputation, authentication, and bounce processing
- **③ The receiving MTA** (Gmail, etc.) checks authentication and reputation to decide **inbox vs spam**
- Sending via your own SMTP means growing IP reputation from scratch, so routing through an ESP is the norm

> 💡 It's the same four-party model as push/SMS, but the decisive difference is that **the receiving side decides, at its discretion, whether to accept and where to file it.**
> "Send success" and "landed in the inbox" are different things, and deliverability is about closing that gap.

## Sending — fire one message via API

Rather than speaking SMTP directly, using the ESP's **HTTP API** is easier and faster. A SendGrid-style example in Go:

```go
body := map[string]any{
    "personalizations": []any{map[string]any{
        "to": []any{map[string]string{"email": "user@example.com"}},
    }},
    "from":    map[string]string{"email": "noreply@myapp.com"},
    "subject": "Your password was changed",
    "content": []any{map[string]string{"type": "text/plain", "value": "..."}},
}
// POST the JSON with Authorization: Bearer <API key>
```

- Sending is "accepted." **Bounces, complaints, opens, clicks** are followed up by the ESP via **Webhook (event notifications)**
- Handle the endpoint like [implementing webhooks](/posts/webhook-implementation/): receive asynchronously, record, reconcile
- Send bulk **through a queue** to control the rate (blasting all at once hurts reputation)

> 🧭 .NET's old `SmtpClient` is deprecated. Use the **SendGrid SDK** or **Azure Communication Services (Email)**.
> Go too uses an SDK or direct HTTP. Either way, the two-stage "send = accepted, results via Webhook" is the same.

## The core of deliverability — SPF / DKIM / DMARC

The trio the receiving side uses to verify "is this a real sender, not a spoof." **All go in DNS.** Skip them and you go straight to spam.

| Mechanism | What it proves | Where it lives |
| --- | --- | --- |
| **SPF** | The **domain owner authorizes** sending from that IP | DNS TXT (list of allowed IPs) |
| **DKIM** | The body is **untampered** and the domain signed it | DNS public key + signature in the mail |
| **DMARC** | **How to treat** SPF/DKIM failures + reporting | DNS TXT (`p=none/quarantine/reject`) |

- **SPF** declares, by IP, which servers may claim the sender domain
- **DKIM** signs with a private key; the receiver verifies with the DNS public key (detects tampering and spoofing)
- **DMARC** looks at the two results plus **alignment with the From-header domain** and dictates the action on failure (quarantine/reject)

> ⚠️ When using an ESP, if you don't **set DKIM/SPF on your own domain**, mail arrives under the ESP's domain name, hurting both delivery and trust.
> Recently Gmail/Yahoo have effectively **required DMARC** for senders above a volume. Set this up first, always.

## Bounces, complaints, and reputation

Even with authentication passing, a poor **sender reputation** keeps you out of the inbox. Reputation is decided by feedback.

- **Bounces**: undeliverable. **Hard** (nonexistent address = permanent) and **soft** (temporary). Remove hard bounces from the list **immediately**
- **Complaints**: the recipient's "spam" button. Reported via FBL (feedback loop); **too many and reputation crashes**
- **List hygiene**: keep sending to invalid/unconsented addresses and reputation drops. Keep quality with **double opt-in**
- **Unsubscribe**: include `List-Unsubscribe` (one-click). Easy unsubscribing reduces complaints
- **Dedicated IP warm-up**: ramp a new sending IP from low volume gradually to build reputation

> ⭐ Deliverability isn't "set once and done" — it's **operations**. Don't let hard bounces pile up, monitor complaint rate,
> send only to consented addresses. That's the only way to protect reputation and keep landing in the inbox.

## Email vs SMS vs push

The three channels differ in role by **cost, immediacy, and richness**.

| | Email | SMS | Push |
| --- | --- | --- | --- |
| Cost | Nearly free | Per message | Nearly free |
| Immediacy / open | Slower, may go unseen | Fast, high open | Fast (installers only) |
| Expressiveness | **Rich (HTML/attachments)** | Short text only | Short text + simple data |
| Good for | Receipts, notices, long content | OTP, critical alerts | In-app re-engagement |

- **On-the-record / long content** (receipts, reports, terms changes) → email
- **Reliable right now** → SMS; **free repeated touchpoints** → push
- In practice, **combine + fall back** (critical: SMS → email if it fails; routine: push → email if unread)

## Summary

- Email is a four-party relay: **app → delivery service → receiving MTA → inbox**. The hard part isn't "sending" but **deliverability**
- Send via API POST; **results (bounces/complaints/opens) come via Webhook**. Send success ≠ inbox arrival
- The core of deliverability is setting **SPF, DKIM, DMARC** on **your own domain's DNS**. Skip them and you go straight to spam
- Protect reputation with **bounce removal, complaint monitoring, opt-in, and warm-up** — this is operations itself
- **Rich/on-the-record → email, the reliable one-shot → SMS, free repetition → push.** Choose by use case and design fallback

**Related:** [How Push Notifications Work](/posts/push-notifications/) / [How SMS Notifications Work and What They Cost](/posts/sms-notifications/) / [Implementing Webhooks](/posts/webhook-implementation/)
