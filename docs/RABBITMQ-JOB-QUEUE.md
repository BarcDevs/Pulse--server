# RabbitMQ job queue: decision, design and experience log

Status: planned, not built (18 Nov 2026). Source plan: the "Pulse AWS Architecture Plan" artifact, sections "Queue options" and "Review findings". Decisions recorded in `decisions/deployment-and-infra.md`.

This file has two jobs: describe what will be built so it can be built the same way every time, and keep an honest log of what was actually done, so the CV section at the end only ever contains true statements.

## 1. Decisions

| Date | Decision | Why |
|---|---|---|
| 17 Nov | RabbitMQ is the job queue on the app box. SQS and BullMQ on Redis were rejected. | Gain experience in a broker that job listings often name, while still being a sound design. |
| 18 Nov | Check-in AI feedback moves from the Postgres job table onto RabbitMQ. | It is the highest-volume job and the one the load test stresses. |
| 18 Nov | Every job keeps a pending row in Postgres as the record. RabbitMQ is the delivery channel. A sweeper republishes rows still pending. | A job that lives only in the broker has no repair if the process crashes between the database save and the publish, or if the broker's data is lost. |

Rejected, with the reason:
- SQS: managed, no memory on the box, but it teaches little about brokers.
- BullMQ on Redis: needs a second Redis that never evicts keys, and the Python client is weak.
- Running RabbitMQ only locally: nothing a reader can verify, so it does not count as experience.
- Several broker nodes (replicated queues): needs more machines and memory than the plan has. The pending row and sweeper give the same durability at this size. The broker stays a single node and the log below must say so.

## 2. What exists today (checked in code, 18 Nov)

- `checkInService` saves the check-in, then queues the AI job in a separate call. A queue failure is only logged. The check-in is not affected.
- The job table is read by a polling worker (`checkInAiWorkerService`). Rows are claimed atomically, so several instances can run it. Concurrency is 2 jobs at a time (`CHECK_IN_AI_JOB_CONCURRENCY`).
- Failed jobs are retried up to a limit, then marked failed. A sweeper (`requeueMissedJobs`) creates a job for any recent check-in that has none and re-queues failed ones after a delay.
- The worker runs the insight generation and then the recommendations step for the same check-in.
- The worker and the purge schedulers start when the server listens, which matters for the deploy candidate (see section 6).

## 3. Design

Flow for one job:
1. Node saves the data and the pending job row (same call where possible, otherwise the sweeper repairs a missing row).
2. Node publishes the job id to RabbitMQ and waits for the broker's confirmation. Only then is the row marked as published.
3. A consumer receives the message, claims the row, does the work, writes the result, marks the row done, then acknowledges the message. The acknowledgement comes last.
4. A failure moves the message to a retry path with a delay, and after a set number of tries to the dead-letter queue. The row records the reason.
5. The sweeper, every few minutes, republishes rows that are still pending or published but not done after a timeout.

Rules:
- Messages carry ids, never check-in text or health content.
- Consumers are idempotent: running the same job twice must not duplicate vectors, insights or recommendations (upsert by source id and chunk index).
- The database row is the source of truth. If the queue is wiped, the sweeper rebuilds it.
- Chat is not a queue worker. Only the Node server publishes and consumes.

Jobs on the queue: per-user memory summary after a check-in, RAG ingest (posts, check-in summaries, chat summaries), chat topic pickup, and check-in AI feedback (new, 18 Nov).

## 4. Broker setup and hardening (to build)

- One container on the app box, internal Docker network only, no published port, management plugin off.
- Memory: the plan gives it 256 MiB as an estimate. The review (finding 8, not yet checked) says the watermark is a flow-control threshold and not a hard cap, and suggests a container limit near 384 MiB with a watermark near 200 MiB. Measure real use first and set the numbers from the reading.
- Data on a volume. Checked 18 Nov with the AWS CLI (read-only): the launch template `pulse-server-lt` (v7) has no block device mapping of its own, so instances use the machine image's mapping: one 30 GiB gp3 root volume with `DeleteOnTermination: true`, and the running instance has no other volume. A Docker volume on this disk survives a container restart, a reboot and a stop, but is deleted when the instance is terminated, which is what the Auto Scaling group does on a replacement or an instance refresh. To survive that, the data needs its own EBS volume with `DeleteOnTermination: false`, attached at boot in the same way `asg-boot.sh` already attaches the fixed network interface. Not built; the sweeper makes loss of the queue a delay, not a loss of data.
- A definitions file that creates a vhost and a Node user limited to its own queues. The default user the image creates is an administrator and must not be used by the app.
- Erlang cookie and distribution ports not reachable from outside the network.
- Reliability settings: durable queues, persistent messages, publisher confirms, consumer acknowledgements after the work, dead-letter queue, retry with delay.
- A timeout on publish, so a blocked broker cannot hang a check-in request.

## 5. Operations

- Alarms: queue depth, dead-letter queue not empty, consumer count, broker memory.
- Dashboards or log lines with job age (time from saved to done).
- Runbook entries: what to do when the dead-letter queue fills, how to republish, what to do when the broker volume is lost.

## 6. Risks to settle during the build

- The deploy candidate runs the full app, including the worker. It must not consume messages, so add a setting that turns workers off for the candidate, and stop containers with a grace period.
- Two deploys at once add memory pressure on a box that peaks near 1,513 MiB in the plan. Add a lock to the deploy documents.
- The CPU of the broker's runtime on a burstable instance: watch the credit balance.
- Publishing from the request path: use a timeout and fall back to the sweeper, never fail the check-in.

## 7. Load test (not run yet)

Plan: 1,000 check-ins with a deploy during the load, on a clone of the production layout in production mode, with a fake model endpoint that copies real response timing and size. Pass bar: memory under about 80% at peak, no container killed for memory, no failed requests, and all jobs done or in the dead-letter queue with a recorded reason.

| Run | Date | Setup | Peak memory | Queue depth peak | Jobs done | Dead-lettered | Notes |
|---|---|---|---|---|---|---|---|
| 1 | not run | | | | | | |

## 8. Experience log

Fill a row only when the step has actually happened, with the date and where the evidence is (commit, deploy, screenshot, metric).

| Step | Done on | Evidence |
|---|---|---|
| Broker running in production on the app box | not yet | |
| Definitions file with vhost and least-privilege user | not yet | |
| Check-in AI consuming from the queue | not yet | |
| Outbox row and sweeper in place | not yet | |
| Dead-letter alarm firing in a test | not yet | |
| Load test run with measured results | not yet | |
| Broker memory settings changed after a real reading | not yet | |

## 9. CV lines (empty until the work is live)

Write a line only after its row in section 8 has a date. Use the real numbers.

- Ran RabbitMQ in production on AWS EC2 behind Docker, on an internal network with a memory limit, a data volume, and a least-privilege application user. (needs the first three rows of section 8)
- Built a reliable job pipeline with durable queues, publisher confirms, acknowledgements after the work, retries, a dead-letter queue, and a database outbox with a sweeper. (needs the outbox row)
- Moved the highest-volume background job (AI feedback after a check-in) from a polling database queue to the broker, and measured a burst of <number> check-ins with a deploy during the load. (needs the load test row and its numbers)

Do not claim: a clustered or replicated broker (this is a single node), throughput or latency figures that were not measured, or any step whose row is still "not yet".
