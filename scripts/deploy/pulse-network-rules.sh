#!/bin/bash
set -euo pipefail

# Firewall rules for the app box, written as default deny for the instance
# metadata service (169.254.169.254), which hands out the instance role's AWS
# credentials:
#   - containers: dropped from every bridge, except the server containers
#     (production and deploy candidate), by a PULSE-IMDS chain hooked into
#     DOCKER-USER;
#   - host processes: dropped for every user except root, so a container that
#     runs on the host network as a normal user cannot read the credentials.
#
# `print` shows the rules, `apply` installs them (needs root and Docker running,
# which creates the DOCKER-USER chain). Re-running `apply` does not duplicate rules.

IMDS_ADDR="169.254.169.254"
# Fixed addresses of the server containers on the edge network.
ALLOWED_IPS="${PULSE_IMDS_ALLOWED_IPS:-172.30.0.10 172.30.0.11}"

# One line per rule: "<kind> <table> <chain> <iptables arguments>".
emit_rules() {
    local ip
    echo "chain filter PULSE-IMDS"
    for ip in $ALLOWED_IPS; do
        echo "rule filter PULSE-IMDS -s $ip -j RETURN"
    done
    echo "rule filter PULSE-IMDS -j DROP"
    echo "hook filter DOCKER-USER -d $IMDS_ADDR -j PULSE-IMDS"
    echo "rule filter OUTPUT -d $IMDS_ADDR -m owner ! --uid-owner 0 -j DROP"
}

apply_rules() {
    local kind table chain args
    while read -r kind table chain args; do
        case "$kind" in
            chain)
                iptables -t "$table" -N "$chain" 2>/dev/null || true
                iptables -t "$table" -F "$chain"
                ;;
            rule)
                iptables -t "$table" -C "$chain" $args 2>/dev/null \
                    || iptables -t "$table" -A "$chain" $args
                ;;
            hook)
                iptables -t "$table" -C "$chain" $args 2>/dev/null \
                    || iptables -t "$table" -I "$chain" 1 $args
                ;;
        esac
    done < <(emit_rules)
}

if [ -n "${RULES_SOURCE_ONLY:-}" ]; then
    return 0
fi

case "${1:-print}" in
    print) emit_rules ;;
    apply) apply_rules ;;
    *) echo "usage: $0 print|apply" >&2; exit 2 ;;
esac
