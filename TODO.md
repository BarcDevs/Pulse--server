# TODO

## LAUNCH BLOCKERS (security audit 28/09/2026)

Details, file:line refs and decisions per id in `docs/SECURITY-AUDIT.md`.

All cleared 29/09/2026 (server `b308d17`, client `b62caa9` in production). Last item, prod
email, verified: startup log shows `Email transport ready (smtp.resend.com:465)` and a real
password reset (email -> code -> new password) worked end to end.

## CRITICAL (found 10/10/2026 by the model audit)

- **Return the check-in first; generate and deliver the AI feedback afterwards.**
  `checkInService.ts` awaits `generateInsightSafely` (and recommendations) inside the check-in
  save (lines ~64, ~82, ~103) and only then returns the check-in with its insights. Up to three
  AI calls run one after another (baseline, motivational, intervention), each with a provider chain
  and one retry. The client (`CheckInContext.tsx`) shows the check-in optimistically, sends the
  request in the background and rolls the check-in back with an error toast if the request fails.
  The client reaches the server through the Next.js `/api` rewrite (`next.config.mjs`), which has no
  `proxyTimeout`, so Next's 30 s default applies. A single hanging provider already takes up to ~31 s
  (2 x 15 s attempts + 1 s), so a slow or failing AI call can fail a check-in that the server did
  save; the retry then goes down the "update existing check-in" path and generates the insights
  again. Healthy-day cost with `gpt-6.1-sol` is already ~11 s per check-in (median 5.5 s per call, 2
  calls), up to ~17 s with three.
  Target: `POST /check-ins` returns as soon as the check-in is stored, and the insights arrive
  separately when ready (the client keeps showing them as toasts). Open design points: how the
  client learns they are ready (poll `GET` for the check-in's insights a few times vs. a push channel);
  where the work runs (in-process after the response loses work on a restart, a queue or job
  survives it and keeps working with more than one instance); retries must not create duplicate
  insights; an AI failure must still store the template fallback so the user always gets a message.
  Update `docs/API.md` and both READMEs.

## HIGH (found 10/10/2026 by the model audit)

- **`GoogleAIProvider` stores replies that ended with `finishReason=MAX_TOKENS`.**
  Confirmed cause of the 79-character prod insight. Prod log, 10/10/2026 01:08 UTC: the stale Anthropic key
  returned 401 (twice), the chain fell to `google-pro` (`gemini-3.1-pro-preview`), which finished with
  `finishReason=MAX_TOKENS, tokens=1251` (thinking used the output budget), and `GoogleAIProvider` only logs
  a warning for any finish reason other than `STOP`, so the cut-off reply was stored as a normal insight
  (`contentLength` 79, `usedFallback` false). The prod chain no longer includes `google-pro`, and
  `gemini-3.1-flash-lite` showed no cutoffs in the audit, but the provider is still unguarded. Add the same
  guard `AnthropicProvider` and `OpenAIProvider` have (throw on `MAX_TOKENS`, log `thoughtsTokenCount`) plus a
  test. Audit evidence: `gemini-3.8-flash` and `gemini-3.6-flash` were cut off in 26 of 36 calls.

- **Modularise the prompt builders like `pantry` does, with one shared language-rules module.**
  (Covers and replaces the narrower "`languageInstruction` is duplicated" item under AI PROMPT QUALITY.)
  Today `languageInstruction` (no em/en dashes or typographic quotes, native phrasing, bare activity
  nouns, the Hebrew term rules) exists as two separate copies in `src/lib/aiInsight/prompts/insightsPrompts.ts`
  and `src/lib/dailyObservation/observationPrompt.ts`; the progress prompt
  (`src/lib/progressInsights/promptBuilder.ts`) and the check-in feedback prompt
  (`src/services/feedback/aiRenderer.ts`, private `buildAIPrompt`) have none, so their replies can contain
  dashes, and the progress summary has no language directive at all (Hebrew users likely get English).
  Target layout, as in `~/Claude/work/projects/pantry/src/lib/prompts/`: one file per prompt
  (`build-<name>-prompt.ts`) plus separate shared-instruction modules (language rules, "output only the
  final text / no reasoning" rule, the no-scores rule) imported by every prompt, each with a co-located test.
  Export the feedback prompt builder so the audit imports it instead of the copy in
  `scripts/eval-ai-models/scenarios.ts`. Afterwards update the audit scenarios and rules in the same change
  (AI Eval Sync) and scope the dash rule in `scripts/eval-ai-models/rules.ts` to match
  (`docs/AI-MODEL-AUDIT.md`, Caveats).

## DB PERFORMANCE FOLLOW-UPS (decided 03/10/2026, work starting soon)

Why, evidence and the RDS read-only verification recipe: `.claude/db-optimization.md` (local) and
`decisions/database-and-performance.md`. Order is by value; the first two were chosen by the owner.

- **Count post views (feature).** `Post.views` is never incremented anywhere, so the "popular" sort
  (`postQuery.ts`, `orderBy views`) has been ordering by zero; the `Post[views]` index is unused until
  this exists. Recommended design: a `PostView(postId, profileId)` table with a composite primary
  key, written on `GET /forum/posts/:id` with `createMany({ skipDuplicates: true })`, incrementing
  `Post.views` only when a row was inserted (unique viewers, no inflation by refresh). Skip the
  author's own view. Never expose who viewed (anonymity). Add tests and `API.md`; the migration must
  not backfill (no history exists).
- **Cache the profile lookup.** About 33 call sites fetch the profile (`getProfileIdForUser`,
  `getProfileContext`, `getProfileByUserId`) on every request just to get its id. Cache only stable
  fields (`id`, `timezone`) in a small in-memory map with a short TTL and invalidate on profile
  update; do NOT cache `anonymousParticipation` (changes on every post/reply choice) or serve it stale.
  The ASG can run 2 instances, so keep the TTL short instead of relying on invalidation alone. The
  alternative is putting the profile id in the JWT, which needs token reissue and a fallback.
- **Show the stored `replyCount` on post lists, and use `replyCount = 0` for "unanswered".** Lists
  still count replies per post with a join against reply authors (`postInclude` `_count`). The stored
  counter also includes replies from deactivated (pending-deletion) authors, which are hidden today.
  Decide first whether a hidden reply may still count, then switch.
- **Cursor pagination for posts and replies.** Lists use skip/offset (`page`), which slows on deep
  pages. Only matters with thousands of posts; needs a client contract change.
- **Index for the purge job.** `deleteAccountsDeletedBefore` filters `active = false AND deletedAt <= cutoff`
  with no index. Add a partial index (`WHERE active = false`) once the user table grows.
- **Enable `pg_stat_statements` on RDS** (parameter group + `CREATE EXTENSION`) to see the slowest
  queries once there is traffic; pairs with the `Slow database query` log.
- **`getProfileInteractions` id lists** (default branch) are unbounded; cap them if a user can
  accumulate thousands of likes.

## FIRST ON SCALING

- **Re-check DB performance once there is real forum data.** The DB-perf release was verified
  on RDS on 03/10/2026 (all 7 migrations applied, `pg_trgm` and the new indexes present, the
  old ones gone, `Post.replyCount` drift 0, the per-session `statement_timeout` enforced). Prod
  held only 2 users and no posts, so speed was not measurable. Once there are posts: run
  `EXPLAIN ANALYZE` on forum search (expect the trigram indexes, not a seq scan), watch the logs
  for `Slow database query` warnings and any `57014` cancel, and if `Post.replyCount` is ever
  suspect, reconcile it with
  `UPDATE "Post" p SET "replyCount" = (SELECT count(*) FROM "Reply" r WHERE r."postId" = p.id) WHERE "replyCount" <> (SELECT count(*) FROM "Reply" r WHERE r."postId" = p.id);`
- **Clean up accounts verified through the H6 bug (security audit H6, fixed 30/09).**
  Until the fix, 5 wrong codes on `POST /auth/confirm-email` marked any email verified, and a
  verified email lets a Google sign-in link into that account. The confirm-email code was never
  actually sent, so no real user verified that way. Password reset and Google also set
  `emailVerifiedAt`, so the data alone can't separate them. Candidates:
  `SELECT id, email, "emailVerifiedAt" FROM "User" WHERE "emailVerifiedAt" IS NOT NULL AND "googleId" IS NULL;`
  Safe remedy: clear `emailVerifiedAt` on those rows. A real user only loses Google-linking
  until their next password reset.
- **Real email verification at signup (security audit H1 scaling plan).** Send the confirm-email
  code on signup (`sendConfirmEmailOTP` exists but is never called), add the client step, and
  block posting until the email is verified.

## AI PROMPT QUALITY (found 09/10/2026 while generating demo feedback for the landing page)

Done on branch `fix/ai-prompt-quality` (worktree `../pulse--server.wt/ai-prompt-quality`, not merged):
- All prompts tell the model to say `מצב הרוח` (never `המצב רוח`), to avoid em/en dashes and
  typographic quotes, and to write activity names without a leading `ה` (`הליכה`, not `ההליכה`).
- The insight service now computes streak stats over all check-ins (`getCheckInDates` +
  `calculateStreaks`, dates only, one cheap query) and passes them as `metadata.stats` next to the
  7 latest check-ins. The streak is one line in the prompt: `Current streak: 18 days (best streak:
  24 days)`. The weekly prompt also gets total check-ins, average pain and today's check-in.
- A good check-in (mood 7 or more and pain 4 or less, `isGoodCheckIn`) now gets two insights: the
  usual baseline plus a `MOTIVATIONAL` one (skipped when the baseline already is `MOTIVATIONAL`,
  since `AIInsight` is unique per check-in and type). The dashboard already lists every insight of
  the latest check-in.
- `getLatestMood`, `extractRecentActivities` and `extractRecentNotes` choose the newest check-ins by
  date. Before, they assumed oldest-first while `getCheckIns` returns newest-first, so the prompts
  got the oldest activities and notes of the 7 check-ins and dropped the newest.
- The daily observation no longer hides patterns behind an earlier rule: `detectAllObservationTypes`
  lists every pattern that applies and `detectObservationType(checkIns, rotation)` shows one per
  day, rotating by days since epoch (the generic `checkin_consistency` stays a last resort, only
  when nothing specific applies).
- Tests added for all of the above.

Still open:
- **Activity name goes to the model as a raw English slug** (`walking`). Pass the localized
  label (the client has them in `messages/he-IL.json` under `checkIn.activities.default`) so the
  model does not translate it and add its own article.
- **`languageInstruction` is duplicated** in `observationPrompt.ts` and `insightsPrompts.ts`, so
  every wording fix has to be made twice. Move it to one shared module.
- **Sanitize the generated text** (replace em/en dashes and curly quotes) before it is stored,
  because a prompt rule is not a guarantee.
- **Validate weekly and motivational output the way the observation is validated** (length,
  numbers allowed or not, retry on failure). In three samples of the same weekly prompt one had
  a garbled Hebrew phrase, one said mood "rose to 8" when it was 8 the day before, and one said
  "almost without a break" for an unbroken 18-day streak.

## DONE

- **`countSentences` counted decimals as sentence ends, so AI progress summaries were rejected** (fixed 10/10/2026,
  `c197afe` on `development`, not yet redeployed). It now counts only periods followed by whitespace or the end of
  the text; 7 new tests including the real audit reply. The audit found 41 of 45 progress replies failing the
  prod check on this alone. The prod log could not confirm the effect: the container (up since 09/10 22:07 UTC)
  had no progress-summary lines at all. After the redeploy, search the log for `AI progress summary failed validation`.
- **`OpenAIProvider` stored replies cut off at the token limit** (fixed 10/10/2026, `afaf064`): it now throws on
  `finish_reason=length`, like `AnthropicProvider`. The Google equivalent is still open (HIGH).
- **Prod AI chain moved to `gpt-6.1-sol` primary with `gemini-3.1-flash-lite` fallback** (10/10/2026, `b03c6d4`):
  Anthropic and `google-pro` left the chain, `openaiModel` default is `gpt-6.1-sol`, and the chain logs a warning
  when it skips a provider for a missing key (`3282657`). Prod checked: no env overrides on the container, the
  OpenAI and Google secrets match the audited keys. Decisions in `decisions/ai-and-rag.md`.
- **Repeatable AI model audit** (10/10/2026): `scripts/eval-ai-models/`, process and results in
  `docs/AI-MODEL-AUDIT.md`, how to add scenarios for a new AI pipeline in `workflow/05-adding-ai-pipeline.md`.
- **Monitor agent for production errors** (built by the `aws-monitor` session; first commit e3e764c on 29/09/2026,
  last change 09/10/2026; resolved in this list 10/10/2026). Scripts in `scripts/monitor/` (`pull-prod-logs.sh`,
  `checkpoint.ts`, `filterSince.ts`, `processLogs.ts`), recorded fixes in `docs/prod-errors/`.
