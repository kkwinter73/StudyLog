---
title: "Command Injection — Execute Without a Shell"
date: 2026-07-09T12:30:00
summary: "Concatenating user input into an external command string lets an attacker run arbitrary commands with ; or |. The root cause is handing a string to a shell. We look at how Go's exec.Command passes args as a list without going through a shell, closing the hole at the source."
tags: ["セキュリティ", "Go"]
level: beginner
lang: en
translationKey: command-injection
---

When you call an external command and concatenate user input into the string, an attacker can use `;` or `|` to run arbitrary commands. That's command injection. The most reliable fix is to **never hand a string to a shell** — and in Go that's the default.

## How the Attack Works — It Breaks When the String Reaches a Shell

Say you have a "take a URL and `git clone` it" feature, written by building a command string and handing it to a shell.

```bash
# Concatenate the user input url straight into a shell (dangerous)
git clone $url
```

The assumption is that `url` is a normal URL, but an attacker sends **shell metacharacters** in place of a URL.

```text
input: https://example.com/repo.git; rm -rf /
run:   git clone https://example.com/repo.git; rm -rf /
                                             ^^^^^^^^^^^^ runs as a separate command
```

To a shell, `;` `|` `&&` `$()` `` ` `` mean "command separator" or "run another command". The moment a string reaches the shell's eyes, these are interpreted as **instructions, not data**.

> ⚠️ The principle is exactly the same as [SQL injection](/en/posts/sql-injection/). At the root, input meant as data gets interpreted as **syntax** by a parser (SQL there, the shell here).

## The Principles — Don't Go Through a Shell

Rather than fiddly escaping (neutralizing metacharacters), it's more reliable to **never let a shell assemble the string in the first place**.

- **Don't build a string**: stop concatenating like `"git clone " + url`
- **Pass args as a list**: hand the command name and each argument as separate array elements, so the shell never has to decide where the boundaries are
- **Avoid the shell itself**: if you don't go through `sh -c "..."`, metacharacters are just plain characters
- **Validate / allowlist**: still confirm the input matches the expected form (is it a URL? the expected host?)

> 💡 If you pass args as a list, `; rm -rf /` is simply handed to git as **one single argument with that literal name**. It can never become a separate command.

## Defending in Go — exec.Command Doesn't Go Through a Shell

Go's `os/exec` takes the command and its arguments as **separate values** and passes them straight to the OS. It doesn't interpose a shell (`sh`), so there's no opening for metacharacters to be interpreted.

```go
// Safe: url is handed to git as "one argument". No shell involved.
cmd := exec.Command("git", "clone", url)
if err := cmd.Run(); err != nil {
	log.Fatal(err)
}
```

Even if `url` is `repo.git; rm -rf /`, that's nothing but the **literal string** of git's second argument — `rm` will never run (git just complains that it's an invalid URL). The following, on the other hand, is what you must never write.

```go
// Dangerous: it deliberately invokes a shell and concatenates a string
cmd := exec.Command("sh", "-c", "git clone "+url)
```

The moment you hand it to `sh -c`, the shell interprets the contents. Everything after `;` runs as a separate command. Remember: **the instant the first argument to `exec.Command` is `sh`/`bash`, that's a red flag.**

> 🧭 C#'s `Process` has the same structure. Push onto `ArgumentList` (a list) rather than `ProcessStartInfo.Arguments` (a single string), and set `UseShellExecute = false` to skip the shell. Go's `exec.Command` is on this "no shell, arg list" side by default.

## When You Really Do Need a Shell

There are cases — pipes, redirects — where you genuinely need shell features. Even then you can limit the damage by not mixing user input into the string.

- **Pass input via environment variables**: write `$URL` in the script body and pass the value through `cmd.Env`. Don't assemble the script by concatenation
- **Reject with an allowlist**: validate input with a regex and refuse anything outside the expected pattern before running
- **Decompose if you can**: to pipe two commands, build two `exec.Command`s on the Go side and connect them with `StdoutPipe`. You get the same result without calling a shell

> ⭐ There's a single axis for the decision: "does that input reach a place where it's **interpreted as syntax**?" If it does (shell, SQL, or a [path](/en/posts/path-traversal/)), switch to a route that treats it as data.

## Summary

- Command injection happens when user input is **interpreted as syntax by a shell**
- `;` `|` `&&` `$()` are shell separators / run-another-command symbols. Mixed into data, they become instructions
- The core fix is to **not go through a shell and to pass args as a list**. More reliable than escaping
- Go's `exec.Command("git", "clone", url)` passes args separately with no shell, so it's safe. `exec.Command("sh", "-c", ...)` invokes a shell itself, so it's dangerous
- In C#, use `ArgumentList` + `UseShellExecute = false`. The thinking is the same as Go

**Related:** [SQL Injection](/en/posts/sql-injection/) / [Path Traversal](/en/posts/path-traversal/) / [SSRF Attack](/en/posts/ssrf-attack/)
