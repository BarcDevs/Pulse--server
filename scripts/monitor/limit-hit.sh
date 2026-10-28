#!/bin/bash
set -uo pipefail

# StopFailure hook for the scheduled fixer sessions (wired in .watchers/.claude/settings.local.json).
# A session that dies on the usage limit cannot label anything itself, so this does it for it:
# every open issue the fixer would be working gets `limit-hit`, and the next fixer run takes
# those first (see "Limit-hit issues" in .claude/routines/prod-error-fixer.md).
#
# Reads the hook's JSON from stdin. Does nothing unless the failure looks like a usage/rate limit
# and the session is a fixer run (its transcript holds the fixer routine prompt).
# DRY_RUN=1 prints the gh commands instead of running them.

WATCHERS="C:/Users/66bar/Claude/work/projects/pulse/.watchers"
export GH_CONFIG_DIR="$WATCHERS/gh-bot"

INPUT=$(cat)
printf '%s %s\n' "$(date -u +%FT%TZ)" "$INPUT" >> "$WATCHERS/stop-failure.log"

printf '%s' "$INPUT" | grep -qiE 'rate_limit|usage limit|weekly limit|hit your limit' || exit 0

TRANSCRIPT=$(printf '%s' "$INPUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).transcript_path||"")}catch{}})')
[ -f "$TRANSCRIPT" ] || exit 0
grep -q 'prod-error-fixer' "$TRANSCRIPT" || exit 0

PROFILE=$(grep -m1 -o 'profile: [a-z]*' "$TRANSCRIPT" | cut -d' ' -f2)
case "$PROFILE" in
    server) REPO="BarcDevs/Pulse--server" ;;
    client) REPO="BarcDevs/Pulse--client" ;;
    *) exit 0 ;;
esac

run() { if [ "${DRY_RUN:-}" = "1" ]; then echo "$*"; else "$@" >/dev/null 2>&1; fi; }

run gh label create limit-hit --repo "$REPO" --color D93F0B --description "Fixer run hit the usage limit; next run takes this first"

for label in in-progress approved follow-up answered; do
    gh issue list --repo "$REPO" --state open --label "$label" --json number,labels \
        --jq '.[] | select([.labels[].name] | index("fixed") | not) | select([.labels[].name] | index("needs-human") | not) | .number'
done | sort -un | while read -r n; do
    run gh issue edit "$n" --repo "$REPO" --add-label limit-hit
done
exit 0
