---
title: "Using Linux Properly, Part 2: Basic Commands, Pipes, and Redirection"
date: 2026-06-22T18:00:00
summary: "When to reach for ls/cp/mv/rm/cat/grep/find, plus the idea of composing small commands with pipes and redirection. Turn \"I've heard of it\" into \"my hands can do it.\""
tags: ["Linux", "基礎"]
level: beginner
lang: en
translationKey: linux-basic-commands
---

> 📚 Series "Using Linux Properly" (2 / 6)

The basic commands that form the foundation of working in Linux, plus the pipes and redirection that let you **chain them together**. Let's organize the parts where you know the names but freeze up in practice into something you can actually use.

## Looking at and moving files

Start with the handful you use daily. These alone cover most of what you do.

| Command | What it does | Common form |
| --- | --- | --- |
| `ls` | List | `ls -la` (hidden files + details) |
| `cat` | Show contents | `cat app.log` |
| `cp` | Copy | `cp -r src/ dst/` (use `-r` for directories) |
| `mv` | Move / rename | `mv old.txt new.txt` |
| `rm` | Delete | `rm file` / `rm -r dir` (directory) |

> ⚠️ `rm -rf` deletes recursively with no confirmation. Get the path wrong and there's no undo. **Say the path out loud before you run it.**

## Searching — grep and find

`grep` searches "by contents," `find` searches "for the files themselves." They have different jobs.

```bash
# Search file contents for lines containing "error" (-i ignore case, -n line numbers, -r recursive)
grep -rin "error" /var/log/

# Find files by name or condition
find . -name "*.go"            # extension .go
find /tmp -type f -mtime +7    # files in /tmp older than 7 days
```

> 💡 Remember it as `grep = content search` / `find = file search`. Combined via pipes (below), the two are powerful together.

## Pipes — chaining small commands

`|` (the pipe) **passes the output of the previous command as the input to the next**. It's the heart of the Unix philosophy: "chain small tools to do big jobs."

```bash
# Pull just the nginx lines out of the process list
ps aux | grep nginx

# Count the error lines in a log
grep "ERROR" app.log | wc -l

# Top 5 by disk usage
du -sh * | sort -rh | head -5
```

> 🧭 It resembles the PowerShell pipe, but PS flows **objects** while the Unix pipe flows **text (byte streams)**. That's why each command leans toward text processing (grep/sort/awk).

## Redirection — repointing where output goes

The `>` family changes where an [output stream](/en/posts/stdin-stdout-stderr/) is directed. If a pipe means "to the next command," redirection means "to a file."

```bash
echo "hello" > out.txt     # overwrite
echo "world" >> out.txt    # append
./app > out.txt 2>&1       # send both stdout and stderr to out.txt
./app 2>/dev/null          # discard errors
```

`>` overwrites, `>>` appends. The meaning of `2>&1` and the caveats about ordering are covered in detail in the [standard I/O article](/en/posts/stdin-stdout-stderr/).

## Summary

- Daily work runs on just a few: `ls / cat / cp / mv / rm` (only `rm -rf` needs care)
- **`grep` = content search, `find` = file search.** Learn them by their distinct roles
- **The pipe `|`** sends output to the next command. Chaining small tools is the Unix way
- **Redirection**: `>` overwrites, `>>` appends, `2>&1` sends output to a file
- The pipe + grep combo (`ps aux | grep ...`) is a go-to for investigation

**← Prev:** [Part 1: Distributions and Package Management](/en/posts/linux-distros-and-packages/)
**→ Next:** [Part 3: Filesystem Layout and Permissions](/en/posts/linux-filesystem-and-permissions/)
