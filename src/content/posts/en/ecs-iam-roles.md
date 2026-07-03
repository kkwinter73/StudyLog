---
title: "IAM Role Design for Containers — Separate the Execution Role and the Task Role"
date: 2026-06-26T17:00:00
summary: "Permissions on a container platform split into two layers: the \"execution role\" the platform uses to run the container, and the \"task role\" the app uses to call other services. Don't conflate them — assign each service least privilege."
tags: ["AWS", "セキュリティ", "コンテナ"]
level: intermediate
lang: en
translationKey: ecs-iam-roles
---

Run a container in the cloud and [IAM](/en/posts/aws-security-config-explained/) permissions show up in **two flavors**:
"permission for the platform to launch the container" and "permission for the app to call other services."
Conflate the two and permissions tend to balloon. Let's nail down the difference in roles and how to grant least privilege.

## The Two Roles

Both attach to the same container, but they differ in **whose permission it is**.

| Role | Who uses it | What it's for | Shared or per-service |
| --- | --- | --- | --- |
| Execution role | **The platform** (the container-launch machinery) | Pulling the image, emitting logs | Usually fine to share |
| Task role | **The app itself** (the running code) | Calling other services ([S3](/en/posts/aws-data-stores-explained/) / [SQS](/en/posts/aws-messaging-explained/), etc.) | Split per service |

## Execution Role = For the Platform to Run the Container

The permission used by the platform side that launches the container. Your app code never uses it.

- [Pull the image from the registry](/en/posts/registry-and-compose/)
- Write to the log destination (CloudWatch Logs, etc.)

Since the work is the same everywhere, **sharing it across multiple services causes few problems** (the contents are identical).

## Task Role = For the App to Call Other Services

The permission the running app code carries. This is where **each service needs something different**.

- A service that stores images needs only read/write to a specific bucket
- A service that consumes a queue needs only receive on that queue

> ⭐ That's why you **split the task role per service and keep it least privilege**.
> Share one "everything included" role and a breach of one service becomes a breach of all permissions.

## Keys to Least Privilege

- **Avoid blanket grants (wildcards)** like `s3:*` or `sqs:*`; narrow to just the operations and resources you use
- Don't give receive permission to a service that only sends messages (if send and receive are separate services, use separate roles)
- **Don't write permissions you don't use** (e.g., no decrypt permission if you don't use the encryption key)

> 🧭 Declaring "what resources may be touched" per app is the basis of [least privilege](/en/posts/aws-security-config-explained/).
> Enumerate "what does this service call" and you naturally end up with only the permissions you need.

## Summary

- Container permissions come in **two layers: the execution role (for the platform)** and the **task role (for the app)**
- The **execution role** is image pull and log output. It's common, so sharing is fine
- The **task role** is permission for what the app calls. **Split it per service and keep it least privilege**
- Avoid blanket grants like `s3:*`; narrow to just the operations and resources you use
- Don't write permissions you don't use (like decrypt). Keep the blast radius small

Next steps: Enumerate the external resources your service actually calls, and check whether the task role has grown over-permissioned.
