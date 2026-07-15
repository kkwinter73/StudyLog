---
title: "Playwright — ブラウザを本物のように操って E2E テストする"
date: 2026-07-15T18:00:00
summary: "ユニットテストは関数単位、E2Eテストは『ユーザーがブラウザで操作したときに、画面から本番相当のシステム全体が期待どおり動くか』を確かめる。Playwright はブラウザを自動操作してこれをやる定番ツール。何が嬉しいのか（自動待機でflakyを消す・ロケータ・自動リトライするアサーション）と、テストピラミッドの中での位置づけをまとめる。"
tags: ["テスト", "QA"]
level: intermediate
---

ユニットテストは関数単位で正しさを見る。だが「ログインして、商品をカートに入れて、購入できるか」のように
**ユーザーが画面で操作したときにシステム全体が期待どおり動くか**は、関数テストでは分からない。ここを埋めるのが
**E2E（End-to-End）テスト**で、**Playwright** はブラウザを自動操作してそれをやる定番ツールだ。

## Playwright とは — ブラウザを自動運転する

Playwright は Microsoft 製のブラウザ自動化フレームワーク。実際の **Chromium / Firefox / WebKit** を
プログラムから操作し、「ページを開く → ボタンを押す → 入力する → 表示を確認する」を人間の代わりにやる。

```ts
import { test, expect } from '@playwright/test';

test('ログインしてダッシュボードが見える', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill('user@example.com');
  await page.getByLabel('パスワード').fill('secret');
  await page.getByRole('button', { name: 'ログイン' }).click();

  await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
});
```

- 対象は **画面越しの本番相当のシステム全体**（フロント＋API＋DB…）。Go で書いたバックエンドも、
  ブラウザから叩かれる形でまとめて検証できる。
- 主要言語は **TypeScript/JavaScript**。ほかに **Python・Java・.NET（C#）** の公式バインディングがある。

> 🧭 C#/.NET なら `Microsoft.Playwright` が公式提供されていて、NUnit/xUnit からそのまま書ける。
> 概念（ロケータ・自動待機・アサーション）は言語間で共通なので、下の話はどの言語でも効く。

## 自動待機（auto-waiting）— flaky テストを消す核心

E2E が壊れやすい（flaky）最大の原因は**タイミング**だ。ボタンがまだ描画されていない、通信が終わっていない――
昔は `sleep(2秒)` のような固定待ちで凌いでいたが、遅い環境では足りず、速い環境では無駄になる。

Playwright は操作のたびに要素が **操作可能になるまで自動で待つ**（表示されている・有効・重なっていない…を確認してから click する）。

```ts
// 固定の待ちは書かない。click 前に「押せる状態か」を Playwright が自動で待つ
await page.getByRole('button', { name: '保存' }).click();
```

> ⭐ 「明示的な `sleep` を書かない」のが Playwright 流。固定待ちは flaky の元凶で、
> 自動待機がそれを構造的に潰す。ここが Selenium 世代との一番の違い。

## ロケータ — 見た目・役割で要素を掴む

要素の指定（**ロケータ**）は、壊れやすい CSS/XPath ではなく **ユーザーから見える属性**で書くのが推奨。
DOM 構造が変わっても壊れにくく、アクセシビリティの担保にもなる。

| ロケータ | 何で掴むか | 例 |
| --- | --- | --- |
| `getByRole` | 役割＋アクセシブル名（最推奨） | `getByRole('button', { name: '送信' })` |
| `getByLabel` | フォームのラベル | `getByLabel('メールアドレス')` |
| `getByText` | 表示テキスト | `getByText('カートに追加')` |
| `getByTestId` | 明示的な目印属性 | `getByTestId('submit')` |

> 💡 迷ったら `getByRole` を優先。「ユーザーがどう認識するか」で掴むと、実装の都合（クラス名変更など）で
> テストが割れにくい。テスト用の目印が要るときだけ `data-testid` を足す。

## Web-first アサーション — 検証も自動でリトライする

`expect(...)` による検証も、条件を満たすまで**短時間リトライ**する（Web-first assertion）。
非同期で後から表示される要素も、固定待ちなしにそのまま確認できる。

```ts
// 「トーストが出るはず」——出るまで自動で数百ms〜リトライしてから判定
await expect(page.getByText('保存しました')).toBeVisible();
await expect(page).toHaveURL(/\/dashboard/);   // 遷移が終わるのも待つ
```

> ⚠️ リトライされるのは Playwright の `expect(locator)` 系だけ。`expect(await locator.count())` のように
> **一度値に確定させてから** assert すると、その瞬間の値で判定＝リトライされず flaky に戻る。ロケータのまま渡す。

## デバッグ道具と、ピラミッドの中の位置づけ

Playwright はテストを書く・直す道具が強い。

- **codegen**: `npx playwright codegen <URL>` でブラウザ操作を録画し、テストコードを自動生成。叩き台に使う。
- **Trace Viewer**: 失敗時の実行を**タイムラインで再生**（各操作前後のDOMスナップショット・ネットワーク・コンソール付き）。
- **UI モード**: `--ui` でテストを対話的に実行・ウォッチしながら開発。

ただし E2E は**遅く・壊れやすく・原因の切り分けが重い**。テスト戦略では**ピラミッドの頂点**で、
数を絞って「本当に重要なユーザー体験（=クリティカルパス）」だけを守るのが定石だ。

> 🧭 単体・結合は Go の `go test`（→ [/posts/go-testing-basics/](/posts/go-testing-basics/)）で厚く、
> E2E は Playwright で薄く。役割分担は [/posts/testing-strategy-pyramid/](/posts/testing-strategy-pyramid/) を参照。

## まとめ

- **E2E テスト**は「ユーザーが画面で操作したとき、システム全体が期待どおり動くか」を検証する。Playwright はその定番。
- 実ブラウザ（Chromium/Firefox/WebKit）を自動操作。公式言語は TS/JS・Python・Java・**.NET(C#)**。
- **自動待機**が固定 `sleep` を追放し、flaky を構造的に潰す。ここが最大の強み。
- ロケータは `getByRole` など**ユーザー視点**で。アサーションも**自動リトライ**（ロケータのまま渡す）。
- codegen / Trace Viewer で書く・直すが速い。ただし E2E は**ピラミッドの頂点**——数を絞ってクリティカルパスだけ守る。

### 次にやること

- 自分のアプリの「これが壊れたら致命的」なフロー1本を Playwright で書いてみる。
- [/posts/smoke-testing/](/posts/smoke-testing/) と組み合わせ、デプロイ後の疎通確認に E2E を1〜2本回す。
