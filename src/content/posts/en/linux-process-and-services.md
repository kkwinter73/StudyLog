---
title: "Using Linux Properly, Part 4: Processes, Logs, and Service Management"
date: 2026-06-22T16:00:00
summary: "See running processes (ps/top) and stop them (kill), follow logs (tail -f/grep), and control services (systemctl). A bundle of ops commands for answering 'what's happening right now?' on a server."
tags: ["Linux", "運用", "基礎"]
level: beginner
lang: en
translationKey: linux-process-and-services
---

> 📚 Series: "Using Linux Properly" (4 / 6)

Ops commands for answering "Is the app running?" and "Why did it crash?" on a server.
We'll go in the order **see and stop processes → follow logs → manage as a service**.

## Seeing running processes

Use `ps aux` for a list of all processes, and `top` (or `htop`) for real-time load.

```bash
ps aux | grep myapp     # find the myapp process (gives you the PID)
top                     # dynamic view of CPU/memory usage (q to quit)
```

Each line of `ps aux` is `USER PID %CPU %MEM ... COMMAND`. The **PID (process ID)** is the key you'll need later to stop it.

> 💡 Each process is [an independent unit of execution with its own dedicated memory space](/en/posts/process-vs-thread/). `ps` just lists them.

## Stopping a process — kill and signals

`kill` is the command that **sends a signal (a cue) to a given PID**. It's not an outright force-quit.

```bash
kill 1234        # default is SIGTERM (the "please shut down nicely" cue)
kill -9 1234     # SIGKILL (kill without question; last resort)
```

| Signal | Number | Meaning |
| --- | --- | --- |
| SIGTERM | 15 | "Wrap up and exit." The app gets to clean up |
| SIGKILL | 9 | "Terminate now." No cleanup allowed. Last resort |

> 🧭 First use `kill` (TERM) to prompt a [graceful shutdown](/en/posts/deploying-go-apps/), and only fall back to `-9` if it doesn't respond.
> The well-behaved pattern for Go and .NET apps is to catch SIGTERM, finish in-flight requests, and then exit.

## Following logs

When something crashed or is slow, start from the logs. It's the combo of **`tail -f` to follow the flow** and **`grep` to narrow it down**.

```bash
tail -f /var/log/app.log              # follow the tail in real time (Ctrl+C to stop)
tail -n 100 /var/log/app.log          # just the last 100 lines
grep -i "error" /var/log/app.log      # pull out only the error lines
tail -f app.log | grep --line-buffered "ERROR"   # follow while showing only errors
```

> 💡 In containers, the convention is to [write logs to stdout/stderr](/en/posts/stdin-stdout-stderr/), so instead of a file you do the same thing with
> `docker logs -f <container>`. The "follow the tail" idea is the same.

## Managing as a service — systemctl

Long-running apps (web servers, etc.) are managed as services by **systemd**. You operate them with `systemctl`.

```bash
systemctl status nginx     # check status (running? crashed?)
systemctl start nginx      # start
systemctl stop nginx       # stop
systemctl restart nginx    # restart
systemctl enable nginx     # configure it to auto-start at OS boot
```

- The first thing to check is `status`. It tells you whether it's `active (running)` or `failed` due to an error.
- `enable` configures it to "come up automatically on the next boot too" (distinct from `start`, which starts it right now).

> 🧭 The counterpart to Windows service management (`services.msc` / `sc`) is systemd / systemctl.
> They play the same role: "register a service to run resident, and manage its start, stop, and auto-start."

## Wrap-up

- View processes with **`ps aux`** (list) and **`top`** (real-time load). The key is the **PID**.
- `kill` **sends a signal**. Start with SIGTERM; if that doesn't work, `kill -9` (SIGKILL).
- Logs are the combo of **`tail -f`** (follow) and **`grep`** (narrow down). For containers, `docker logs -f`.
- Manage long-running apps with **`systemctl`**: status/start/stop/restart/enable. Check `status` first.
- `enable` (auto-start config) and `start` (start now) are two different things.

**← Prev:** [Part 3: Filesystem Layout and Permissions](/en/posts/linux-filesystem-and-permissions/)
**→ Next:** [Part 5: Shell Environment and Scripting](/en/posts/shell-env-and-scripting/)
