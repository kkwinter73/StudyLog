---
title: "Using Linux Properly, Part 6: SSH Connections and Key Authentication"
date: 2026-06-22T14:00:00
summary: "How SSH lets you log into remote servers securely, and its core mechanism—public key authentication. Covers generating keys, connecting, ~/.ssh/config, and permission gotchas, laying the groundwork for connecting to EC2."
tags: ["Linux", "セキュリティ", "基礎"]
level: beginner
lang: en
translationKey: ssh-and-key-auth
---

> 📚 Series: "Using Linux Properly" (6 / 6)

**SSH** is the standard way to log into remote servers like [EC2](/en/posts/aws-compute-explained/).
Let's wrap up the series by looking at its star player—**public key authentication**—along with how to actually connect and the pitfalls you'll hit.

## What is SSH?

SSH lets you securely log into a remote machine over an **encrypted connection** and run commands.

```bash
ssh alice@203.0.113.10        # connect to that IP as user alice
ssh -i ~/.ssh/mykey.pem ec2-user@<EC2 IP>   # connect specifying a key file
```

Because the traffic is encrypted, even if someone intercepts it, they can't read the contents. The real question is "**how do we verify you're really you?**"—and this is where **public key authentication**, safer than passwords, comes in.

## How public key authentication works

You create a key as a pair: a **private key (kept on your machine)** and a **public key (placed on the server)**. The two correspond mathematically.

| Key | Where it lives | Role |
| --- | --- | --- |
| Private key | **Only on your machine** (never hand it over) | Proves you are who you claim to be |
| Public key | The target server (`~/.ssh/authorized_keys`) | Verifies whether it matches the private key on your machine |

> 💡 Think "public key = padlock, private key = the key that opens it." You can distribute as many padlocks (public keys) to servers as you like, but only you hold the key (private key) that opens them. That's how you can prove your identity without ever sending a password.

When you connect, the server uses the public key to check "does this party hold the matching private key?" The safe part is that the private key itself never travels over the network.

## Creating a key and connecting

```bash
# 1. Generate a key pair (ed25519 is the current recommendation)
ssh-keygen -t ed25519 -C "alice@example.com"
#   → creates ~/.ssh/id_ed25519 (private key) and id_ed25519.pub (public key)

# 2. Register the public key on the server
ssh-copy-id alice@203.0.113.10
#   (manually: append the contents of .pub to ~/.ssh/authorized_keys on the server)

# 3. From now on you can log in with just the key
ssh alice@203.0.113.10
```

> 🧭 On EC2 you specify a key pair at launch, and AWS registers the public key on the instance for you. You then use the `.pem` (private key) you downloaded via `ssh -i key.pem ec2-user@...`.

## ~/.ssh/config and the gotchas

Once you have more hosts to connect to, give them names in `~/.ssh/config` so you can log in with just `ssh <name>`.

```text
Host myec2
    HostName 203.0.113.10
    User ec2-user
    IdentityFile ~/.ssh/mykey.pem
```

```bash
ssh myec2     # connects using the config above
```

> ⚠️ **If the private key's permissions are too loose, SSH refuses to connect** (because it's dangerous for others to be able to read it). Set it with `chmod 600 ~/.ssh/mykey.pem`. This is where [last time's permissions](/en/posts/linux-filesystem-and-permissions/) come into play.

## Summary

- SSH is the standard way to **log into a remote machine over an encrypted connection** (EC2 connections use it too)
- The star of authentication is **public key authentication**: the private key stays on your machine, the public key goes on the server
- The private key never travels over the network—that's why it's safer than a password
- Generate keys with `ssh-keygen`, register the public key in `authorized_keys`, and log in with the key from then on
- Name your connections in `~/.ssh/config`. And the **private key must be `chmod 600`** or you'll be refused

**← Prev:** [Part 5: Shell Environment and Scripting](/en/posts/shell-env-and-scripting/)

That completes the "Using Linux Properly" series. Combined with the OS fundamentals (from the kernel to memory), topics like [containers](/en/posts/kernel-role-for-containers/) and [deployment](/en/posts/deploying-go-apps/) should now feel far more grounded.
