#!/bin/bash
set -euo pipefail

# Pulls error lines from the prod error log group in CloudWatch Logs
# (/pulse/server-errors), which the app ships to itself (see
# src/utils/cloudWatchErrorTransport.ts). Read-only: the watcher uses the
# pulse-log-reader IAM user, which can only read that one log group, so it
# has no shell on prod. Logs survive deploys, and filter-log-events pages
# through any number of errors (no ~24KB cap, so no "truncated" exit code).
#
# Credentials: the pulse-log-reader keys, loaded from
# $WATCHERS_DIR/aws-log-reader.env (untracked, never committed) unless
# AWS_ACCESS_KEY_ID is already set.
#
# Usage: pull-prod-logs.sh <since-iso8601>
# Prints error lines (JSON, one per line) with a timestamp >= <since-iso8601>.
# Exit codes: 0 all new errors printed; anything else: failure, don't move
# the checkpoint.

REGION="eu-central-1"
LOG_GROUP="/pulse/server-errors"
WATCHERS_DIR="${WATCHERS_DIR:-/c/Users/66bar/Claude/work/projects/pulse/.watchers}"
SINCE="${1:?since ISO8601 timestamp required}"

if [ -z "${AWS_ACCESS_KEY_ID:-}" ]; then
    if [ ! -f "$WATCHERS_DIR/aws-log-reader.env" ]; then
        echo "Missing $WATCHERS_DIR/aws-log-reader.env (pulse-log-reader keys)" >&2
        exit 1
    fi
    set -a
    # shellcheck disable=SC1091
    . "$WATCHERS_DIR/aws-log-reader.env"
    set +a
fi

SINCE_MS=$(node -e 'process.stdout.write(String(Date.parse(process.argv[1])))' "$SINCE")
if [ "$SINCE_MS" = "NaN" ]; then
    echo "Unparseable since timestamp: $SINCE" >&2
    exit 1
fi

# MSYS_NO_PATHCONV keeps Git Bash from rewriting the leading slash of the
# log group name into a Windows path
OUTPUT=$(MSYS_NO_PATHCONV=1 aws logs filter-log-events \
    --region "$REGION" \
    --log-group-name "$LOG_GROUP" \
    --start-time "$SINCE_MS" \
    --query 'events[].message' \
    --output text)

# Run tsx from the main checkout (the only one with node_modules; worktrees and
# the routine's own working directory don't have them), whichever directory
# this script was started from. --output text separates events with tabs.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAIN_CHECKOUT="$(cd "$(git -C "$SCRIPT_DIR" rev-parse --git-common-dir)/.." && pwd)"
printf '%s\n' "$OUTPUT" | tr '\t' '\n' | (cd "$MAIN_CHECKOUT" && npx tsx "$SCRIPT_DIR/filterSince.ts" "$SINCE")
