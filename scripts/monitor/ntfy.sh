#!/bin/bash
set -euo pipefail

# Sends a phone push through ntfy.sh, independent of Remote Control. The topic
# name is the secret: it lives in .watchers/ntfy-topic.txt, outside every repo.
# The repo is public and ntfy is a third party, so the message carries counts and
# issue numbers only, never issue text, log lines, plans or links to plans.
#
# Usage: ntfy.sh "<title>" "<message, max 200 chars>"
# Exit codes: 0 sent; 1 topic file missing, bad arguments or the request failed.

TOPIC_FILE="C:/Users/66bar/Claude/work/projects/pulse/.watchers/ntfy-topic.txt"

[ "$#" -eq 2 ] && [ -r "$TOPIC_FILE" ] || exit 1

curl -fsS --max-time 20 -H "Title: ${1:0:60}" -d "${2:0:200}" "https://ntfy.sh/$(cat "$TOPIC_FILE")" > /dev/null
