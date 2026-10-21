#!/bin/bash
set -euo pipefail

# Sends a phone push through ntfy.sh, independent of Remote Control. The topic
# name is the secret: it lives in .watchers/ntfy-topic.txt, outside every repo.
# The repo is public and ntfy is a third party, so the message carries counts and
# issue numbers only, never issue text, log lines or plans. The only links are to the
# public GitHub issue lists, derived here from the S#/C# prefixes: tapping the push opens
# the issue itself when exactly one issue is named, else the list; buttons open each list.
#
# Usage: ntfy.sh "<title>" "<message, max 200 chars>"
# Exit codes: 0 sent; 1 topic file missing, bad arguments or the request failed.

TOPIC_FILE="C:/Users/66bar/Claude/work/projects/pulse/.watchers/ntfy-topic.txt"

[ "$#" -eq 2 ] && [ -r "$TOPIC_FILE" ] || exit 1

MESSAGE="${2:0:200}"
SERVER_URL="https://github.com/BarcDevs/Pulse--server/issues"
CLIENT_URL="https://github.com/BarcDevs/Pulse--client/issues"
HEADERS=(-H "Title: ${1:0:60}")
ACTIONS=()
CLICK=""

for PREFIX_URL in "S|Server|$SERVER_URL" "C|Client|$CLIENT_URL"; do
    IFS='|' read -r PREFIX LABEL URL <<< "$PREFIX_URL"
    NUMBERS=$(grep -oE "${PREFIX}#[0-9]+" <<< "$MESSAGE" | sort -u | tr -d "${PREFIX}#" || true)
    [ -n "$NUMBERS" ] || continue
    ACTIONS+=("view, $LABEL issues, $URL")
    [ -n "$CLICK" ] || CLICK="$URL"
    [ "$(wc -l <<< "$NUMBERS")" -eq 1 ] && [ -z "$(grep -oE '[SC]#[0-9]+' <<< "$MESSAGE" | sort -u | sed -n '2p')" ] && CLICK="$URL/$NUMBERS"
done

[ -z "$CLICK" ] || HEADERS+=(-H "Click: $CLICK")
[ "${#ACTIONS[@]}" -eq 0 ] || HEADERS+=(-H "Actions: $(IFS=';'; echo "${ACTIONS[*]}")")

curl -fsS --max-time 20 "${HEADERS[@]}" -d "$MESSAGE" "https://ntfy.sh/$(cat "$TOPIC_FILE")" > /dev/null
