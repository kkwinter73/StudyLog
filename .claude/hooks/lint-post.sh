#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# PostToolUse(Write|Edit) : reminder 型ガード（速い品質ゲート）
# 記事 Markdown を編集した直後だけ、frontmatter の必須項目をチェックする。
# 文脈が残っているうちに直せるよう、軽量・記事ファイル限定で発火。
#
# 止めはしない（下書き途中の保存もあるため）。注意文を文脈に注入するだけ。
# →（ハーネス原則）機械判定はできるが「今すぐ完成」とは限らない＝block でなく reminder。
# ─────────────────────────────────────────────────────────────
input=$(cat)
fp=$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input.file_path)||"")}catch(e){}})' 2>/dev/null)

# 記事以外は無音
case "$fp" in
  *src/content/posts/*.md|*src/content/posts/*.mdx) ;;
  *) exit 0 ;;
esac
[ -f "$fp" ] || exit 0

missing=""
for key in title date summary; do
  grep -qE "^${key}:" "$fp" || missing="$missing $key"
done

# level が許可値かも軽く確認
level_line=$(grep -E "^level:" "$fp" | head -1)
bad_level=""
if [ -n "$level_line" ]; then
  case "$level_line" in
    *beginner*|*intermediate*|*advanced*) ;;
    *) bad_level="yes" ;;
  esac
fi

if [ -n "$missing" ] || [ -n "$bad_level" ]; then
  msg="📝 記事 $fp の frontmatter を確認してください。"
  [ -n "$missing" ] && msg="$msg 不足:${missing}（必須: title / date / summary）。"
  [ -n "$bad_level" ] && msg="$msg level は beginner / intermediate / advanced のいずれか。"
  msg="$msg スキーマの定義元は src/content.config.ts、書き方は .claude/rules/content.md。"
  echo "$msg" >&2
  exit 2
fi
exit 0
