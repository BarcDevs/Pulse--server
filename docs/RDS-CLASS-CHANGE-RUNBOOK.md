# RDS class change runbook: db.t3.micro to db.t4g.micro

Status: prepared 18 Nov 2026, **not run**. Nothing in this file has been applied to AWS. Each step that changes anything waits for the owner's explicit go at the time.

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

The plan says 11 p.m. local time. This machine's clock shows an offset of +02:00 on 18 Nov, which would make 23:00 local equal to **21:00 UTC**, and not the 20:00 UTC (UTC+3) written in the plan on 18 Nov. Confirm the offset before the window. Either way the window does not overlap the automated backup window (22:52 to 23:22 UTC).

## Before the window (owner's go needed for the ones that create something)

1. Read-only, safe any time: confirm there are no pending modifications.
   `aws rds describe-db-instances --db-instance-identifier pulse-db --region eu-central-1 --query 'DBInstances[0].PendingModifiedValues'`
2. Freeze deploys: no merge to `main` in the server, client or chat repositories from 30 minutes before until the check at the end is done.
3. Optional but planned: test `CREATE EXTENSION vector;` on a copy restored from the latest automated snapshot, on a temporary `db.t4g.micro`, then delete the copy. This creates an instance (a few cents) and needs the owner's go.
4. Tell the owner the expected downtime: about 15 minutes. A single-instance class change usually takes longer than a few minutes.

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
