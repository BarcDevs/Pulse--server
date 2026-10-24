#!/bin/bash
set -euo pipefail

# Fails closed unless `gh` is logged in as the watcher bot. Scheduled runs get the bot
# through GH_CONFIG_DIR in .watchers/.claude/settings.local.json; if that setting is not
# applied, gh falls back to the owner's own login, and a run would then post as the owner.
#
# Usage: require-bot.sh [source]
# `source` names the routine ("server fixer", "client watcher", ...) and goes in the push title,
# so the phone shows which run stopped. Without it the push says it was a manual run.
# Exit codes: 0 gh is the bot; 1 it is not (a push is sent) or the check failed.

BOT_LOGIN="Claude-watcher-agent"
NTFY="$(dirname "$0")/ntfy.sh"

SRC="${1:-manual run, no source given}"
LOGIN=$(gh api user --jq .login 2>/dev/null || true)

[ "$LOGIN" = "$BOT_LOGIN" ] && exit 0

bash "$NTFY" "Pulse run stopped: $SRC" "gh is not the watcher bot (got: ${LOGIN:-none}). Check GH_CONFIG_DIR." || true
echo "gh is logged in as '${LOGIN:-none}', not $BOT_LOGIN: stop the run, do nothing else." >&2
exit 1
