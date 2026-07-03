---
title: "Observing a Server by Hand — Reading the Raw Numbers the OS Holds"
date: 2026-07-01T20:00:00
summary: "Every number a monitoring tool shows traces back to a value the OS and processes already hold. Learn to read top, load average, free, df, and logs by hand. What you can't read on your own, you can't read on a dashboard either."
tags: ["監視", "Linux", "基礎"]
level: beginner
lang: en
translationKey: observe-server-by-hand
---

Monitoring curriculum (2/9). [Last time](/en/posts/observability-basics/) we got the big picture. This time, before installing any tools, we'll
**observe the server's state by hand**. The numbers CloudWatch shows originate from values the OS holds. First, get comfortable reading those raw values
by hand—because what you can't read on your own, you can't read on a dashboard either.

## Every Number Is Held by the OS

What a monitoring stack does is "periodically collect, record, and visualize the numbers held by the OS and its processes."
So being able to read the raw values at the source is the foundation. Here we'll work hands-on with a practice Linux box.

```bash
# Example of a disposable practice environment
docker run -it --rm ubuntu bash
apt update && apt install -y procps stress   # ps/top/vmstat and a load-generation tool
```

## CPU and Load Average

Start with `uptime` and `top`. Here's where you nail down the **difference between CPU usage and load average**.

```bash
uptime          # load average: 0.42, 0.35, 0.30 (1-min / 5-min / 15-min averages)
top             # CPU/memory/process list (q to quit)
```

| Metric | What it represents | Upper bound |
| --- | --- | --- |
| CPU usage (%) | At a given instant, how much CPU time was used | cores × 100% |
| Load average | Average number of processes running + waiting to run | no upper bound |

- **CPU usage** is "how hard it's working right now." Caps out at 100% (per core)
- **Load average** is "how backed up the queue is." **Once it exceeds the core count, work is congested**

> 💡 On 4 cores, a load average of 4.0 means "exactly full." At 8.0, it means "twice as much work is arriving as can be cleared, so it's waiting."
> Even if CPU% is at 100%, if load is low there's no congestion.

## Memory

With `free -h`, read the **difference between used and buff/cache**. This is where misunderstandings are common.

```bash
free -h
#               total   used   free   shared  buff/cache   available
# Mem:           7.7Gi  2.1Gi  1.2Gi   100Mi      4.4Gi       5.2Gi
```

- **used**: memory processes are actually using
- **buff/cache**: memory the OS has **borrowed for caching** disk contents. It can be freed when needed
- **available**: the amount you can realistically expect to use going forward. **This is the true measure of free capacity**

> ⚠️ Don't panic over "free is low!" buff/cache is only borrowed, and it comes back when it counts.
> Judge memory pressure by **available**, not free. For the mechanism, see Physical and Virtual Memory.

## Disk and Processes

```bash
df -h              # usage per filesystem (dangerous when Use% approaches 100%)
ps aux | head      # process list (look for high %CPU / %MEM)
vmstat 1 5         # every 1 second, 5 times. Watch r (run queue) and si/so (swap)
```

- `df -h` checks for **disk pressure**. A `/` filling up from log bloat is a common failure
- Use `ps aux` to pinpoint the **culprit process**. `vmstat`'s `si/so` (swap activity) is a warning sign of memory shortage

Apply some load and feel the numbers move:

```bash
stress --cpu 1 --timeout 30s   # watch CPU% and load rise in top in another terminal
```

> 🧭 The CPU/memory/disk you used to watch in Windows Task Manager or PerfMon, you read in Linux with
> these commands. Under the hood it's the same "numbers the OS holds."

## Reading Logs Directly

Beyond numbers, get comfortable following the record of events—the logs—by hand too.

```bash
journalctl -f              # tail logs live (systemd environments)
tail -f /var/log/syslog    # tail a file (depends on the environment)
journalctl -u nginx | grep error   # narrow by service + keyword
```

- With `-f` (follow), watch the log stream while triggering events with another action
- Use `grep` to narrow by keyword. For more, see Processes and Services and Basic Commands

## Summary

- Monitoring data originates from **the raw numbers the OS and processes hold**. First, get comfortable reading them by hand
- **CPU usage = work right now**, **load average = backlog in the queue** (congested above the core count)
- Judge memory pressure by **available**, not free. buff/cache is only borrowed
- When someone says "it's slow," start with these three: **top (CPU/load), free (memory), df (disk)**
- Logs can be followed with `journalctl -f` / `tail -f` plus `grep`

**Prev:** [Monitoring and Observability](/en/posts/observability-basics/)　**Next:** [What to Measure (Four Golden Signals and RED)](/en/posts/what-to-measure-metrics/) (Step 2)
