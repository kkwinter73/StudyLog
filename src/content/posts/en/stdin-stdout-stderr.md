---
title: "stdin, stdout, stderr — turning \"I've heard of them\" into \"I can use them\""
date: 2026-06-22T13:00:00
summary: "What the three streams stdin / stdout / stderr are, and why output is split into two. Connecting redirects and pipes all the way to how Go handles them, to turn just-knowing-the-names into actually-using-them."
tags: ["インフラ", "基礎"]
level: beginner
lang: en
translationKey: stdin-stdout-stderr
---

`stdin` / `stdout` / `stderr`. You see the names around, but why there are two output streams and how to use them tends to stay fuzzy.
Here we connect what the three really are with redirects, pipes, and how Go handles them — turning **"I've heard of them" into "I can use them."**

## The three standard streams

Every program has three channels (streams) that are open from the moment it starts. Each has a number (a file descriptor).

| Name | Number | Direction | What it's for |
| --- | --- | --- | --- |
| standard input `stdin` | 0 | input | Receives data from the keyboard or an upstream command |
| standard output `stdout` | 1 | output | The actual result of the work (the program's "deliverable") |
| standard error `stderr` | 2 | output | Errors, logs, progress — messages that are "not the deliverable" |

> 💡 By default all three are connected to the terminal. That's why normally both stdout and stderr show up mixed together on screen.
> But under the hood they are **separate channels**, so you can route them individually afterward.

## Why output is split into two

The key point is that **keeping "the result" and "everything else" separate makes them easy to handle downstream.**
You can pass only the result (stdout) to the next command while sending logs (stderr) to the screen or a file.

```bash
# Pipe only the deliverable (stdout) into grep. Progress and errors (stderr) stay on screen
./mytool | grep "OK"

# Send the result to a file, but watch errors on screen
./mytool > result.txt
```

If you mixed both the result and the logs into stdout, then `| grep` would pull in the logs too and become useless.
**Because they're separated, you can route them freely with pipes and redirects.**

## Redirects and pipes

In the shell you use the numbers to reassign where output goes.

```bash
./app > out.txt        # stdout(1) to out.txt
./app 2> err.txt       # stderr(2) to err.txt
./app > out.txt 2>&1   # stdout to out.txt, and stderr to "the same place as stdout"
./app 2>/dev/null      # discard errors (a common one)
cat data | ./app       # feed the upstream stdout into ./app's stdin(0) (a pipe)
```

> ⚠️ `2>&1` means "send 2 to the same place as 1," and **order matters**. `> out.txt 2>&1` and
> `2>&1 > out.txt` give different results (the former sends both to the file; in the latter stderr stays on the original screen).

## How Go handles them

In Go the three are provided as variables in the `os` package. The convention is **result to stdout, logs and errors to stderr.**

```go
fmt.Println("this is the result")              // to os.Stdout (the deliverable)
fmt.Fprintln(os.Stderr, "progress: working…")  // to os.Stderr (a log)

// the log package writes to stderr by default
log.Println("this goes to stderr")

// read one line from stdin
sc := bufio.NewScanner(os.Stdin)
sc.Scan()
line := sc.Text()
```

> 🧭 In C#/.NET, `Console.WriteLine` maps to stdout, `Console.Error.WriteLine` to stderr, and
> `Console.ReadLine` to stdin. **The Out / Error / In trio is the same across languages.**

The "write logs to standard output (family) and let the platform pick them up" idea we touched on in
[Getting started with infrastructure for Go apps](/en/posts/deploying-go-apps/) rests on this very mechanism.
Containers conventionally aggregate an app's stdout/stderr into logs.

## Summary

- From startup, three channels are open: **stdin(0) / stdout(1) / stderr(2)**
- **stdout = result, stderr = logs and errors.** Keeping them apart makes them easy to route downstream
- The shell's `>` `2>` `|` `2>&1` let you freely reassign output destinations and input sources (`2>&1` is order-sensitive)
- Go uses `os.Stdout / os.Stderr / os.Stdin`. `log` writes to stderr by default. Send the result to stdout
- Same trio as C#'s `Console.Out / Error / In`. Container log aggregation is built on top of this too

Next up: try `cmd > out.txt 2> err.txt` on a command you have handy, and observe what goes to stdout versus stderr.
