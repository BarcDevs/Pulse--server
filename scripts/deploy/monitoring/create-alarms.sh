#!/bin/bash
set -euo pipefail

# The CloudWatch alarms of the migration plan (approved 18 Nov 2026), as one list.
# Default is a dry run: it prints the `aws cloudwatch put-metric-alarm` commands and
# creates nothing. `--apply` runs them (an AWS change, only with the owner's go).
#
#   bash create-alarms.sh                 print every command
#   INSTANCE_ID=i-... bash create-alarms.sh --apply
#
# The tenth alarm of the plan, the outside tunnel uptime check, is not a CloudWatch
# alarm: a free outside service does it (milestone G4, owner's pick).
# The values are starting points, tuned after the load test.
# An instance replacement changes INSTANCE_ID: run the script again with --apply.

REGION="eu-central-1"
SNS_TOPIC_ARN="${SNS_TOPIC_ARN:-arn:aws:sns:eu-central-1:110015905368:pulse-alerts}"
ASG_NAME="${ASG_NAME:-pulse-server-asg}"
DB_ID="${DB_ID:-pulse-db}"
INSTANCE_ID="${INSTANCE_ID:-<instance-id>}"

# Credit maximum of the burstable sizes: t3.small 576 (app box), t4g.micro 288 (database).
# 20 percent of each. pulse-db max_connections is 79, 80 percent of it is 63.
# FreeStorageSpace: 4 GiB, 20 percent of the 20 GB disk. FreeableMemory: 150 MiB.
#
# name|namespace|metric|dimension|statistic|period|evaluation periods|threshold|operator|missing data
ALARMS=(
    "pulse-app-memory-high|CWAgent|mem_used_percent|AutoScalingGroupName=$ASG_NAME|Average|60|5|85|GreaterThanThreshold|missing"
    "pulse-app-cpu-credits-low|AWS/EC2|CPUCreditBalance|InstanceId=$INSTANCE_ID|Minimum|300|1|115|LessThanThreshold|missing"
    "pulse-db-freeable-memory-low|AWS/RDS|FreeableMemory|DBInstanceIdentifier=$DB_ID|Minimum|300|1|157286400|LessThanThreshold|missing"
    "pulse-db-cpu-credits-low|AWS/RDS|CPUCreditBalance|DBInstanceIdentifier=$DB_ID|Minimum|300|1|57|LessThanThreshold|missing"
    "pulse-db-connections-high|AWS/RDS|DatabaseConnections|DBInstanceIdentifier=$DB_ID|Maximum|60|5|63|GreaterThanThreshold|missing"
    "pulse-db-storage-low|AWS/RDS|FreeStorageSpace|DBInstanceIdentifier=$DB_ID|Minimum|300|1|4294967296|LessThanThreshold|missing"
    "pulse-queue-depth-high|Pulse/RabbitMQ|QueueDepth|Queue=jobs|Maximum|60|10|200|GreaterThanThreshold|notBreaching"
    "pulse-dead-letter-not-empty|Pulse/RabbitMQ|DeadLetterDepth|Queue=jobs.dead|Maximum|60|5|0|GreaterThanThreshold|notBreaching"
    "pulse-broker-memory-high|Pulse/RabbitMQ|BrokerMemoryPercent|Broker=rabbitmq|Average|60|5|80|GreaterThanThreshold|notBreaching"
)

alarm_command() {
    local name namespace metric dimension statistic period evaluations threshold operator missing
    IFS='|' read -r name namespace metric dimension statistic period evaluations threshold operator missing <<< "$1"
    printf 'aws cloudwatch put-metric-alarm --region %s --alarm-name %s --namespace %s --metric-name %s --dimensions Name=%s,Value=%s --statistic %s --period %s --evaluation-periods %s --threshold %s --comparison-operator %s --treat-missing-data %s --alarm-actions %s\n' \
        "$REGION" "$name" "$namespace" "$metric" "${dimension%%=*}" "${dimension#*=}" \
        "$statistic" "$period" "$evaluations" "$threshold" "$operator" "$missing" "$SNS_TOPIC_ARN"
}

if [ -n "${ALARMS_SOURCE_ONLY:-}" ]; then
    return 0
fi

APPLY=""
if [ "${1:-}" = "--apply" ]; then
    APPLY=1
    if [ "$INSTANCE_ID" = "<instance-id>" ]; then
        echo "INSTANCE_ID is required with --apply." >&2
        exit 1
    fi
fi

for alarm in "${ALARMS[@]}"; do
    command_line=$(alarm_command "$alarm")
    if [ -n "$APPLY" ]; then
        echo "Creating ${alarm%%|*}"
        eval "$command_line"
    else
        echo "$command_line"
    fi
done

if [ -z "$APPLY" ]; then
    echo "Dry run: nothing was created. The outside tunnel uptime check is set up separately (G4)."
fi
