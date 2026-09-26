#!/bin/bash
set -euo pipefail

# Launch-template user data for the pulse-server ASG. Attaches the fixed-private-IP
# ENI (the client proxies /api to that IP), then redeploys the latest runner image.
# Needs /opt/pulse/redeploy.sh baked into the AMI. See docs/ASG-MIGRATION.md.

REGION="eu-central-1"
ENI_ID="eni-0a923c09357bb745b"

TOKEN=$(curl -sf -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
INSTANCE_ID=$(curl -sf -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)

# Old instance may still hold the ENI while it terminates — wait, then force-detach.
for i in $(seq 1 30); do
    STATUS=$(aws ec2 describe-network-interfaces --region "$REGION" --network-interface-ids "$ENI_ID" --query 'NetworkInterfaces[0].Status' --output text)
    [ "$STATUS" = "available" ] && break
    sleep 10
done
if [ "$STATUS" != "available" ]; then
    ATTACHMENT=$(aws ec2 describe-network-interfaces --region "$REGION" --network-interface-ids "$ENI_ID" --query 'NetworkInterfaces[0].Attachment.AttachmentId' --output text)
    aws ec2 detach-network-interface --region "$REGION" --attachment-id "$ATTACHMENT" --force
    sleep 10
fi

aws ec2 attach-network-interface --region "$REGION" --network-interface-id "$ENI_ID" --instance-id "$INSTANCE_ID" --device-index 1

bash /opt/pulse/redeploy.sh latest
