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
