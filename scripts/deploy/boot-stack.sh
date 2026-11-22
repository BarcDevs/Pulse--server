#!/bin/bash
set -euo pipefail

# Runs at boot, after the fixed network interface is attached (see asg-boot.sh),
# so a replaced app box comes back with everything on it and not only the server.
#
#   1. Brings up the long-lived containers from the compose file baked into the
#      machine image. Which ones is decided by the Parameter Store value
#      /pulse/boot/profiles (comma separated: tunnel, broker). Absent or empty
#      means none, so a new box never starts a second tunnel connector before the
#      tunnel routing has been changed for it.
#   2. Starts the server, then the client, each through its own blue/green deploy
#      script, with the last good tag recorded after its last passing deploy.
#      The server falls back to "latest" when no tag is recorded (today's
#      behaviour). The client is skipped until it has a recorded tag.
#
# Secrets are read here and exported only for the compose command.

REGION="eu-central-1"
COMPOSE_DIR="${PULSE_COMPOSE_DIR:-/opt/pulse/compose}"
SERVER_DEPLOY="${PULSE_SERVER_DEPLOY:-/opt/pulse/redeploy.sh}"
CLIENT_DEPLOY="${PULSE_CLIENT_DEPLOY:-/opt/pulse/client-redeploy.sh}"

last_good_param_name() {
    printf '/pulse/last-good/%s' "$1"
}

# Prints the recorded value, or nothing when the parameter does not exist.
read_param() {
    aws ssm get-parameter --region "$REGION" --name "$1" \
        --query Parameter.Value --output text 2>/dev/null || true
}

read_last_good() {
    read_param "$(last_good_param_name "$1")"
}

# Comma separated profiles from Parameter Store, with spaces removed. Nothing for
# an absent parameter or the literal "None" the CLI prints for an empty value.
boot_profiles() {
    local value
    value=$(read_param /pulse/boot/profiles | tr -d '[:space:]')
    if [ "$value" = "None" ]; then
        value=""
    fi
    printf '%s' "$value"
}

# The server's tag to boot: the last good one, or "latest".
server_boot_tag() {
    local tag
    tag=$(read_last_good server)
    if [ -z "$tag" ] || [ "$tag" = "None" ]; then
        tag="latest"
    fi
    printf '%s' "$tag"
}

# The compose file marks both networks external, so they must exist before
# `docker compose up`. Keep in sync with ensure_networks in ec2-redeploy.sh.
ensure_networks() {
    docker network inspect pulse_edge > /dev/null 2>&1 \
        || docker network create --subnet 172.30.0.0/24 --ip-range 172.30.0.128/25 pulse_edge > /dev/null
    docker network inspect pulse_internal > /dev/null 2>&1 \
        || docker network create --internal --subnet 172.30.1.0/24 pulse_internal > /dev/null
}

start_infrastructure() {
    local profiles="$1"
    ensure_networks
    if [ -z "$profiles" ]; then
        echo "No boot profiles set: starting no compose containers."
        return 0
    fi
    case ",$profiles," in
        *,tunnel,*)
            TUNNEL_TOKEN=$(aws secretsmanager get-secret-value --region "$REGION" \
                --secret-id pulse/app/CLOUDFLARE_TUNNEL_TOKEN --query SecretString --output text)
            export TUNNEL_TOKEN
            ;;
    esac
    COMPOSE_PROFILES="$profiles" docker compose -f "$COMPOSE_DIR/docker-compose.yml" up -d
    unset TUNNEL_TOKEN
}

if [ -n "${BOOT_SOURCE_ONLY:-}" ]; then
    return 0
fi

start_infrastructure "$(boot_profiles)"

bash "$SERVER_DEPLOY" "$(server_boot_tag)"

CLIENT_TAG=$(read_last_good client)
if [ -n "$CLIENT_TAG" ] && [ "$CLIENT_TAG" != "None" ] && [ -f "$CLIENT_DEPLOY" ]; then
    bash "$CLIENT_DEPLOY" "$CLIENT_TAG"
else
    echo "No last good client tag or no client deploy script: not starting the client."
fi
