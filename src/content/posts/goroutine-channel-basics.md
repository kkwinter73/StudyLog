---
title: "goroutine と channel ではじめる並行処理"
date: 2026-06-18
summary: "go キーワードひとつで動く軽量スレッド goroutine と、その間を安全につなぐ channel の基本。デッドロックの直感も添えて。"
tags: ["並行処理", "基礎"]
level: beginner
---

Go の並行処理は、`go` を関数呼び出しの前に置くだけで始まる。
ここでは **goroutine**（軽量スレッド）と **channel**（goroutine 間の通り道）の最小セットを整理する。

## goroutine は「go をつけるだけ」

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	go say("hello") // 別の goroutine で実行
	say("world")    // main goroutine で実行
	time.Sleep(time.Millisecond) // ※本来は同期に channel/WaitGroup を使う
}

func say(s string) {
	for i := 0; i < 3; i++ {
		fmt.Println(s)
	}
}
```

`go say("hello")` は **すぐに返る**。新しい goroutine が裏で走り始め、`main` はそのまま次の行へ進む。

> ⚠️ `main` goroutine が終わるとプログラム全体が終わる。上の `time.Sleep` は説明用の手抜きで、実務では使わない。次の channel で「待つ」を正しくやる。

## channel で値を受け渡す

channel は型付きのパイプ。`<-` で送受信する。

```go
func main() {
	ch := make(chan string)

	go func() {
		ch <- "done" // 送信：受け取る人が現れるまでブロック
	}()

	msg := <-ch // 受信：送られてくるまでブロック
	fmt.Println(msg) // done
}
```

ポイントは **送受信がランデブー（待ち合わせ）になる** こと。
バッファなし channel は「送る側」と「受け取る側」が揃って初めて通信が成立する。これがそのまま同期になる。

## デッドロックの直感

送る人しかいない／受け取る人しかいない、と全 goroutine が待ちに入ると Go は気づいて落とす。

```go
func main() {
	ch := make(chan int)
	ch <- 1 // 誰も受け取らない → fatal error: all goroutines are deadlocked!
}
```

`fatal error: all goroutines are asleep - deadlock!` は「全員が待ちで誰も進めない」のサイン。
**送る側と受け取る側、両方の goroutine がいるか** をまず疑う。

## まとめ

- `go f()` で goroutine が起動し、呼び出しは即座に返る
- channel は型付きの通り道。`ch <- v` で送信、`v := <-ch` で受信
- バッファなし channel の送受信は待ち合わせ＝そのまま同期になる
- 全 goroutine が待ちに入ると deadlock で落ちる

次は `select` と `sync.WaitGroup` で「複数を待つ」をやる。
