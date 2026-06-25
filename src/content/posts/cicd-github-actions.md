---
title: "CI/CD と IaC① 手動デプロイから GitHub Actions へ"
date: 2026-06-25T11:00:00
summary: "毎回手で行うデプロイは、手順漏れと「自分の環境では動く」を生む。その手順を CI/CD パイプラインに載せ替える発想と、GitHub Actions での test→build→deploy の書き方を、このブログの実例で押さえる。"
tags: ["CICD", "デプロイ", "インフラ"]
level: beginner
---

> 📚 シリーズ「CI/CD と IaC」(1 / 3)

[アプリをデプロイする](/posts/deploying-go-apps/)とき、毎回手でビルドして転送して再起動…は、
手順漏れや「自分の環境では動く」を生む。その一連を自動化するのが **CI/CD**。
まず手動手順を整理し、それを GitHub Actions のパイプラインに載せ替える。

## まず手動デプロイの手順を整理する

自動化の前に、手でやっていることを書き出す。例えば[Goアプリ](/posts/deploying-go-apps/)なら:

```text
1. テストを流す（壊れてないか）
2. ビルドする（バイナリ or コンテナイメージ）
3. レジストリに push する / サーバーに転送する
4. 本番を新しい版に切り替える・再起動する
```

> ⚠️ 手動の問題は「**やり忘れ**」と「**人によって手順が違う**」。テストを飛ばす、古い版を上げる、
> 環境差で動かない…が起きる。この決まった手順こそ自動化に向いている。

## CI/CD とは

- **CI（継続的インテグレーション）**: 変更のたびに**自動でテスト・ビルド**して、壊れていないか即検知する
- **CD（継続的デリバリ/デプロイ）**: 通ったものを**自動でデプロイ**する

> 💡 要は「上で書き出した手順を、push をきっかけに機械に毎回きっちりやらせる」こと。
> 人は手順を忘れるが、パイプラインは忘れない。

## GitHub Actions の構造

GitHub Actions は、リポジトリのイベント（push 等）をきっかけに処理を走らせる仕組み。
構造は **workflow → job → step** の3階層。

```yaml
name: CI
on:
  push:
    branches: [main]      # main への push で発火
jobs:
  test:                   # ジョブ
    runs-on: ubuntu-latest
    steps:                # 手順（上から順に）
      - uses: actions/checkout@v5    # 既製アクションを使う
      - run: go test ./...           # 任意のコマンドを実行
```

- `on` … 発火条件（push, pull_request, schedule など）
- `uses` … 公開された既製アクションを呼ぶ／`run` … シェルコマンドを直接実行
- ジョブは既定で並列、`needs` で順序を付けられる

## test → build → deploy のパイプライン

手動手順をそのままジョブの連なりにする。`needs` で「前が成功したら次」を表現する。

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: go test ./...
  build:
    needs: test            # test 成功後に
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: docker build -t myapp:${{ github.sha }} .
  deploy:
    needs: build           # build 成功後に
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

> 💡 このブログ自身も `.github/workflows/deploy.yml` で、push → ビルド → GitHub Pages へデプロイ、を
> 自動でやっている。記事を push するだけで公開されるのは、まさにこの CD が動いているから。

> 🧭 .NET でも同じ。`dotnet test` → `dotnet publish` → デプロイ、をステップに並べるだけ。
> CI/CD は言語に依存しない「手順の自動化」なので、考え方はそのまま転用できる。

## まとめ

- 自動化の第一歩は**手動デプロイの手順を書き出す**こと（test→build→push→切替）
- 手動の弱点は「やり忘れ」と「人による差」。決まった手順は機械にやらせる
- **CI**＝変更ごとに自動テスト/ビルド、**CD**＝通ったものを自動デプロイ
- GitHub Actions は **workflow→job→step**。`on` で発火、`uses`/`run` で処理、`needs` で順序
- このブログも push → ビルド → Pages デプロイを Actions で自動化している

**→ 次:** [② 手作業から Terraform へ](/posts/iac-terraform-basics/)
