# AWS migration and RabbitMQ: build milestones

<!-- baseline: ee50f1712974412abc15a28c83da859f12509b0e -->

Source plan: the "Pulse AWS Architecture Plan" artifact (v68), `docs/RABBITMQ-JOB-QUEUE.md`, `docs/RDS-CLASS-CHANGE-RUNBOOK.md`. Decisions: `decisions/deployment-and-infra.md` and `decisions/ai-and-rag.md`.

Each milestone is about 5 minutes and can be shown working on its own. Tags:
- **[local]** changes files in a repo or runs on this machine only. Nothing touches AWS.
- **[AWS go]** applies a change to AWS or the live site. Never run without the owner's explicit go at that moment.
- **[owner]** needs the owner's access or decision.

Repos: **S** = `pulse--server` (code and `scripts/deploy`), **C** = `pulse--client`, **CH** = `pulse--chat` (new, later).

## Phase A: whole-box boot and compose (S) [local]

- [ ] A1 S: draft `docker-compose` file with the server, client, Redis, RabbitMQ and cloudflared services: `docker compose config` validates.
- [ ] A2 S: two networks in the file, edge (cloudflared, client, server) and internal (server, Redis, RabbitMQ): `config` shows each service on the right ones.
- [ ] A3 S: memory limits from the budget (Redis 100 MiB, RabbitMQ 256 MiB) and restart policies: `config` shows them.
- [ ] A4 S: healthchecks for each service: each reports healthy locally.
- [ ] A5 S: nothing publishes a host port: `config` shows no `ports` for any service.
- [ ] A6 S: Redis service with a password from an env file, `maxmemory 100mb`, `allkeys-lru`: container starts and refuses an unauthenticated command.
- [ ] A7 S: RabbitMQ definitions file with a vhost and one Node user limited to its own queues, management plugin off: the file imports into a local container without errors.
- [ ] A8 S: cloudflared ingress config pointing to `client:3000` and `/api/*` to `server:8080`: file validates with `cloudflared tunnel ingress validate`.
- [ ] A9 S: `asg-boot.sh` runs `docker compose up -d` from a versioned compose file path: `shellcheck` passes and a dry run with stubbed AWS calls prints the right commands.
- [ ] A10 S: read the last good image tags from Parameter Store at boot, write them after a good deploy: dry run with stubbed calls shows both.
- [ ] A11 S: metadata block as default deny for every bridge and for host processes except the server container: script lints and prints the rules.
- [ ] A12 S: return-traffic rule extended to the Compose bridges: script lints and prints the rule.
- [ ] A13 S: deploy lock in the deploy script (`flock`): two parallel local runs, the second waits or exits.
- [ ] A14 S: prune only the service's own images and keep the last two tags: dry run lists what would be removed.
- [ ] A15 S: graceful stop with a 30 second grace period instead of forced removal: dry run shows `docker stop -t 30`.
- [ ] A16 S: setting to turn workers off for the deploy candidate, with a guard in `src/app.ts` and a test: the test shows the worker and schedulers do not start when it is off.

## Phase B: client image and tunnel routing (C)

- [ ] B1 C: build argument `SERVER_URL=http://server:8080` in the deploy workflow and image build [local]: the built rewrites point to it.
- [ ] B2 C: client service entry in the compose file with a healthcheck [local]: starts and answers locally.
- [ ] B3 owner: read the current tunnel routing in Cloudflare (dashboard or API) and paste what it shows into the plan [owner]: the page records the real ingress, not a guess.
- [ ] B4 S: decide the routing that resolves on both boxes from B3's result [local]: a one-paragraph change note in the migration section.

## Phase C: RabbitMQ and the Postgres pending row (S) [local]

- [ ] C1 S: map the existing job table to the outbox states (pending, published, done, failed) in a short note: the note lists every status and the one column to add, if any.
- [ ] C2 S: add the AMQP client dependency and broker settings through the config package, never `process.env`: typecheck passes.
- [ ] C3 S: publisher with confirms and a timeout: unit test against a fake channel passes.
- [ ] C4 S: consumer that acknowledges after the work, with retry delay and dead-letter declarations: unit test passes.
- [ ] C5 S: idempotent insight and recommendations writes (the same check-in twice changes nothing): test passes.
- [ ] C6 S: after a check-in save, create or keep the job row and publish its id; a publish failure is logged only, as today: test passes.
- [ ] C7 S: sweeper republishes rows pending or published but not done after a timeout, and the existing `requeueMissedJobs` still creates missing rows: integration test passes.
- [ ] C8 S: backend switch `JOB_BACKEND=postgres|rabbitmq`, default `postgres`: tests pass in both modes.
- [ ] C9 S: consumer concurrency from config, default 2: test shows no more than 2 in flight.
- [ ] C10 S: graceful shutdown stops consuming and finishes jobs in flight: test passes.
- [ ] C11 S: integration test with a local broker, kill it mid-job and confirm the sweeper completes the job: passes.
- [ ] C12 S: log lines for job age and queue depth, with no message content: a test checks no content is logged.
- [ ] C13 S: move the memory-summary job onto the queue behind the same switch: test passes.

## Phase D: Redis in the server (S) [local]

- [ ] D1 S: Redis client from config, with the password and the 100 MiB cap documented: connects to the local container.
- [ ] D2 S: rate-limit counters stored in Redis: a counter survives a server restart in a local test.
- [ ] D3 S: cache-aside helper with an expiry on every key: unit test shows a hit, a miss and an expiry.
- [ ] D4 S: first cached read (the profile read that today has a 30 second in-memory cache): the memory cache is replaced and the test passes.
- [ ] D5 S: if Redis is down, reads fall back to Postgres and rate limiting does not crash the request: test passes.

## Phase E: database class change (tonight, 23:00 local)

- [x] E1 S: runbook written: `docs/RDS-CLASS-CHANGE-RUNBOOK.md`. Pending modifications none, backups kept 7 days (read 18 Nov).
- [ ] E2 owner: confirm the time offset (UTC+3 or UTC+2) for 23:00 [owner].
- [ ] E3 AWS: `CREATE EXTENSION vector;` on a copy restored from the latest automated snapshot, then delete the copy [AWS go]: the extension is created and the copy is gone.
- [ ] E4 AWS: manual snapshot `pulse-db-before-t4g-2026-11-18` [AWS go]: status available.
- [ ] E5 AWS: change the class to `db.t4g.micro` with apply-immediately [AWS go]: instance available on the new class, nothing pending.
- [ ] E6 AWS: server reconnects, `prisma migrate status` clean, 30 quiet minutes in the error log, login and a check-in work [AWS go].
- [ ] E7 S: update `docs/DEPLOYMENT.md` (class, connection budget) in the same change [local].
- [ ] E8 AWS: `SHOW max_connections` and write the budget table [AWS go].

## Phase F: box migration (apply steps, one at a time) [AWS go]

- [ ] F1 rebuild the machine image with the new boot: new image id recorded.
- [ ] F2 launch template version 8 with `t3.small` and the new image: version recorded, version 7 kept for rollback.
- [ ] F3 instance refresh to the new template: the box boots, all compose services healthy, the site answers.
- [ ] F4 run both: client container and second cloudflared connector on the app box, 30 minutes with no 404 from Node on page paths.
- [ ] F5 drain the old box: stop its connector, one day with an error rate no worse than before and memory under 80%.
- [ ] F6 shorten the API path: `/api/*` straight to Node, login works, and requests from two networks are counted separately by the limiters.
- [ ] F7 prove recovery: terminate the app box once on purpose, the whole site is back within 10 minutes with no manual step.
- [ ] F8 snapshot the client box volume, kept 7 days.
- [ ] F9 delete the old client box, its Elastic IP, volume and security group: only after the new client is built and running successfully on the app box and has served all the traffic, and only with the owner's approval.

## Phase G: monitoring (S) [local, then AWS go]

- [ ] G1 S: CloudWatch agent config for memory and disk: file validates.
- [ ] G2 S: the ten alarms as a script with the starting thresholds: script runs in dry-run mode and prints them.
- [ ] G3 AWS: create the alarms and the agent config on the box [AWS go]: all ten in the console, memory metric arriving.
- [ ] G4 owner: pick the outside uptime check (free service) [owner]: it alerts when the tunnel is down.
- [ ] G5 S: Docker log rotation setting in the daemon config: file validates.

## Phase H: load test (after Phase F)

- [ ] H1 S: fake model endpoint that copies real response timing and size: unit test shows delay and chunked output.
- [ ] H2 S: k6 script with many test users, a defined ramp, and a deploy during the load: dry run against a local server passes.
- [ ] H3 AWS: clone of the box and a restored database in production mode [AWS go]: the clone serves traffic.
- [ ] H4 AWS: run 1, record memory, queue depth, errors in the table in `docs/RABBITMQ-JOB-QUEUE.md` [AWS go]: bar is memory under 80%, no container killed, no failed requests.
- [ ] H5 S: set the final consumer concurrency and the RabbitMQ memory limit from the reading [local].

## Phase I: not split yet

Chat day work is milestoned when it starts: the `pulse--chat` repository, the WebSocket on Node, the guardrails and their test set, prompt caching, the model evaluation, RAG ingest and retrieval, the vector search row-level security, and the second and third load test runs.

## Log

_(append a dated line per completed step)_

- 2026-11-18: milestone list written, nothing implemented. E1 done: runbook written, read-only database checks made.
