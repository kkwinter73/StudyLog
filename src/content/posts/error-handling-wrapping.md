---
title: "エラーは値 — wrapping と errors.Is / As"
date: 2026-06-19
summary: "Go のエラーは例外ではなく値。fmt.Errorf の %w で文脈を足しつつ、errors.Is / errors.As で正体を見抜く流儀をまとめる。"
tags: ["エラーハンドリング", "標準ライブラリ"]
level: intermediate
---

Go には例外がない。関数は **エラーを値として返し**、呼び出し側が `if err != nil` で扱う。
冗長に見えるが、「どこで何が起きたか」が呼び出しの流れにそのまま残るのが強み。

## 基本形

```go
f, err := os.Open("config.yaml")
if err != nil {
	return fmt.Errorf("設定ファイルを開けません: %w", err)
}
defer f.Close()
```

`%w` で **元のエラーを包んで（wrap）** 文脈を足す。
`%v` だと文字列になるだけだが、`%w` は元エラーへの参照を保持するので、後で正体を辿れる。

## errors.Is — 「これは “あの” エラーか？」

センチネルエラー（`io.EOF` など決め打ちの値）との一致を、wrap の層を貫いて判定する。

```go
data, err := readAll(r)
if errors.Is(err, io.EOF) {
	// 何重に wrap されていても EOF を見つけられる
	return nil
}
```

## errors.As — 「中身を型で取り出す」

独自エラー型のフィールドを使いたいときは `errors.As`。

```go
type NotFoundError struct{ Key string }

func (e *NotFoundError) Error() string {
	return fmt.Sprintf("%q が見つかりません", e.Key)
}

var nf *NotFoundError
if errors.As(err, &nf) {
	log.Printf("missing key = %s", nf.Key) // 型付きで中身にアクセス
}
```

| やりたいこと | 使うもの |
| --- | --- |
| 特定の値と一致するか | `errors.Is(err, target)` |
| 特定の型として取り出す | `errors.As(err, &target)` |
| 文脈を足して上へ返す | `fmt.Errorf("...: %w", err)` |

## いつ wrap し、いつしないか

- **wrap する**：呼び出し元が「どの操作で失敗したか」を知ると嬉しいとき
- **wrap しない**：内部実装の詳細を漏らしたくないとき（`%w` ではなく新しいエラーを返す）

> 🧭 迷ったら wrap。後から `errors.Is/As` で剥がせる。情報を捨てるのはいつでもできる。

## まとめ

- エラーは値。`if err != nil` で素直に分岐する
- `%w` で wrap して文脈を積み上げる
- 値の一致は `errors.Is`、型の取り出しは `errors.As`
- 「呼び出し元が嬉しいか」で wrap を判断する
