---
title: "Really Understanding AWS ④: Messaging and Async"
date: 2026-06-20T03:00:00
summary: "Starting from the idea of deferring heavy work with 'async', understand what queues (SQS), notifications (SNS), the event bus (EventBridge), and email (SES) each solve."
tags: ["AWS", "クラウド", "メッセージング"]
level: beginner
lang: en
translationKey: aws-messaging-explained
---

> 📚 Series "Really Understanding AWS" (4 / 6)

As the number of services grows, having them all "call each other directly" starts to hurt. Here we sort out the idea of **async** and the four services that support it.

## Why do we need async?

If you do all the heavy work (sending email, converting images, aggregating data) inside a single request, it becomes **slow and fragile**. So instead you go "**just accept the request and return immediately, do the work later**." That's async.

```text
Sync:  user →[accept ~ finish all heavy work]→ reply (slow)
Async: user →[accept, reply immediately]            (fast)
                    └→ run the heavy work in the background
```

## SQS = a waiting line that stores work (a queue)

**SQS** is a waiting line that stores work in order. The sender puts a job into the queue and finishes immediately; the receiver pulls it out and processes it later. It can absorb sudden bursts of requests and handle them at its own pace, and the sender and receiver are **not directly connected (loosely coupled)**. Think of it like the order tickets at a restaurant.

## SNS = broadcast to many (pub/sub notifications)

**SNS** takes one event and **delivers it to multiple destinations at once** (fan-out). When you publish to a topic, it reaches everyone who is subscribed. Think of a public-address announcement or a mailing list.

> 💡 A classic combination is **SNS → SQS**. SNS distributes to multiple teams, and each team receives it in its own SQS and processes it at its own pace. It's "distribute" and "store" working together.

## EventBridge = an event bus that routes by conditions

**EventBridge** is a mechanism that uses rules to route "**when a certain event happens, where should it be sent**." It can do smarter routing than SNS, and it can also handle **scheduled execution (cron-like schedules)**.

| | Role |
| --- | --- |
| SQS | **Stores** work |
| SNS | **Broadcasts** the same notification at once |
| EventBridge | **Routes** events by conditions / scheduled execution |

## SES = a service dedicated to sending email

**SES** is a service for **sending** confirmation emails and notification emails. Rather than embedding SMTP directly in your app, you can leave deliverability and management to it.

## Summary

- Heavy work is faster and more robust when you "just accept the request and process it later" = async
- SQS is a waiting line that stores work (loose coupling, buffering)
- SNS broadcasts the same notification at once (fan-out); SNS→SQS is the classic pattern
- EventBridge routes events by conditions + scheduled execution
- SES is a service dedicated to sending email

Next time: the "security and configuration management" edition that protects the whole thing.

**← Prev:** [③ Where to Store Data](/en/posts/aws-data-stores-explained/)
**→ Next:** [⑤ Security and Configuration Management](/en/posts/aws-security-config-explained/)
