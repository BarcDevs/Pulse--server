# AWS migration and RabbitMQ: build milestones

<!-- baseline: ee50f1712974412abc15a28c83da859f12509b0e -->

Source plan: the "Pulse AWS Architecture Plan" artifact (v68), `docs/RABBITMQ-JOB-QUEUE.md`, `docs/RDS-CLASS-CHANGE-RUNBOOK.md`. Decisions: `decisions/deployment-and-infra.md` and `decisions/ai-and-rag.md`.

Each milestone is about 5 minutes and can be shown working on its own. Tags:
- **[local]** changes files in a repo or runs on this machine only. Nothing touches AWS.
- **[AWS go]** applies a change to AWS or the live site. Never run without the owner's explicit go at that moment.
- **[owner]** needs the owner's access or decision.

Repos: **S** = `pulse--server` (code and `scripts/deploy`), **C** = `pulse--client`, **CH** = `pulse--chat` (new, later).

**Order (decided 18 Nov):** the box migration ships first: phases A (without A6 and A7), B, E and F. Redis and RabbitMQ are added after it: A6 and D with Redis, A7 and C with RabbitMQ. The first migration box therefore runs cloudflared, the client and the server only. Phases G and H follow the migration. Database class change tonight: 11 p.m. local time, UTC+2, which is 21:00 UTC (confirmed 18 Nov).

## Phase A: whole-box boot and compose (S) [local]

- [x] A1 S: compose file with cloudflared, Redis and RabbitMQ (`scripts/deploy/compose/docker-compose.yml`), validated with `docker compose config`. The server and the client are not in it: they keep their blue/green deploy scripts and join the networks (design point, see the log).
- [x] A2 S: two networks, `pulse_edge` and `pulse_internal` (`internal: true`, no internet): `config` shows cloudflared on edge and Redis and RabbitMQ on internal.
- [x] A3 S: memory limits (cloudflared 64 MiB, Redis 128 MiB with a 100 MiB cache cap, RabbitMQ 256 MiB) and `restart: always`: `config` shows them.
- [x] A4 S: healthchecks: Redis and RabbitMQ reported healthy in a local run; cloudflared's `tunnel ready` command exists in the pinned image, but it was not run against a real tunnel, so its healthy state is still unverified.
- [x] A5 S: nothing publishes a host port: `config --profile broker` shows no `ports` for any service.
- [x] A6 S: Redis service with a password, `maxmemory 100mb`, `allkeys-lru`: verified locally, an unauthenticated command gets `NOAUTH`, with the password it answers `PONG`, and `maxmemory` is 104857600 with policy `allkeys-lru`.
- [x] A7 S: RabbitMQ `definitions.json` (vhost `/pulse`, three exchanges, queue, retry queue with a 10 second delay, dead-letter queue), `rabbitmq.conf` (watermark 192 MiB, disk limit 512 MiB) and `create-node-user.sh`: verified locally, the definitions load, the user `pulse_node` has no tags and may touch only names starting `pulse.`, `guest` is deleted, and a second run changes nothing. Idle memory was about 84 to 99 MiB in a local container, which is a first reading and not the box.
- [ ] A8 owner: the tunnel is remotely managed (token from Secrets Manager), so its ingress rules live in Cloudflare and not in a file here. The rules to set are `client:3000` for pages and `/api/*` to `server:8080`; set them in Cloudflare only with the owner's go [owner].
- [x] A9 S: `asg-boot.sh` runs the new `boot-stack.sh` (compose containers chosen by `/pulse/boot/profiles`, then the server and the client), and falls back to the old boot when the image lacks it: `bash -n` passes and tests with stubbed AWS calls cover the profile and tag choices. `shellcheck` is not installed here.
- [x] A10 S: the server deploy writes `/pulse/last-good/server` after a good deploy (a failure only warns) and `boot-stack.sh` reads it, falling back to `latest`: tests with stubbed calls pass. The instance role still needs `ssm:PutParameter` and `ssm:GetParameter` on `/pulse/*`.
- [x] A11 S: `pulse-network-rules.sh` with `print` and `apply`: default deny to the metadata address from every bridge except the server containers (fixed addresses on the edge network) and for host processes of every user but root; tests check the printed rules. Not applied anywhere.
- [x] A12 S: the return-traffic rule in `asg-boot.sh` now also covers `br+`: `bash -n` passes. Not applied anywhere.
- [x] A13 S: `acquire_deploy_lock` in the server deploy script (`flock`, waits up to 10 minutes): the test passes where `flock` exists and is skipped here (Git Bash has no `flock`). The client script is not changed yet.
- [x] A14 S: `prune_old_images` removes only this repository's images beyond the newest four (two releases of two tags) and replaces the box-wide 24-hour prune: tests cover the selection. The client script is not changed yet.
- [x] A15 S: `graceful_stop` (30 seconds) for the candidate and the previous container, and the candidate starts with `WORKERS_ENABLED=false`: tests pass.
- [x] A16 S: `WORKERS_ENABLED` setting (default on) through the config package, with `startBackgroundWorkers` in `src/lib/backgroundWorkers.ts` and a test: with it off nothing starts and stop resolves. The deploy script does not set it for the candidate yet (a separate step).

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
- [x] E2 owner: time offset confirmed 18 Nov: UTC+2, so 23:00 local is 21:00 UTC [owner].
- [x] E3 AWS: `CREATE EXTENSION vector;` on a copy restored from the latest automated snapshot, then delete the copy [AWS go]: done 18 Nov, `vector 0.8.2` on PostgreSQL 17.10 and `db.t4g.micro`, the copy deleted, only `pulse-db` left.
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

- 2026-11-18 (evening): A4, A6 and A7 verified with Docker locally (containers, network and volume removed afterwards). Phase A is finished except the client repo's deploy script (A13 to A15 there).
- 2026-11-18 (later): E3 done: pgvector checked on a temporary restored copy through the app box, then the copy was deleted. A9 to A15 done in the server repo with tests, A16 earlier. A4, A6 and A7 still need Docker, which is not running on this machine. Client deploy script (A13 to A15) not changed.
- 2026-11-18: A1, A2, A3, A5 and A16 done on branch `feat/aws-migration-compose`, uncommitted. Typecheck and lint clean; 131 of 132 suites pass in one run and the one failure passes alone (a Jest cache read race); 2,391 tests pass. Dependencies installed with `npm ci --ignore-scripts`.
- 2026-11-18: design point: the deploy scripts do blue/green swaps with `docker run`, so compose holds only the infrastructure containers, and boot runs compose first and then the server and client deploy scripts with the last good tags. To confirm.
- 2026-11-18: the pgvector check on a restored copy is written into `docs/RDS-CLASS-CHANGE-RUNBOOK.md`, not run.
- 2026-11-18: milestone list written, nothing implemented. E1 done: runbook written, read-only database checks made.
