#!/bin/bash
set -euo pipefail

# Pulls error lines from the running prod container via SSM Run Command
# (same access pattern as scripts/deploy/ec2-redeploy.sh). Reads the
# container's stdout (`docker logs`), not logs/error.log: the file transports
# pretty-print multi-line objects, while stdout is one winston JSON object per
# line. `--since` filters on the box, so SSM's ~24KB output cap applies to new
# errors only. Logs are lost when a deploy replaces the container, an accepted
# gap for this monitor.
#
# Usage: pull-prod-logs.sh <since-iso8601>
# Prints error lines (JSON, one per line) with a timestamp >= <since-iso8601>.
# Exit codes: 0 all new errors printed; 3 output hit the SSM cap, so only the
# oldest were printed (set the checkpoint to the last printed line's timestamp,
# not now, and the next run picks up the rest); anything else: failure, don't
# move the checkpoint.
#
# Instance id is always resolved live by tag (Name=pulse-server), never
# hardcoded/env-pinned — the server sits behind an ASG, so the instance can
# be replaced at any time (same lookup docs/DEPLOYMENT.md uses for manual
# redeploys).

REGION="eu-central-1"
SINCE="${1:?since ISO8601 timestamp required}"

INSTANCE_ID=$(aws ec2 describe-instances \
    --region "$REGION" \
    --filters Name=tag:Name,Values=pulse-server Name=instance-state-name,Values=running \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text)

if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" = "None" ]; then
    echo "No running instance tagged Name=pulse-server found" >&2
    exit 1
fi

REMOTE_CMD="docker logs --since '$SINCE' pulse-app 2>&1 | grep '\"level\":\"error\"' || true"
SSM_OUTPUT_CAP=24000

COMMAND_ID=$(aws ssm send-command \
    --region "$REGION" \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "$(node -e 'process.stdout.write(JSON.stringify({ commands: [process.argv[1]] }))' "$REMOTE_CMD")" \
    --query "Command.CommandId" \
    --output text)

# Poll until the command finishes (SSM has no blocking wait for output).
for _ in $(seq 1 30); do
    STATUS=$(aws ssm get-command-invocation \
        --region "$REGION" \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --query "Status" \
        --output text 2>/dev/null || echo "Pending")
    [ "$STATUS" = "Success" ] && break
    [ "$STATUS" = "Failed" ] && { echo "SSM command failed" >&2; exit 1; }
    sleep 2
done

# Reading output from an unfinished command would look like "no errors" and
# let the routine skip this window for good
if [ "$STATUS" != "Success" ]; then
    echo "SSM command did not finish (status: $STATUS)" >&2
    exit 1
fi

OUTPUT=$(aws ssm get-command-invocation \
    --region "$REGION" \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --query "StandardOutputContent" \
    --output text)

TRUNCATED=0
if [ "${#OUTPUT}" -ge "$SSM_OUTPUT_CAP" ]; then
    # The cap cuts mid-line; drop the partial last line
    OUTPUT=$(printf '%s\n' "$OUTPUT" | sed '$d')
    TRUNCATED=1
    echo "SSM output cap hit: only the oldest new errors were returned" >&2
fi

printf '%s\n' "$OUTPUT" | npx tsx "$(dirname "$0")/filterSince.ts" "$SINCE"

if [ "$TRUNCATED" = "1" ]; then
    exit 3
fi
