#!/bin/bash
set -euo pipefail

# Pulls error.log lines from the running prod container via SSM Run Command
# (same access pattern as scripts/deploy/ec2-redeploy.sh). Logs live inside
# the container (no volume mount), so this reads them via `docker exec`
# against the current `pulse-app` container — they're lost on container
# restart/redeploy, which is an accepted gap for this monitor, not a bug.
#
# Usage: pull-prod-logs.sh <since-iso8601>
# Prints matching error.log lines (JSON, one per line — prod logger uses
# winston JSON format) with a timestamp >= <since-iso8601> to stdout.
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

REMOTE_CMD="docker exec pulse-app sh -c 'cat logs/error.log 2>/dev/null || true'"

COMMAND_ID=$(aws ssm send-command \
    --region "$REGION" \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "{\"commands\":[\"$REMOTE_CMD\"]}" \
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

aws ssm get-command-invocation \
    --region "$REGION" \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --query "StandardOutputContent" \
    --output text \
    | npx tsx "$(dirname "$0")/filterSince.ts" "$SINCE"
