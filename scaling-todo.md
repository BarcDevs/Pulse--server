# Scaling TODO

Post-launch / scale-up items, not launch blockers.

- **RAG-based semantic scoring for `/forum/recommendations`.**
  `computeSemanticSimilarity` (`src/lib/recommendations/scoring.ts:50-61`) is misnamed —
  it's Jaccard token overlap, not real semantic matching, so it fails on paraphrases
  (e.g. "can't sleep" vs. "insomnia" tag). Swap for embedding cosine similarity: embed
  post title+body on create (backfill via batch/cron), embed `keyIssueTags` per request,
  replace Jaccard in `scorePost`. pgvector confirmed viable on current RDS instance;
  embedding model and vector DB approach already picked. See `decisions/decisions.md`
  (2026-08-11 and 2026-08-12 entries) for full reasoning, scope, and model choice.
  Also when implementing: (1) set a minimum-similarity threshold so fewer than 5 posts are
  returned when fewer than 5 are truly relevant, instead of padding with weak matches;
  (2) build a small fixed set of query -> expected-post pairs and compare retrieval quality
  against the current Jaccard scoring, so "RAG is better" is measured, not assumed.

- **Support email confirmation + response flow, plus small admin app.**
  User submits support request → auto-confirmation email needed. Need response template(s)
  too. Also need small admin app for staff to view/respond to incoming support mails
  (separate from main client app).

- **Let Claude answer most support tickets (idea, 18/10/2026; do once the admin app exists).** Tickets are stored
  in the database and Claude reads them through a read-only endpoint with its own credential (issue #66). The next
  step is a routine that drafts a reply for each ticket and the admin app sends it, ideally with the owner approving
  or editing the draft first, the same plan-then-approve shape as the error fixer. Only the simple, clearly in-scope
  topics at first; billing, privacy and care-team messages stay human. Decide before starting: whether a reply may
  go out without approval, what Claude may say about accounts and health data, retention, and how ticket text is
  kept from steering the reply (it is untrusted user input). Not started: needs #66 and the admin app first.

- **Investigate HTTP `QUERY` method for read-only endpoints.**
  Node 24 (`http.METHODS`), Express 5 and axios all support it. `QUERY` = safe + idempotent
  read with a body, so it only fits side-effect-free reads (never forgot-password / anything
  that writes or sends mail). Find candidates where complex filters are squeezed into query
  strings today (e.g. forum search `GET /forum/posts?search=&tag=&category=&filter=`), and
  first confirm Cloudflare and the Next.js `/api` rewrite proxy pass `QUERY` through.
  Context: `docs/SECURITY-AUDIT.md` L1.

- **HIPAA compliance.**
  Health/wellness data — need to audit and bring server up to HIPAA requirements
  (encryption at rest/transit, access logging/audit trails, BAAs w/ vendors incl.
  RDS/hosting, data retention/deletion policy, breach notification process).

- **Account purge job needs a lock before scaling past one instance.**
  `scheduleAccountPurge` (`src/services/accountDeletionService.ts`) is an in-process daily
  `setInterval`. Fine while the ASG is min=max=1; with more instances every one runs it. The
  delete is idempotent so duplicates are harmless, but move it to one scheduler (EventBridge ->
  SSM, or a Postgres advisory lock) when scaling out.

- **Wire up Anthropic identity federation for the Pulse deployment (deferred).**
  Deferred 10/10/2026: the model audit dropped Anthropic from the prod chain (primary `gpt-6.1-sol`,
  fallback `gemini-3.1-flash-lite`), so there is no prod Anthropic key to replace. Revisit only if a
  new audit brings an Anthropic model back into the chain.
  Replace the static Anthropic API key in the EC2 deployment with workload identity
  federation via the instance's AWS IAM role: short-lived tokens, nothing to store in
  Secrets/`.env`, no manual rotation. Check first how the Anthropic SDK does the AWS token
  exchange and how `src/services/aiProviders/` builds its client today. Local dev and
  `scripts/eval-ai-models/` still need a static key (no cloud identity on a laptop) — keep
  those on a spend-limited dev key. See `docs/DEPLOYMENT.md` for the secrets layout.

- **Move the check-in AI job queue from the database table to SQS (decided 11/10/2026).** The job table
  (`CheckInAiJob`) is the durable queue for now. Move to SQS (queue + dead-letter queue, IAM on the instance role,
  long-polling consumer, LocalStack or stub for local dev) only when volume or separate worker machines justify it.
  Keep job claiming behind one model function so the swap is local. Cost is not the reason to wait (free tier covers
  1M requests a month); the extra infra is.
- **Push insights over a socket once the chat feature is connected (decided 11/10/2026).** Reuse the chat
  connection to tell the client an insight is ready, replacing the polling of `GET /check-in`. Needs the socket to
  work through the Next.js rewrite and Cloudflare Tunnel, and pub/sub across the 2 ASG instances.

- **Back off between check-in AI job retries (found 11/10/2026).** A failed job goes straight back to `PENDING` and the
  same drain loop claims it again, so all 3 attempts can burn within seconds during a short outage, and a re-submit
  resets `attempts` to 0. Add a `runAfter` column (delay grows with `attempts`) and make the claim skip jobs whose
  `runAfter` is in the future. Check the check-in routes' rate limit covers re-submits.

- **Re-check DB performance once there is real forum data.** (Checked 13/10/2026 over SSM, read-only: still 2 users, 0 posts,
  3 check-ins, `replyCount` drift 0, so nothing to measure yet; `newest` and `hot` plans use `Post_createdAt_idx` and
  `Post_replyCount_idx` with an incremental sort. Repeat once posts exist.) The DB-perf release was verified
  on RDS on 03/10/2026 (all 7 migrations applied, `pg_trgm` and the new indexes present, the
  old ones gone, `Post.replyCount` drift 0, the per-session `statement_timeout` enforced). Prod
  held only 2 users and no posts, so speed was not measurable. Once there are posts: run
  `EXPLAIN ANALYZE` on forum search (expect the trigram indexes, not a seq scan), watch the logs
  for `Slow database query` warnings and any `57014` cancel, and if `Post.replyCount` is ever
  suspect, reconcile it with
  `UPDATE "Post" p SET "replyCount" = (SELECT count(*) FROM "Reply" r WHERE r."postId" = p.id) WHERE "replyCount" <> (SELECT count(*) FROM "Reply" r WHERE r."postId" = p.id);`

- **Real email verification at signup (security audit H1 scaling plan).** Send the confirm-email
  code on signup (`sendConfirmEmailOTP` exists but is never called), add the client step, and
  block posting until the email is verified.

- **Evaluate Node 26 once it reaches LTS (reported 28/10/2026; check nodejs.org's schedule).** Node 26 (out 05/2026) adds
  Temporal by default, V8 14.6, Undici 8 and removes some old APIs; nothing in it fixes a current problem, and Node 24
  is Active LTS for years, so there is no urgency. Node is pinned in `Dockerfile` (builder and runner stages),
  `.github/workflows/ci.yml` (two jobs), `engines` in `package.json` and `@types/node`. Do it in its own branch,
  not together with another change: run the `stack-update-check` skill first, then bump all four and run typecheck,
  lint, unit and integration tests. Watch the Prisma 7 CJS output, `rewriteRelativeImportExtensions`, Jest 30's
  resolver mapping and tsx (the build gotchas in `CLAUDE.md`).

- **Run the server on Kubernetes (decided 15/10/2026).** Today it runs as a Docker container on EC2 behind
  `pulse-server-asg` (see `docs/ASG-MIGRATION.md`). Move it to Kubernetes (EKS or a lighter option such as k3s) to get
  hands-on orchestration experience and a base for splitting services later. Before starting: compare cost against the
  current ASG (EKS control plane is a fixed monthly fee), decide what stays outside the cluster (RDS stays), and plan how
  the blue/green deploy over SSM maps to rolling updates. Not a launch item.

- **Move migrations off the app host (decided 16/10/2026, not urgent).** `pulse-ec2-role` can read `pulse/rds/master-credentials` because `ec2-redeploy.sh` runs migrations on the server box, so a compromised app host could run DDL against RDS. Run the migrate step from CI (or a separate role used only for deploys) so the instance role keeps `pulse/rds/app-credentials` alone, then drop the master secret from `pulse-secret-read`. Needs a network path from the runner to the private RDS (SSM port forward or a one-off task in the VPC) to be designed first.

- **Turn on Multi-AZ for `pulse-db` (decided 16/10/2026).** RDS is a single `db.t3.micro` in one availability zone, so a zone or host failure means downtime until AWS recovers it. Multi-AZ keeps a synchronous standby in another AZ with automatic failover in about 1-2 minutes (same endpoint) and shortens maintenance downtime. Roughly doubles the DB cost (about $15 to $30 a month), so enable it when uptime matters more than that cost. `aws rds modify-db-instance --multi-az --apply-immediately`.
