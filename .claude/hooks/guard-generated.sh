#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# PreToolUse(Write|Edit) : block 型ガード
# 生成物への書き込みを止める。dist/ と .astro/ はビルドで毎回作り直されるため、
# 手で編集しても次のビルドで消える＝ほぼ確実に操作ミス。
#
# 「ファイルパス」という構造化入力だけを見て判定するので誤検知ゼロにできる
# →（ハーネス原則）block は確実に判定できる面だけに絞る。
# ─────────────────────────────────────────────────────────────
input=$(cat)
fp=$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input.file_path)||"")}catch(e){}})' 2>/dev/null)

case "$fp" in
  */dist/*|dist/*|*/.astro/*|.astro/*)
    echo "🚫 \"$fp\" は生成物です。dist/ と .astro/ はビルドで再生成されるので直接編集しないでください。元になる src/ や設定ファイルを直してください。" >&2
    exit 2
    ;;
esac
exit 0
