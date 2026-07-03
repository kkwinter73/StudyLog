---
title: "Concurrency starter: goroutines and channels"
date: 2026-06-18
summary: "The basics of goroutines — lightweight threads you launch with a single go keyword — and channels, the safe path between them. With an intuition for deadlocks too."
tags: ["並行処理", "基礎"]
level: beginner
lang: en
translationKey: goroutine-channel-basics
---

Concurrency in Go starts by simply putting `go` in front of a function call.
Here we'll cover the minimal set: **goroutines** (lightweight threads) and **channels** (the path between goroutines).

## A goroutine is "just add go"

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	go say("hello") // runs in a separate goroutine
	say("world")    // runs in the main goroutine
	time.Sleep(time.Millisecond) // NOTE: normally use a channel/WaitGroup to synchronize
}

func say(s string) {
	for i := 0; i < 3; i++ {
		fmt.Println(s)
	}
}
```

`go say("hello")` **returns immediately**. A new goroutine starts running in the background, and `main` just moves on to the next line.

> ⚠️ When the `main` goroutine finishes, the whole program ends. The `time.Sleep` above is a lazy shortcut for illustration — don't use it in real code. We'll do "waiting" properly with channels next.

## Passing values with channels

A channel is a typed pipe. You send and receive with `<-`.

```go
func main() {
	ch := make(chan string)

	go func() {
		ch <- "done" // send: blocks until someone receives
	}()

	msg := <-ch // receive: blocks until something is sent
	fmt.Println(msg) // done
}
```

The key point is that **send and receive form a rendezvous**.
With an unbuffered channel, communication only happens once both the sender and the receiver are ready. That's exactly what gives you synchronization.

## An intuition for deadlocks

When every goroutine is stuck waiting — only senders, or only receivers — Go notices and crashes.

```go
func main() {
	ch := make(chan int)
	ch <- 1 // nobody receives → fatal error: all goroutines are deadlocked!
}
```

`fatal error: all goroutines are asleep - deadlock!` is the sign that "everyone is waiting and no one can move forward."
The first thing to suspect: **is there a goroutine on both the sending and the receiving side?**

## Summary

- `go f()` launches a goroutine, and the call returns immediately
- A channel is a typed path: send with `ch <- v`, receive with `v := <-ch`
- Send/receive on an unbuffered channel is a rendezvous — which is synchronization itself
- When every goroutine ends up waiting, it crashes with a deadlock

Next up: waiting for multiple things with `select` and `sync.WaitGroup`.
