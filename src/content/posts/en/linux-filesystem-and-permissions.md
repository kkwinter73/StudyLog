---
title: "Using Linux Properly ③: File Layout and Permissions"
date: 2026-06-22T17:00:00
summary: "What belongs in /etc, /var/log, /home, and /tmp. Plus how to read rwx permissions and use chmod/chown. Never wonder where config lives or where logs go again."
tags: ["Linux", "基礎"]
level: beginner
lang: en
translationKey: linux-filesystem-and-permissions
---

> 📚 Series: "Using Linux Properly" (3 / 6)

Learn **how to tell directories apart** so you never puzzle over "where's the config file? where are the logs?", plus the **permissions (rwx)** that decide who can access a file. Basic fitness for running servers.

## Telling the main directories apart

In Linux, each directory has a more or less fixed role (a standard called FHS). Here are the four you'll touch most.

| Location | What goes here | Example |
| --- | --- | --- |
| `/etc` | **Config files** for the system and apps | `/etc/nginx/nginx.conf` |
| `/var/log` | **Logs** (data that keeps growing) | `/var/log/syslog` |
| `/home` | Each user's **personal space** | `/home/alice` (= `~`) |
| `/tmp` | Temporary files (**may vanish on reboot**) | Scratch space for an in-progress download |

> 💡 First get "config lives in `/etc`, logs live in `/var/log`" into your bones. These two are **the first places to look** when something breaks.

## How to read permissions (rwx)

The symbols at the start of `ls -l` are the permissions. **Three characters × three groups** show "who" can do "what."

```text
-rwxr-xr--   1 alice staff  ...  app
 │└┬┘└┬┘└┬┘
 │ │  │  └ other: r--  → read only
 │ │  └─── group: r-x  → read + execute
 │ └────── owner: rwx  → read, write, execute
 └──────── type (- file / d directory)
```

| Symbol | Meaning | File | Directory |
| --- | --- | --- | --- |
| `r` | read | can read the contents | can list it |
| `w` | write | can edit it | can create/delete inside |
| `x` | execute | can run it | **can enter it (cd)** |

## Numeric notation and chmod

rwx can be turned into a number as the sum of **r=4, w=2, x=1**. Three digits represent owner/group/other.

| Number | Meaning | Common target |
| --- | --- | --- |
| `755` | owner=rwx, group/other=r-x | Executables and directories |
| `644` | owner=rw-, group/other=r-- | Ordinary files |
| `600` | owner=rw-, others=none | Private keys, sensitive config |

```bash
chmod 755 deploy.sh     # specify numerically
chmod +x deploy.sh      # just add the execute bit (symbolic notation also works)
```

## Changing the owner with chown

A file has an **owner (user) and a group**. `chown` is what changes them.

```bash
chown alice file.txt          # set the owner to alice
chown alice:devs file.txt     # owner alice, group devs
chown -R app:app /var/www/    # apply to everything under a directory (-R)
```

> ⚠️ Most "Permission denied" errors come from a **mismatch in owner or permissions**. Checking who has what rights with `ls -l` first is the fastest path to a fix. A private key must be `600` or SSH will reject it (covered next time).

## Summary

- The roles are fixed: **config = `/etc`, logs = `/var/log`, personal space = `/home`, temp = `/tmp`**
- Permissions are **owner/group/other × rwx**. The `x` on a directory means "can enter"
- Numeric notation is the sum of **r=4, w=2, x=1**. `755` (executables), `644` (ordinary), `600` (secrets) are the standbys
- Use `chmod` for permissions, `chown` for ownership (recurse with `-R`)
- For "Permission denied," suspect an owner/permission mismatch and check `ls -l`

**← Prev:** [② Basic Commands, Pipes, and Redirection](/en/posts/linux-basic-commands/)
**→ Next:** [④ Process, Log, and Service Management](/en/posts/linux-process-and-services/)
