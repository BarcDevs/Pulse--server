#!/bin/bash
set -euo pipefail

# L6 (security audit): the app connects to RDS as the master user. This
# creates a least-privilege `pulse_app` role (read/write data only: no DDL,
# no role management) and stores its credentials as a new secret. Migrations
# keep using the master user; ec2-redeploy.sh hands the app container
# pulse_app once the secret exists.
#
# Run once from a machine with admin AWS credentials:
#     bash scripts/security/create-app-db-user.sh   (needs the aws CLI and node; jq only on the box)
# Safe to re-run: it rotates the pulse_app password and re-applies grants.
#
# The password is generated and used inside AWS only: the secret is created
# from a value generated on the EC2 box, and the SQL runs there via SSM, so it
# never appears in this terminal, in SSM command text or in CloudTrail.

REGION="eu-central-1"
ACCOUNT_ID="110015905368"
APP_SECRET_ID="pulse/rds/app-credentials"
ROLE_NAME="pulse-ec2-role"
POLICY_NAME="pulse-app-db-credentials"
DB_HOST="pulse-db.cpwwgeuy62ph.eu-central-1.rds.amazonaws.com"
DB_NAME="pulse"
APP_DB_USER="pulse_app"

echo "1/4 Allowing the EC2 role to read and write $APP_SECRET_ID..."
# A separate inline policy, so the existing one is left untouched. PutSecretValue
# lets the box set the generated password in step 3; step 4 removes it
aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name "$POLICY_NAME" \
    --policy-document "{
        \"Version\": \"2012-10-17\",
        \"Statement\": [{
            \"Effect\": \"Allow\",
            \"Action\": [\"secretsmanager:GetSecretValue\", \"secretsmanager:PutSecretValue\"],
            \"Resource\": \"arn:aws:secretsmanager:$REGION:$ACCOUNT_ID:secret:$APP_SECRET_ID-*\"
        }]
    }"

echo "2/4 Creating the secret (placeholder value, replaced on the box)..."
aws secretsmanager describe-secret --region "$REGION" --secret-id "$APP_SECRET_ID" >/dev/null 2>&1 \
    || aws secretsmanager create-secret \
        --region "$REGION" \
        --name "$APP_SECRET_ID" \
        --description "Least-privilege Postgres user the Pulse app connects as (L6)" \
        --secret-string '{"username":"pulse_app","password":"pending"}' >/dev/null

echo "3/4 Creating the role and grants on RDS via SSM..."
INSTANCE_ID=$(aws ec2 describe-instances \
    --region "$REGION" \
    --filters "Name=tag:Name,Values=pulse-server" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].InstanceId' --output text)

# Runs on the box. Only secret *names* appear in the command text.
read -r -d '' REMOTE_SCRIPT <<REMOTE_EOF || true
set -euo pipefail
MASTER=\$(aws secretsmanager get-secret-value --region $REGION --secret-id pulse/rds/master-credentials --query SecretString --output text)
export PGUSER=\$(echo "\$MASTER" | jq -r .username)
export PGPASSWORD=\$(echo "\$MASTER" | jq -r .password)
APP_PASS=\$(openssl rand -hex 32)
# printf is a shell builtin, so the password reaches aws on stdin and never
# shows up in a process's arguments
printf '{"SecretId":"$APP_SECRET_ID","SecretString":"{\\\\"username\\\\":\\\\"$APP_DB_USER\\\\",\\\\"password\\\\":\\\\"%s\\\\"}"}' "\$APP_PASS" \
    | aws secretsmanager put-secret-value --region $REGION --cli-input-json file:///dev/stdin >/dev/null
docker run --rm -i -e PGUSER -e PGPASSWORD postgres:17-alpine \
    psql "host=$DB_HOST dbname=$DB_NAME sslmode=require" -v ON_ERROR_STOP=1 <<SQL
DO \\\$\\\$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$APP_DB_USER') THEN
        CREATE ROLE $APP_DB_USER LOGIN;
    END IF;
END \\\$\\\$;
ALTER ROLE $APP_DB_USER WITH LOGIN PASSWORD '\$APP_PASS';
GRANT CONNECT ON DATABASE $DB_NAME TO $APP_DB_USER;
GRANT USAGE ON SCHEMA public TO $APP_DB_USER;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $APP_DB_USER;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO $APP_DB_USER;
ALTER DEFAULT PRIVILEGES FOR ROLE \$PGUSER IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $APP_DB_USER;
ALTER DEFAULT PRIVILEGES FOR ROLE \$PGUSER IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO $APP_DB_USER;
SQL
echo "pulse_app ready"
REMOTE_EOF

COMMAND_ID=$(aws ssm send-command \
    --region "$REGION" \
    --instance-ids "$INSTANCE_ID" \
    --document-name AWS-RunShellScript \
    --parameters "$(node -e 'process.stdout.write(JSON.stringify({ commands: [process.argv[1]] }))' "$REMOTE_SCRIPT")" \
    --query 'Command.CommandId' --output text)

aws ssm wait command-executed --region "$REGION" --command-id "$COMMAND_ID" --instance-id "$INSTANCE_ID" || true
aws ssm get-command-invocation --region "$REGION" --command-id "$COMMAND_ID" --instance-id "$INSTANCE_ID" \
    --query '[Status, StandardOutputContent, StandardErrorContent]' --output text

echo "4/4 Narrowing the EC2 role back to read-only on the secret..."
# Write access was only needed to store the generated password; a
# compromised app shouldn't be able to overwrite its own credentials
aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name "$POLICY_NAME" \
    --policy-document "{
        \"Version\": \"2012-10-17\",
        \"Statement\": [{
            \"Effect\": \"Allow\",
            \"Action\": \"secretsmanager:GetSecretValue\",
            \"Resource\": \"arn:aws:secretsmanager:$REGION:$ACCOUNT_ID:secret:$APP_SECRET_ID-*\"
        }]
    }"

echo
echo "Done. The next deploy (ec2-redeploy.sh) runs the app as $APP_DB_USER;"
echo "migrations still run as the master user."
