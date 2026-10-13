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

---

## 13/10/2026 — Profile lookup cached in memory for 30 s, id and timezone only

**Problem:** about 27 call sites read the profile row on every request just for its id (and timezone).

**Decision (owner):** an in-process map `userId -> { id, timezone }` with a 30 s TTL (`PROFILE_CONTEXT_TTL_MS`) and a 10,000 entry cap. `updateProfile` invalidates the entry. Only `getProfileContext` and the two `getProfileIdForUser` use it; `getProfileByUserId` still reads the DB.

**Why over alternatives:** the id never changes and the timezone rarely does, while `anonymousParticipation` changes with every post or reply choice and so stays uncached. The ASG can run 2 instances and invalidation reaches only the instance that handled the update, so the short TTL is what bounds staleness (a different timezone for at most 30 s). Putting the id in the JWT needs token reissue and a fallback for old tokens, for no gain over this.

**How to apply:** never add a mutable field to the cached shape. Any new write to `Profile.timezone` must call `profileContextCache.invalidate`.

---

## 13/10/2026 — Reply totals read from `Post.replyCount`; replies of pending-deletion authors count

**Problem:** every post list counted replies with a join against reply authors, to hide replies of deactivated (pending-deletion) accounts. The stored `replyCount` counts them.

**Decision (owner, via the TODO):** use the stored counter everywhere (`_count.replies` is filled from it, the response shape is unchanged) and `replyCount = 0` for "unanswered". A reply of a pending-deletion author still counts, though it is hidden in the thread, so during the grace period the total can be one higher than the replies shown.

**Why over alternatives:** keeping the exact count means a join per post on every list, or adjusting the counter on every deactivate and restore, which is a write path across many posts for a state that lasts days. The reply survives the purge anyway (as `deleted-user`), so the counter is the long-run truth. The only leak is a number, not content.

**How to apply:** any new place that returns a post must go through `withReplyCount`. Create or delete a reply only inside the existing transaction that moves `replyCount`; a test that inserts replies straight into the table must seed `replyCount` too.

---

## 13/10/2026 — Plain `deletedAt` index for the purge, and a 1000 cap on interaction id lists

**Problem:** `deleteAccountsDeletedBefore` filters `active = false AND deletedAt <= cutoff` with no index, and `getProfileInteractions` (default branch) returned every liked/saved id a profile ever made.

**Decision (owner, via the TODO):** `@@index([deletedAt])` on `User` and `take: 1000` (newest first) on the three id lists.

**Why over alternatives:** a partial index (`WHERE active = false`) was the TODO's idea, but Prisma's schema has no partial-index syntax, so a hand-written one is reported as drift by every `migrate dev` and invites a drop. `deletedAt` is NULL for active users, so a range filter on it is selective anyway. The cap is far above realistic use (the full-post branch caps at 100); the cost of passing it is only that older likes show unmarked.

**How to apply:** raise `MAX_PROFILE_INTERACTION_IDS` before the cap is a user-visible limit; never hand-write an index Prisma cannot model.
