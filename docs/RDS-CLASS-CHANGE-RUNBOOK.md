# RDS class change runbook: db.t3.micro to db.t4g.micro

Status: **run 19 Nov 2026, 02:04 to 02:12 UTC** on the owner's go (earlier than the planned 21:00 UTC window). Snapshot `pulse-db-before-t4g-2026-11-19` taken first (the name in the commands below says 18 Nov). Class change started 02:07:27 UTC, instance available again on `db.t4g.micro` at 02:11:39 UTC (RDS event), about 4.5 minutes from modify to finished. No pending modifications. Server error log: only the pool errors from the shutdown (02:09 UTC), none after 02:12 UTC. Checked at 12:00 UTC: `prisma migrate status` says "Database schema is up to date", the server container is healthy and answers `/api/status` with 200, and the error log has 0 entries between 02:12 and 12:00 UTC. A real login and check-in were not tested (no matching lines in the server log, no test credentials used). The manual snapshot `pulse-db-before-t4g-2026-11-19` is due for deletion on 26 Nov 2026.

Decision: `decisions/deployment-and-infra.md` (17 Nov: move to db.t4g.micro; 18 Nov: window at 11 p.m. local time, snapshot first). Plan: the "Pulse AWS Architecture Plan" artifact, migration step 5.

## State read on 18 Nov 2026, 16:41 local (read-only AWS CLI)

| Item | Value |
|---|---|
| Instance | `pulse-db`, Frankfurt (`eu-central-1`) |
| Class now | `db.t3.micro`, status available |
| Engine | PostgreSQL 17.10 |
| Storage | 20 GB, `gp2`, single availability zone |
| Pending modifications | none |
| Automated backups | kept 7 days, window 22:52 to 23:22 UTC, last automated snapshot 17 Nov 23:02 UTC |
| Maintenance window | Tuesday 01:22 to 01:52 UTC |
| Target class | `db.t4g.micro` is orderable for 17.10 with gp2, gp3, io1, io2 (checked 17 Nov) |

## Time

11 p.m. local time, UTC+2 (confirmed by the owner on 18 Nov), which is **21:00 UTC**. The owner first wrote UTC+3 (20:00 UTC); this machine's clock shows +02:00 and the owner chose that. The window does not overlap the automated backup window (22:52 to 23:22 UTC).

## Before the window (owner's go needed for the ones that create something)

1. Read-only, safe any time: confirm there are no pending modifications.
   `aws rds describe-db-instances --db-instance-identifier pulse-db --region eu-central-1 --query 'DBInstances[0].PendingModifiedValues'`
2. Freeze deploys: no merge to `main` in the server, client or chat repositories from 30 minutes before until the check at the end is done.
3. Optional but planned: test `CREATE EXTENSION vector;` on a copy restored from the latest automated snapshot, on a temporary `db.t4g.micro`, then delete the copy. This creates an instance (a few cents) and needs the owner's go.
4. Tell the owner the expected downtime: about 15 minutes. A single-instance class change usually takes longer than a few minutes.

## pgvector check on a restored copy (prepared, not run, needs the owner's go)

Goal: show that `CREATE EXTENSION vector;` works on `db.t4g.micro` with PostgreSQL 17.10 before the real instance changes class. Read on 18 Nov from the live instance: subnet group `pulse-rds-subnet-group`, VPC `vpc-0702154ad2faa034f`, security group `sg-0d6e9cdd1a065d584`, not publicly accessible, storage encrypted, parameter group `default.postgres17`, availability zone `eu-central-1a`.

1. Restore the latest automated snapshot (7 days are kept) into a temporary private copy. This creates an instance and costs a few cents an hour while it exists:
   `aws rds restore-db-instance-from-db-snapshot --db-instance-identifier pulse-db-vector-test --db-snapshot-identifier <latest rds:pulse-db-... snapshot> --db-instance-class db.t4g.micro --db-subnet-group-name pulse-rds-subnet-group --vpc-security-group-ids sg-0d6e9cdd1a065d584 --no-publicly-accessible --no-multi-az --availability-zone eu-central-1a --region eu-central-1`
   then `aws rds wait db-instance-available --db-instance-identifier pulse-db-vector-test --region eu-central-1`
2. Run the SQL from the app box, which is inside the VPC (the local machine never connects to RDS, by project rule), through SSM Run Command with a throwaway `postgres:17` client container. The master credentials stay in Secrets Manager and are read on the box by the script; they are never printed, never pasted here and never written to a file. The statements:
   `CREATE EXTENSION IF NOT EXISTS vector;`
   `SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';`
   Expected: `vector` with version 0.8.x (AWS lists 0.8.2 for 17.10).
3. Delete the copy, naming the test instance only (never `pulse-db`):
   `aws rds delete-db-instance --db-instance-identifier pulse-db-vector-test --skip-final-snapshot --delete-automated-backups --region eu-central-1`
   then confirm with `aws rds describe-db-instances --region eu-central-1 --query 'DBInstances[].DBInstanceIdentifier'` that only `pulse-db` is left.
4. Record the version and the time in the plan's "Still to verify" row.

Safety: the copy has no public access and sits in the same security group as the live database; the delete command carries the test instance's identifier and must be read once more before it is run.

## In the window

Each command is run only after the owner says go.

1. Manual snapshot (creates a snapshot, small cost):
   `aws rds create-db-snapshot --db-instance-identifier pulse-db --db-snapshot-identifier pulse-db-before-t4g-2026-11-18 --region eu-central-1`
   then `aws rds wait db-snapshot-available --db-snapshot-identifier pulse-db-before-t4g-2026-11-18 --region eu-central-1`
2. Change the class (causes the downtime):
   `aws rds modify-db-instance --db-instance-identifier pulse-db --db-instance-class db.t4g.micro --apply-immediately --region eu-central-1`
3. Wait: `aws rds wait db-instance-available --db-instance-identifier pulse-db --region eu-central-1`
4. Confirm the class and that nothing is pending:
   `aws rds describe-db-instances --db-instance-identifier pulse-db --region eu-central-1 --query 'DBInstances[0].[DBInstanceClass,DBInstanceStatus,PendingModifiedValues]'`

## Done when

- The instance is available on `db.t4g.micro`, with no pending modifications.
- The server reconnects without a restart. If it does not, restart the server container.
- `prisma migrate status` is clean.
- The error log (CloudWatch group `/pulse/server-errors`) is quiet for 30 minutes.
- Login and a check-in work.

## Rollback

- Class: `aws rds modify-db-instance --db-instance-identifier pulse-db --db-instance-class db.t3.micro --apply-immediately --region eu-central-1`. About 15 minutes of downtime again.
- Data problem: restore `pulse-db-before-t4g-2026-11-18` as a new instance. This changes the endpoint, so `DATABASE_URL` changes with it. Last resort, only on the owner's decision.

## After

- Update `docs/DEPLOYMENT.md` (instance class, connection budget) in the same change.
- Remove the manual snapshot after a week if all is well.
- Record the real downtime in the plan's acceptance table.
