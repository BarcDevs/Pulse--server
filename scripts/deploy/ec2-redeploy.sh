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

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR"

docker pull "$ECR/$REPO:runner-$IMAGE_TAG"
docker pull "$ECR/$REPO:migrate-$IMAGE_TAG"

DB_CREDS=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/rds/master-credentials --query SecretString --output text)
DB_USER=$(echo "$DB_CREDS" | jq -r '.username | @uri')
DB_PASS=$(echo "$DB_CREDS" | jq -r '.password | @uri')
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@pulse-db.cpwwgeuy62ph.eu-central-1.rds.amazonaws.com:5432/pulse?uselibpqcompat=true&sslmode=require"

JWT_SECRET=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/app/jwt-secret --query SecretString --output text)
ANTHROPIC_API_KEY=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/app/ANTHROPIC_API_KEY --query SecretString --output text)
GOOGLE_AI_API_KEY=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/app/GOOGLE_AI_API_KEY --query SecretString --output text)
GOOGLE_FREE_AI_API_KEY=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/app/GOOGLE_FREE_AI_API_KEY --query SecretString --output text)
OPENAI_API_KEY=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/app/OPENAI_API_KEY --query SecretString --output text)
GOOGLE_CLIENT_ID=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/app/GOOGLE_CLIENT_ID --query SecretString --output text)
GOOGLE_CLIENT_SECRET=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id pulse/app/GOOGLE_CLIENT_SECRET --query SecretString --output text)

# Expand/contract gate: destructive migrations (dropped/renamed columns or
# tables) must ship in a separate release after the code that stops reading
# them, applied manually under a maintenance window. Auto-deploy refuses them
# outright — the previous container can't be rolled back to a schema that no
# longer exists once a drop/rename has run.
# Only PENDING migrations are checked — years-old already-applied ones (which
# legitimately contain DROP/RENAME from past releases) must not block every
# future deploy forever.
MIGRATE_STATUS=$(docker run --rm -e DATABASE_URL="$DATABASE_URL" "$ECR/$REPO:migrate-$IMAGE_TAG" \
    npx prisma migrate status --schema=prisma/schema.prisma 2>&1 || true)
echo "$MIGRATE_STATUS"
PENDING_NAMES=$(echo "$MIGRATE_STATUS" | sed -n '/have not yet been applied/,/^$/p' | grep -oE '^[0-9]{8,}_?[A-Za-z0-9_]*$' || true)

for name in $PENDING_NAMES; do
    SQL=$(docker run --rm "$ECR/$REPO:migrate-$IMAGE_TAG" sh -c "cat prisma/migrations/$name/migration.sql 2>/dev/null" || true)
    if echo "$SQL" | grep -qiE 'DROP (COLUMN|TABLE)|RENAME (COLUMN|TABLE)'; then
        echo "Destructive migration ($name) detected — refusing automated deploy. Apply manually under a maintenance window." >&2
        exit 1
    fi
done

echo "Running migrations..."
docker run --rm -e DATABASE_URL="$DATABASE_URL" "$ECR/$REPO:migrate-$IMAGE_TAG" npm run release

RUN_ARGS=(
    -e NODE_ENV=production
    -e SERVER_API_VERSION=v2
    -e ORIGIN=https://pulserehab.app
    -e DATABASE_URL="$DATABASE_URL"
    -e JWT_SECRET="$JWT_SECRET"
    -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
    -e GOOGLE_AI_API_KEY="$GOOGLE_AI_API_KEY"
    -e GOOGLE_FREE_AI_API_KEY="$GOOGLE_FREE_AI_API_KEY"
    -e OPENAI_API_KEY="$OPENAI_API_KEY"
    -e GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"
    -e GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET"
    -e GOOGLE_REDIRECT_URI="https://pulserehab.app/api/v2/auth/google/callback"
)

echo "Starting candidate container on a staging port..."
docker rm -f pulse-app-candidate 2>/dev/null || true
docker run -d --name pulse-app-candidate -p 127.0.0.1:8081:8080 \
    "${RUN_ARGS[@]}" \
    "$ECR/$REPO:runner-$IMAGE_TAG"

if ! health_check 8081; then
    echo "Candidate container failed health check — leaving the current production container untouched." >&2
    docker logs --tail 100 pulse-app-candidate >&2 || true
    docker rm -f pulse-app-candidate 2>/dev/null || true
    exit 1
fi

echo "Candidate healthy. Swapping into production..."
docker rm -f pulse-app-candidate

# Idempotent swap: clear any stale leftover from an interrupted previous run
# before renaming, so a wedged pulse-app-prev can never block this deploy.
docker rm -f pulse-app-prev 2>/dev/null || true
if docker inspect pulse-app > /dev/null 2>&1; then
    docker rename pulse-app pulse-app-prev
    docker stop pulse-app-prev > /dev/null 2>&1 || true
fi

docker run -d --name pulse-app --restart=always -p 80:8080 \
    "${RUN_ARGS[@]}" \
    "$ECR/$REPO:runner-$IMAGE_TAG"

if health_check 80; then
    echo "Deploy succeeded, container healthy."
    docker rm -f pulse-app-prev 2>/dev/null || true
    docker image prune -af --filter "until=24h" > /dev/null 2>&1 || true
    exit 0
fi

echo "New production container failed its health check — rolling back to the previous image." >&2
docker logs --tail 100 pulse-app >&2 || true
docker rm -f pulse-app 2>/dev/null || true
if docker rename pulse-app-prev pulse-app 2>/dev/null; then
    docker start pulse-app > /dev/null 2>&1 || true
    echo "Rolled back to previous container. NOTE: if migrations ran this deploy, the rolled-back code is now running against the new schema — check for expand/contract violations manually." >&2
else
    echo "No previous container to roll back to — production is down. Check EC2 manually." >&2
fi
exit 1
