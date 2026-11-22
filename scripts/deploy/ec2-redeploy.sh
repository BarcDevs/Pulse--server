#!/bin/bash
set -euo pipefail

# Runs on the EC2 box via SSM Run Command (AWS-RunShellScript), triggered by
# .github/workflows/deploy.yml after a merge to main. Pulls the images CI just
# pushed to ECR, gates on any destructive migration, runs migrations, then
# blue/green-swaps the app container so a bad image never takes down the
# last-known-good one.
# All secrets are fetched here from Secrets Manager using the instance role
# (never passed in from CI) — see docs/DEPLOYMENT.md for the secret names.

REGION="eu-central-1"
ACCOUNT_ID="110015905368"
ECR="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
REPO="pulse-server-app"
API_VERSION="${SERVER_API_VERSION:-v2}"
IMAGE_TAG="${1:?image tag required}"

# /api/ready executes a real SELECT against the DB — /api/status alone is a
# static handler that returns 200 even with a broken DATABASE_URL, so it
# cannot be trusted to gate a swap.
health_check() {
    local port="$1"
    for i in $(seq 1 15); do
        if curl -sf --max-time 5 "http://localhost:$port/api/status" > /dev/null \
           && curl -sf --max-time 10 "http://localhost:$port/api/ready" > /dev/null; then
            return 0
        fi
        sleep 2
    done
    return 1
}

# Gate helpers, kept as functions so src/__tests__/scripts/ec2-redeploy.test.ts
# can source this file (REDEPLOY_SOURCE_ONLY=1) and exercise them without AWS/docker.
# Extracts pending migration names from `prisma migrate status` output on stdin.
pending_migration_names() {
    sed -n '/have not yet been applied/,/^$/p' | grep -oE '^[0-9]{8,}_?[A-Za-z0-9_]*$' || true
}

# Exit 0 if the migration SQL on stdin can lose data or break the previous
# container (the only rollback target: the schema is never rolled back). Flags:
#   - every DROP (COLUMN/TABLE/CONSTRAINT/VIEW/FUNCTION/TRIGGER/SEQUENCE/
#     TYPE/SCHEMA/DATABASE, ALTER TYPE ... DROP VALUE, and ALTER TABLE x DROP "col"
#     without the COLUMN keyword) except DROP NOT NULL / DROP DEFAULT / DROP IDENTITY
#     and DROP INDEX (incl. IF EXISTS / CONCURRENTLY), which is deliberately
#     allowed: an index only affects query performance, never correctness
#   - RENAME COLUMN/TABLE/VALUE (and any other RENAME ... TO)
#   - ALTER COLUMN ... TYPE / SET DATA TYPE (lossy cast, table rewrite)
#   - ALTER COLUMN ... SET NOT NULL (fails or locks if NULLs exist)
#   - ADD COLUMN ... NOT NULL with no DEFAULT (old code's INSERTs start failing)
#   - TRUNCATE, DELETE FROM, UPDATE ... SET (data rewrites need a human)
# Passes: CREATE TABLE/INDEX/TYPE, DROP INDEX, ADD COLUMN (nullable or with DEFAULT),
# ADD CONSTRAINT, DROP NOT NULL, SET DEFAULT.
# `--` comments are stripped first, so a comment never trips or hides the gate.
is_destructive_sql() {
    local sql
    sql=$(sed 's/--.*$//' | tr '\n\r' '  ')
    if echo "$sql" | grep -qiE 'RENAME +(COLUMN|TABLE|VALUE|TO)|ALTER +COLUMN[^;]*(SET +DATA +)?TYPE|ALTER +COLUMN[^;]*SET +NOT +NULL|TRUNCATE|DELETE +FROM|UPDATE +("?[A-Za-z0-9_.]+"?) +SET'; then
        return 0
    fi
    if echo "$sql" | grep -oiE '(^|[^A-Za-z0-9_"])DROP +[^ ;]+( +[^ ;]+)?' | sed -E 's/^[^Dd]*//' | grep -qivE '^DROP +(INDEX|NOT +NULL|DEFAULT|IDENTITY)'; then
        return 0
    fi
    echo "$sql" | grep -oiE 'ADD +COLUMN[^;]*' | grep -iE 'NOT +NULL' | grep -qiv 'DEFAULT'
}

# Name of the pre-migration RDS snapshot: "pre-migrate-<tag>-<timestamp>".
# RDS identifiers allow only letters, digits and hyphens, so anything else in
# the image tag becomes a hyphen. Timestamp defaults to now (override for tests).
snapshot_name_for_tag() {
    local tag ts
    tag=$(printf '%s' "$1" | tr -c 'A-Za-z0-9-' '-')
    ts="${2:-$(date +%Y%m%d%H%M%S)}"
    printf 'pre-migrate-%s-%s' "$tag" "$ts"
}

# One deploy at a time on the box: the server and the client deploys share this
# lock, so two candidates never run together and one deploy never prunes the
# other's rollback image. Waits up to 10 minutes, then gives up. The lock is
# held until this script exits.
DEPLOY_LOCK_FILE="${DEPLOY_LOCK_FILE:-/var/lock/pulse-deploy.lock}"
acquire_deploy_lock() {
    exec 9>"$DEPLOY_LOCK_FILE"
    if ! flock -w "${DEPLOY_LOCK_WAIT_SECONDS:-600}" 9; then
        echo "Another deploy holds $DEPLOY_LOCK_FILE - giving up." >&2
        return 1
    fi
}

# Image references of ONE repository to remove: reads "repo:tag" lines on stdin,
# newest first (the order `docker images` prints), skips the newest KEEP and any
# untagged line, and never lists an image of another repository. A release pushes
# two tags (runner and migrate), so KEEP=4 keeps the last two releases.
select_images_to_prune() {
    local repo="$1" keep="$2"
    grep -F "$repo:" | grep -v '<none>' | tail -n "+$((keep + 1))" || true
}

# `docker rmi` refuses an image a container still uses, so the running and the
# previous containers' images are always safe.
prune_old_images() {
    docker images --format '{{.Repository}}:{{.Tag}}' "$1" \
        | select_images_to_prune "$1" "$2" \
        | xargs -r docker rmi > /dev/null 2>&1 || true
}

# Gives the container time to finish in-flight work (the app drains jobs on
# SIGTERM) before Docker kills it.
graceful_stop() {
    docker stop -t "${2:-30}" "$1" > /dev/null 2>&1 || true
}

# Last good image tag per service, kept in Parameter Store so a replaced box
# boots the version that last passed its health check, never an untested "latest".
last_good_param_name() {
    printf '/pulse/last-good/%s' "$1"
}

write_last_good() {
    aws ssm put-parameter --region "$REGION" --name "$(last_good_param_name "$1")" \
        --value "$2" --type String --overwrite > /dev/null
}

# Creates the two app networks when missing. The deploy scripts own them (the
# compose file marks both external), with fixed subnets so the metadata rules can
# name the server containers by address. Addresses Docker picks on its own come
# from 172.30.0.128/25 only, so the fixed ones (.10, .11, .20, .21) never collide.
# Keep in sync with boot-stack.sh and the client's ec2-redeploy.sh.
ensure_networks() {
    docker network inspect pulse_edge > /dev/null 2>&1 \
        || docker network create --subnet 172.30.0.0/24 --ip-range 172.30.0.128/25 pulse_edge > /dev/null
    docker network inspect pulse_internal > /dev/null 2>&1 \
        || docker network create --internal --subnet 172.30.1.0/24 pulse_internal > /dev/null
}

# Health check from inside the container (curl is in the image), so it does not
# need a published host port: the candidate runs on pulse_edge with no port.
# Same two gates as health_check above.
container_health_check() {
    local name="$1"
    for i in $(seq 1 15); do
        if docker exec "$name" curl -sf --max-time 5 http://127.0.0.1:8080/api/status > /dev/null \
           && docker exec "$name" curl -sf --max-time 10 http://127.0.0.1:8080/api/ready > /dev/null; then
            return 0
        fi
        sleep 2
    done
    return 1
}

# Starts an app container on pulse_edge at a fixed address, then joins it to
# pulse_internal (a container can only start on one network). Extra arguments
# (restart policy, alias, published port, WORKERS_ENABLED) come after the two
# fixed ones. Needs RUN_ARGS, ECR, REPO and IMAGE_TAG.
run_app_container() {
    local name="$1" ip="$2"
    shift 2
    docker run -d --name "$name" --network pulse_edge --ip "$ip" \
        "${RUN_ARGS[@]}" "$@" \
        "$ECR/$REPO:runner-$IMAGE_TAG" > /dev/null || return 1
    docker network connect pulse_internal "$name" || return 1
}

# A running container cannot gain an alias, so it is reconnected: the same fixed
# address, now with the alias.
attach_alias() {
    local name="$1" ip="$2" alias="$3"
    docker network disconnect pulse_edge "$name" || return 1
    docker network connect --ip "$ip" --alias "$alias" pulse_edge "$name" || return 1
}

is_running() {
    [ "$(docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null)" = "true" ]
}

# A run that died between stopping the old container and starting the new one
# leaves pulse-app stopped (or gone) and pulse-app-prev holding the last good
# container. Put it back before anything else removes it.
recover_interrupted_run() {
    if ! is_running pulse-app && docker inspect pulse-app-prev > /dev/null 2>&1; then
        echo "Interrupted earlier deploy: restoring pulse-app-prev as pulse-app."
        docker rm -f pulse-app 2>/dev/null || true
        docker rename pulse-app-prev pulse-app || return 1
        docker start pulse-app > /dev/null || return 1
    fi
}

# Zero-gap swap with the candidate as a bridge (see AWS-MIGRATION-MILESTONES.md B5):
#   candidate (.11, workers off) passes the health check and takes the alias, the
#   old container is stopped gracefully, the new pulse-app (.10, workers on, port
#   80) starts, and only when it is healthy the candidate and the old one go.
# Workers never run in two containers at once. Returns 1 on any failure; a failed
# candidate leaves production untouched, a failed new container is rolled back.
swap_server() {
    local direct=""
    recover_interrupted_run || return 1
    # pulse-app is down and only the candidate still serves: do not remove it
    if ! is_running pulse-app && is_running pulse-app-candidate; then
        direct=1
        echo "pulse-app is not running and the candidate is serving: starting pulse-app without a new candidate."
    fi

    if [ -z "$direct" ]; then
        echo "Starting candidate container on pulse_edge..."
        docker rm -f pulse-app-candidate 2>/dev/null || true
        # WORKERS_ENABLED=false: the candidate must not claim jobs or start the
        # purge schedulers.
        run_app_container pulse-app-candidate 172.30.0.11 -e WORKERS_ENABLED=false || return 1
        if ! container_health_check pulse-app-candidate; then
            echo "Candidate container failed health check — leaving the current production container untouched." >&2
            docker logs --tail 100 pulse-app-candidate >&2 || true
            docker rm -f pulse-app-candidate 2>/dev/null || true
            return 1
        fi
        echo "Candidate healthy. Taking over the server alias and swapping..."
        attach_alias pulse-app-candidate 172.30.0.11 server || return 1
        # Idempotent: a leftover prev from an interrupted run must not block the rename.
        docker rm -f pulse-app-prev 2>/dev/null || true
        if docker inspect pulse-app > /dev/null 2>&1; then
            docker rename pulse-app pulse-app-prev || return 1
            # A restart policy would bring the stopped old container back after a Docker restart
            docker update --restart=no pulse-app-prev > /dev/null 2>&1 || true
            graceful_stop pulse-app-prev
        fi
    fi

    run_app_container pulse-app 172.30.0.10 --restart=unless-stopped --network-alias server -p 80:8080 || true
    if is_running pulse-app && container_health_check pulse-app; then
        echo "Deploy succeeded, container healthy."
        graceful_stop pulse-app-candidate
        docker rm -f pulse-app-candidate 2>/dev/null || true
        docker rm -f pulse-app-prev 2>/dev/null || true
        return 0
    fi

    echo "New production container failed its health check — rolling back to the previous image." >&2
    docker logs --tail 100 pulse-app >&2 || true
    docker rm -f pulse-app 2>/dev/null || true
    if docker rename pulse-app-prev pulse-app 2>/dev/null; then
        docker update --restart=unless-stopped pulse-app > /dev/null 2>&1 || true
        docker start pulse-app > /dev/null 2>&1 || true
        if container_health_check pulse-app; then
            docker rm -f pulse-app-candidate 2>/dev/null || true
            echo "Rolled back to previous container. NOTE: if migrations ran this deploy, the rolled-back code is now running against the new schema — check for expand/contract violations manually." >&2
        else
            echo "Rolled back container did not become healthy — the candidate (if any) still serves. Check EC2 manually." >&2
        fi
    elif is_running pulse-app-candidate; then
        echo "No previous container to roll back to — the candidate keeps serving without workers. Check EC2 manually." >&2
    else
        echo "No previous container to roll back to — production is down. Check EC2 manually." >&2
    fi
    return 1
}

if [ -n "${REDEPLOY_SOURCE_ONLY:-}" ]; then
    return 0
fi

acquire_deploy_lock
ensure_networks

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR"

docker pull "$ECR/$REPO:runner-$IMAGE_TAG"
docker pull "$ECR/$REPO:migrate-$IMAGE_TAG"

DB_CREDS=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/rds/master-credentials --query SecretString --output text)
DB_USER=$(echo "$DB_CREDS" | jq -r '.username | @uri')
DB_PASS=$(echo "$DB_CREDS" | jq -r '.password | @uri')
DB_HOST_URL="pulse-db.cpwwgeuy62ph.eu-central-1.rds.amazonaws.com:5432/pulse?uselibpqcompat=true&sslmode=verify-full&sslrootcert=/etc/ssl/rds-global-bundle.pem"
# Master user: migrations only (they need DDL)
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@$DB_HOST_URL"

# The app itself runs as the least-privilege pulse_app user (L6) once
# scripts/security/create-app-db-user.sh has created it; until then it falls
# back to the master user so deploys keep working
if APP_DB_CREDS=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/rds/app-credentials --query SecretString --output text 2>/dev/null) \
    && [ "$(echo "$APP_DB_CREDS" | jq -r .password)" != "pending" ]; then
    APP_DB_USER=$(echo "$APP_DB_CREDS" | jq -r '.username | @uri')
    APP_DB_PASS=$(echo "$APP_DB_CREDS" | jq -r '.password | @uri')
    APP_DATABASE_URL="postgresql://$APP_DB_USER:$APP_DB_PASS@$DB_HOST_URL"
    echo "App will connect as the least-privilege database user"
else
    APP_DATABASE_URL="$DATABASE_URL"
    echo "WARNING: pulse/rds/app-credentials not set up; app will connect as the master user" >&2
fi

JWT_SECRET=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/app/jwt-secret --query SecretString --output text)
ANTHROPIC_API_KEY=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/app/ANTHROPIC_API_KEY --query SecretString --output text)
GOOGLE_AI_API_KEY=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/app/GOOGLE_AI_API_KEY --query SecretString --output text)
GOOGLE_FREE_AI_API_KEY=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/app/GOOGLE_FREE_AI_API_KEY --query SecretString --output text)
OPENAI_API_KEY=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/app/OPENAI_API_KEY --query SecretString --output text)
GOOGLE_CLIENT_ID=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/app/GOOGLE_CLIENT_ID --query SecretString --output text)
GOOGLE_CLIENT_SECRET=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/app/GOOGLE_CLIENT_SECRET --query SecretString --output text)
RESEND_API_KEY=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/app/RESEND_API_KEY --query SecretString --output text)
# Optional: a missing secret leaves the launch-funnel endpoint closed (401) instead of blocking the deploy
LAUNCH_FUNNEL_SECRET=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/app/LAUNCH_FUNNEL_SECRET --query SecretString --output text 2>/dev/null || true)
if [ -z "$LAUNCH_FUNNEL_SECRET" ]; then
    echo "WARNING: pulse/app/LAUNCH_FUNNEL_SECRET not readable - the launch-funnel endpoint will reject every request." >&2
fi
# Optional: a missing secret leaves the Claude support-ticket reader closed (401) instead of blocking the deploy
SUPPORT_READER_SECRET=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/app/SUPPORT_READER_SECRET --query SecretString --output text 2>/dev/null || true)
if [ -z "$SUPPORT_READER_SECRET" ]; then
    echo "WARNING: pulse/app/SUPPORT_READER_SECRET not readable - GET /support/claude/tickets will reject every request." >&2
fi

# Expand/contract gate: destructive migrations (see is_destructive_sql) must ship in a separate release after the code that stops reading
# them, applied manually under a maintenance window. Auto-deploy refuses them
# outright — the previous container can't be rolled back to a schema that no
# longer exists once a drop/rename has run.
# Only PENDING migrations are checked — years-old already-applied ones (which
# legitimately contain DROP/RENAME from past releases) must not block every
# future deploy forever.
MIGRATE_STATUS=$(docker run --rm -e DATABASE_URL="$DATABASE_URL" "$ECR/$REPO:migrate-$IMAGE_TAG" \
    npx prisma migrate status --schema=prisma/schema.prisma 2>&1 || true)
echo "$MIGRATE_STATUS"
PENDING_NAMES=$(echo "$MIGRATE_STATUS" | pending_migration_names)

for name in $PENDING_NAMES; do
    SQL=$(docker run --rm "$ECR/$REPO:migrate-$IMAGE_TAG" sh -c "cat prisma/migrations/$name/migration.sql 2>/dev/null" || true)
    if echo "$SQL" | is_destructive_sql; then
        echo "Destructive migration ($name) detected — refusing automated deploy. Apply manually under a maintenance window." >&2
        exit 1
    fi
done

# Automatic backup before any migration runs: never migrate without it.
# The instance role needs rds:CreateDBSnapshot and rds:DescribeDBSnapshots
# (plus rds:AddTagsToResource if the snapshot is tagged); see docs/DEPLOYMENT.md.
if [ -n "$PENDING_NAMES" ]; then
    SNAPSHOT_ID=$(snapshot_name_for_tag "$IMAGE_TAG")
    echo "Creating RDS snapshot $SNAPSHOT_ID before migrating..."
    if ! aws rds create-db-snapshot --region "$REGION" --db-instance-identifier pulse-db --db-snapshot-identifier "$SNAPSHOT_ID"         || ! timeout 900 aws rds wait db-snapshot-available --region "$REGION" --db-snapshot-identifier "$SNAPSHOT_ID"; then
        echo "RDS snapshot $SNAPSHOT_ID failed or timed out — refusing to migrate without a backup." >&2
        exit 1
    fi
fi

echo "Running migrations..."
docker run --rm -e DATABASE_URL="$DATABASE_URL" "$ECR/$REPO:migrate-$IMAGE_TAG" npm run release

RUN_ARGS=(
    --cap-drop ALL
    --security-opt no-new-privileges
    --pids-limit 512
    -e NODE_ENV=production
    -e SERVER_API_VERSION="$API_VERSION"
    -e ORIGIN=https://pulserehab.app
    -e DATABASE_URL="$APP_DATABASE_URL"
    -e JWT_SECRET="$JWT_SECRET"
    -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
    -e GOOGLE_AI_API_KEY="$GOOGLE_AI_API_KEY"
    -e GOOGLE_FREE_AI_API_KEY="$GOOGLE_FREE_AI_API_KEY"
    -e OPENAI_API_KEY="$OPENAI_API_KEY"
    -e GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"
    -e GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET"
    -e EMAIL_PASSWORD="$RESEND_API_KEY"
    -e LAUNCH_FUNNEL_SECRET="$LAUNCH_FUNNEL_SECRET"
    -e SUPPORT_READER_SECRET="$SUPPORT_READER_SECRET"
    -e GOOGLE_REDIRECT_URI="https://pulserehab.app/api/$API_VERSION/auth/google/callback"
)

if swap_server; then
    prune_old_images "$ECR/$REPO" 4
    write_last_good server "$IMAGE_TAG" \
        || echo "WARNING: could not record the last good tag in Parameter Store." >&2
    exit 0
fi
exit 1
