#!/usr/bin/env bash
# Install the FFCS planner skill for OpenCode, Claude Code, or any agent that
# reads a skills folder.
#
#   curl -fsSL https://raw.githubusercontent.com/devansharora18/ffcs/main/install.sh | bash
#
# Pass options after `bash -s --`:
#   --opencode        install to ~/.config/opencode/skills (default when OpenCode exists)
#   --claude          install to ~/.claude/skills
#   --dir PATH        install to PATH/ffcs-planner
#   --help
#
# Overrides for forks or mirrors:
#   FFCS_REPO=owner/repo  FFCS_BRANCH=main  FFCS_ZIP_URL=https://...

set -euo pipefail

NAME="ffcs-planner"
REPO="${FFCS_REPO:-devansharora18/ffcs}"
BRANCH="${FFCS_BRANCH:-main}"
ZIP_URL="${FFCS_ZIP_URL:-https://github.com/${REPO}/raw/${BRANCH}/public/ffcs-planner-skill.zip}"

usage() {
  cat <<'TEXT'
Install the FFCS planner skill.

  --opencode        install to ~/.config/opencode/skills
  --claude          install to ~/.claude/skills
  --dir PATH        install to PATH/ffcs-planner
  --help            show this message

With no option, installs to OpenCode when ~/.config/opencode exists, otherwise
to Claude when ~/.claude exists.
TEXT
}

TARGET=""
while [ $# -gt 0 ]; do
  case "$1" in
    --opencode) TARGET="$HOME/.config/opencode/skills"; shift ;;
    --claude) TARGET="$HOME/.claude/skills"; shift ;;
    --dir) TARGET="${2:-}"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [ -z "$TARGET" ]; then
  if [ -d "$HOME/.config/opencode" ]; then
    TARGET="$HOME/.config/opencode/skills"
  elif [ -d "$HOME/.claude" ]; then
    TARGET="$HOME/.claude/skills"
  else
    TARGET="$HOME/.config/opencode/skills"
  fi
fi

command -v curl >/dev/null 2>&1 || {
  echo "curl is required" >&2
  exit 1
}

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "downloading $ZIP_URL"
curl -fsSL "$ZIP_URL" -o "$tmp/skill.zip"

if command -v unzip >/dev/null 2>&1; then
  unzip -q -o "$tmp/skill.zip" -d "$tmp/unpacked"
elif command -v python3 >/dev/null 2>&1; then
  python3 -m zipfile -e "$tmp/skill.zip" "$tmp/unpacked"
else
  echo "need unzip or python3 to extract the archive" >&2
  exit 1
fi

[ -f "$tmp/unpacked/$NAME/SKILL.md" ] || {
  echo "archive does not contain $NAME/SKILL.md" >&2
  exit 1
}

mkdir -p "$TARGET"
rm -rf "${TARGET:?}/$NAME"
cp -R "$tmp/unpacked/$NAME" "$TARGET/$NAME"

echo "installed $NAME -> $TARGET/$NAME"
if command -v python3 >/dev/null 2>&1; then
  echo "check: python3 \"$TARGET/$NAME/scripts/find.py\" --slot A1"
else
  echo "python3 is required to run the solver"
fi
