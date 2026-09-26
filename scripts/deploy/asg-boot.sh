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

# Docker DNATs traffic to the fixed IP, so the container's reply is routed out the
# primary NIC before its source is rewritten — AWS drops it. Mark connections that
# arrive on the fixed IP and route their replies out the secondary NIC's table.
FIXED_IP="172.31.16.100"
for i in $(seq 1 30); do
    ip route show table 10001 | grep -q default && break
    sleep 2
done

cat > /usr/local/bin/pulse-eni-routing.sh <<ROUTING_EOF
#!/bin/bash
set -euo pipefail
iptables -t mangle -C PREROUTING -d $FIXED_IP -j CONNMARK --set-mark 0x1 2>/dev/null \
    || iptables -t mangle -A PREROUTING -d $FIXED_IP -j CONNMARK --set-mark 0x1
iptables -t mangle -C PREROUTING -i docker0 -j CONNMARK --restore-mark 2>/dev/null \
    || iptables -t mangle -A PREROUTING -i docker0 -j CONNMARK --restore-mark
ip rule show | grep -q "fwmark 0x1" || ip rule add fwmark 0x1 lookup 10001 priority 10002
ROUTING_EOF
chmod 755 /usr/local/bin/pulse-eni-routing.sh

cat > /etc/systemd/system/pulse-eni-routing.service <<UNIT_EOF
[Unit]
Description=Return-path routing for the fixed pulse-server ENI
After=network-online.target docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/local/bin/pulse-eni-routing.sh

[Install]
WantedBy=multi-user.target
UNIT_EOF
systemctl daemon-reload
systemctl enable --now pulse-eni-routing.service

bash /opt/pulse/redeploy.sh latest
