# Decisions — Database & Performance

⚠️ Load only when following a link from [[decisions/index]] for a specific entry, or scanning for
context in this topic — not routinely. Deep detail, evidence and how-tos live in
`.claude/db-optimization.md` (local, gitignored).

---

## 03/10/2026 — DB performance pass: what was decided and why (work done 02/10, verified on RDS 03/10)

**Problem:** a read-through of the schema and every model found unindexed sorts and filters, an unbounded `ILIKE '%term%'` forum search, a reply count recomputed per post for the "hot" sort, an unconfigured connection pool and no way to see slow queries.

**Decisions (all shipped in PR #51):**
- **RDS first.** Production is RDS Postgres 17.10 on `db.t3.micro` (`max_connections` 81), migrations run as `pulse_admin`, the app as `pulse_app` (no DDL), and the redeploy gate refuses `DROP`/`RENAME COLUMN|TABLE`. Every change was designed against that; Neon is only the local test bed. Index-only changes (`CREATE`/`DROP INDEX`) pass the gate.
- **Trigram indexes for search** (`pg_trgm` + GIN on `Post.title`, `Post.body`, `User.username`) over full-text search or pgvector: it keeps the current substring semantics with no query change. Revisit only if search quality, not speed, becomes the problem.
- **Stored `Post.replyCount`, maintained in the application** (create/delete reply in one transaction), not a DB trigger and not a cache. A trigger was only attractive while a user purge could cascade-delete replies; since replies now survive a purge (see `decisions/security.md`, 02/10/2026) the counter changes only on explicit reply create/delete. The migration backfilled it; it was verified exact on dev and on RDS.
- **`statement_timeout` is set per session on connect** (`SET statement_timeout`), 15s by default, because Neon silently drops the startup parameter. Verified enforced on both Neon endpoints and on RDS.
- **Slow-query log:** queries over `database.slowQueryMs` (200ms) are logged as warnings with SQL text and duration only; bound parameters are never logged (they can hold emails and notes).
- **Pool:** `max` 10, connection timeout 5s, idle 30s, all from config. Keep `2 x max x instances` under the instance's `max_connections` (a redeploy briefly runs two containers).
- **Five redundant indexes dropped** (each a leading-column duplicate of a unique constraint or primary key).
- **Caps that bound work:** `includePosts` returns the newest 100 of each list; a post has at most 5 tags (the client already limited to 5).

**Rejected, with reasons:**
- *Toggle likes/saves inside one transaction:* in Postgres a failed insert aborts the transaction, which would break the existing duplicate-key race guard, and it would not cut round trips.
- *Case-insensitive tag search:* changes behavior for no measurable gain (tiny table).

**Decided to do next (owner, 03/10/2026; tracked in `TODO.md` under "DB performance follow-ups"):**
- **Count post views** (feature, not only an optimization): `Post.views` is never incremented anywhere, so the "popular" sort has been ordering by zero. Worth building properly.
- **Cache the profile lookup:** about 33 call sites fetch the profile from the DB on every request just to get its id.
- **Smaller items** (list reply counts from `replyCount`, "unanswered" via `replyCount = 0`, cursor pagination, an index for the purge job, `pg_stat_statements`) are recorded as TODOs; the first two need a decision on hidden-author replies first.

**How to apply:** check the RDS constraints before designing any DB change, ship indexes as their own migration, and verify on RDS read-only over SSM (recipe in the deep doc) once data exists. Do not wrap the toggle write path in a transaction.
