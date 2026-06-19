#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Stop : フル品質ゲート（コミット前の最後の安全網）
# turn を締める前に `astro check`（型＋content schema）を走らせ、
# 壊れたまま手元を離れる事故を防ぐ。
#
# 設計上の3つの安全弁（ハーネス原則）:
#   1. 無限ループ防止 : 再発火(stop_hook_active)では止めず通知もしない
#   2. 環境差で無音    : npx / node_modules が無ければ黙って通す（ブロッカーにしない）
#   3. 邪魔をしない    : src に変更が無い turn（雑談など）はスキップ
# ─────────────────────────────────────────────────────────────
input=$(cat)
active=$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write(String(j.stop_hook_active||false))}catch(e){process.stdout.write("false")}})' 2>/dev/null)

[ "$active" = "true" ] && exit 0                 # 1. ループ防止
command -v npx >/dev/null 2>&1 || exit 0         # 2. 環境差で無音
[ -d node_modules ] || exit 0
[ -z "$(git status --porcelain src 2>/dev/null)" ] && exit 0   # 3. src 無変更ならスキップ

out=$(npx --no-install astro check 2>&1)
status=$?
if [ $status -ne 0 ]; then
  echo "🔍 astro check に失敗しています。コミット前に直してください:" >&2
  printf '%s\n' "$out" | tail -25 >&2
  exit 2
fi
exit 0
