---
title: "cron — Running Tasks Automatically at Set Times and Intervals"
date: 2026-07-15T12:00:00
summary: "A batch every night at 2am, aggregation every 5 minutes — cron handles this kind of scheduled execution. Here's how the five crontab fields declare 'when and what,' the classic gotchas around environment variables, timezones, and overlapping runs, and the shift in the cloud/container era from a single host's cron to ECS scheduled tasks and EventBridge."
tags: ["Linux", "運用"]
level: beginner
lang: en
translationKey: cron-scheduled-jobs
---

"Run a batch every night at 2am," "aggregate every 5 minutes" — Linux's standard mechanism for this **scheduled execution** is **cron**.
A resident cron daemon reads a config called **crontab** for "when and what to run," and launches the command when the time comes.
This post covers how to write a crontab, the classic gotchas, and scheduled execution in the cloud era.

## Writing a crontab — five fields + a command

A crontab line is made of **five fields for the time** and the **command** to run.

```text
┌───── minute (0-59)
│ ┌─── hour   (0-23)
│ │ ┌─ day    (1-31)
│ │ │ ┌ month  (1-12)
│ │ │ │ ┌ weekday (0-7, 0 and 7 = Sunday)
│ │ │ │ │
0 2 * * *  /usr/local/bin/backup.sh    ← runs daily at 2:00
```

| Notation | Meaning |
| --- | --- |
| `0 2 * * *` | daily at 2:00 |
| `*/5 * * * *` | every 5 minutes |
| `0 9 * * 1` | every Monday at 9:00 |
| `0 0 1 * *` | 1st of each month at 0:00 |
| `@daily` / `@hourly` / `@reboot` | once a day / hourly / at boot |

- `*` means "every," `*/n` means "every n," `,` lists values (`0,30`), `-` gives a range (`1-5`)
- Edit with `crontab -e`, view with `crontab -l`. Each user can have their own

## Classic gotchas — "works by hand but not under cron"

cron trouble almost always reduces to **a different environment**. Write it assuming the same context as your shell and you'll get stuck.

- **Different env vars / PATH**: cron runs with a minimal environment. `.bashrc` isn't read. Use **absolute paths** for commands or set PATH explicitly
- **Working directory**: defaults to home. Don't rely on relative paths; `cd` in the script or use absolute paths
- **Output and logs**: stdout/stderr are mailed by default (unseen, lost). **Always send to a file**: `>> /var/log/job.log 2>&1`
- **Timezone**: run times are based on the server's TZ. If it's off, set `CRON_TZ=Asia/Tokyo`
- **Overlapping runs**: if the next starts before the previous finishes, they overlap. Use `flock` to **prevent concurrent runs**
- **Missed runs**: a schedule while the server is down is **not caught up** later (use anacron if you need that)

> 🧭 Same role as Windows Task Scheduler or Quartz.NET / Hangfire in .NET. On Linux, cron is the standard.
> "Doesn't run when the environment differs" is exactly where understanding [the shell and env vars](/posts/shell-env-and-scripting/) pays off.

## Scheduled execution in the cloud/container era

A single server's crontab is handy but has weaknesses in production, so today it's often moved to other mechanisms.

- **Single point of failure**: if that server goes down, the schedule stops too. Hard to make redundant
- **Hard to observe**: you don't notice failures. You have to build success/failure logging and alerting separately
- **Today's standard**: a scheduler (**EventBridge Scheduler** / Kubernetes' **CronJob**) launches a containerized batch on time.
  On AWS, for example, as an **ECS scheduled task** — run the batch image once when the time comes

> 💡 "Push the cron production image to [ECR](/posts/aws-ecr-container-registry/)" is about this **containerized scheduled batch**.
> Pack the batch into a box (image), put it in a registry, and the scheduler pulls and runs it on time — the cloud takes over cron's role.

## Summary

- cron is Linux's standard **scheduled execution**. Declare "when and what" with crontab's **five fields (minute, hour, day, month, weekday) + a command**
- `*/5 * * * *` = every 5 min, `0 2 * * *` = daily at 2. `*` is every, `*/n` is every n
- The gotchas are **environmental** — PATH, working directory, output target, timezone, overlaps, missed runs
- The standard defenses: absolute paths, logs to a file, `flock` against overlap
- In production, graduate from a single host's cron to **scheduler + container** (ECS scheduled tasks, etc.)

**Related:** [Processes and Services](/posts/linux-process-and-services/) / [Shell and Environment Variables](/posts/shell-env-and-scripting/) / [ECR — AWS's Container Store](/posts/aws-ecr-container-registry/)
