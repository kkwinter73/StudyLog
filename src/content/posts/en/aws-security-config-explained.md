---
title: "Really Understanding AWS #5: Security and Configuration Management"
date: 2026-06-20T02:00:00
summary: "IAM (permissions), Secrets Manager / Parameter Store (secrets and config), SSM (operations), KMS (encryption keys), and WAF (defense). Understand them all through one shared idea: don't hold keys, don't write secrets, encrypt."
tags: ["AWS", "クラウド", "セキュリティ"]
level: beginner
lang: en
translationKey: aws-security-config-explained
---

> 📚 Series: "Really Understanding AWS" (5 / 6)

This is the foundation for using everything so far safely. It looks scattered, but at the root it boils down to three ideas: **don't hold keys, don't write secrets in code, and encrypt.**

## IAM = a permit for who can do what

**IAM** is the heart of AWS security. It defines "who can do what to which resource" through **policies**. The guiding principle is **least privilege** (allow only the operations you actually need).

The key concept is **roles**. Instead of handing an app a fixed key, you assign it a role, and the **SDK automatically fetches temporary credentials**. That's how "don't hold keys" is realized.

> ⚠️ Never write access keys in your code or commit them to Git. Assign IAM roles to EC2 / ECS / Lambda.

### IAM Identity Center = one place for human logins

Whereas IAM centers on "permissions for apps and services," **Identity Center** bundles **human logins** — it's SSO plus multi-account management. It lets employees sign in once and reach whatever accounts they need.

## Where to store secrets and config

A place to keep config values and secrets **out of your code and passed in from outside.**

| | What goes here | Characteristics |
| --- | --- | --- |
| **Secrets Manager** | Confidential data like DB passwords | Supports automatic rotation |
| **Parameter Store** | Config values and minor secrets | Cheap (part of SSM) |

> 🧭 When in doubt — "confidential + needs auto-rotation → Secrets Manager"; "just a config value, keep it cheap → Parameter Store."

## SSM = a toolbox for server operations

**SSM (Systems Manager)** is a collection of operational tools. The standout is **Session Manager**, which lets you **get into a server safely without SSH keys** (no more bastion hosts or key management). It also handles things like patching.

## KMS = managing encryption keys

**KMS** **securely manages the keys themselves** that encrypt your data. It's used for encrypting S3 and RDS. In the dev setup here, we **don't use a CMK (a custom key you manage yourself)** and get by with AWS-managed keys.

## WAF = blocking web attacks at the door

**WAF (Web Application Firewall)** **blocks web-application-layer attacks at the entrance**, such as SQL injection and XSS. In the dev setup here it's **not adopted** (it's the kind of thing you'd consider for production).

## Summary

- The common thread is "don't hold keys, don't write secrets, encrypt"
- IAM is a permit for permissions; assign roles to apps so they don't hold keys
- Identity Center bundles human logins (SSO)
- Confidential data goes in Secrets Manager, config values in Parameter Store
- SSM is an ops toolbox (keyless connections and more); KMS manages encryption keys (dev uses no CMK)
- WAF blocks web attacks at the door (not adopted in dev)

The final installment covers the "operations" side: image management, monitoring, and cost.

**← Prev:** [#4 Messaging and Asynchronous Processing](/en/posts/aws-messaging-explained/)
**→ Next:** [#6 Image Management, Operations, and Monitoring](/en/posts/aws-ops-explained/)
