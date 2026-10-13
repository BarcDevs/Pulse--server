# TODO

## LAUNCH BLOCKERS (security audit 28/09/2026)

Details, file:line refs and decisions per id in `docs/SECURITY-AUDIT.md`.

All cleared 29/09/2026 (server `b308d17`, client `b62caa9` in production). Last item, prod
email, verified: startup log shows `Email transport ready (smtp.resend.com:465)` and a real
password reset (email -> code -> new password) worked end to end.

## CRITICAL

None open.

## HIGH (found 10/10/2026 by the model audit)

## DB PERFORMANCE FOLLOW-UPS (decided 03/10/2026, work starting soon)

Why, evidence and the RDS read-only verification recipe: `.claude/db-optimization.md` (local) and
`decisions/database-and-performance.md`. Order is by value; the first two were chosen by the owner (the first two are done, see DONE).

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
- **Sanitize the generated text** (replace em/en dashes and curly quotes) before it is stored,
  because a prompt rule is not a guarantee.
- **Validate weekly and motivational output the way the observation is validated** (length,
  numbers allowed or not, retry on failure). In three samples of the same weekly prompt one had
  a garbled Hebrew phrase, one said mood "rose to 8" when it was 8 the day before, and one said
  "almost without a break" for an unbroken 18-day streak.

## LOW PRIORITY (non-blocking)

- **Evaluate Node 26 once it reaches LTS (reported 28/10/2026; check nodejs.org's schedule).** Node 26 (out 05/2026) adds
  Temporal by default, V8 14.6, Undici 8 and removes some old APIs; nothing in it fixes a current problem, and Node 24
  is Active LTS for years, so there is no urgency. Node is pinned in `Dockerfile` (builder and runner stages),
  `.github/workflows/ci.yml` (two jobs), `engines` in `package.json` and `@types/node`. Do it in its own branch,
  not together with another change: run the `stack-update-check` skill first, then bump all four and run typecheck,
  lint, unit and integration tests. Watch the Prisma 7 CJS output, `rewriteRelativeImportExtensions`, Jest 30's
  resolver mapping and tsx (the build gotchas in `CLAUDE.md`).

## DONE

- **Reply totals come from the stored `replyCount`** (done 13/10/2026, branch `perf/post-list-reply-count`). Post lists,
  the post detail and recommendations no longer join replies against their authors: `withReplyCount` (`postQuery.ts`)
  fills `_count.replies` from `Post.replyCount`, and the `unanswered` filter is `replyCount = 0`. Decision: replies of
  accounts pending deletion DO count (they stay in the thread only once the account is purged), so for the grace period
  a post can show a total one higher than the replies visible. Response shape is unchanged, no client change.
- **Profile lookup cached** (done 13/10/2026, branch `perf/cache-profile-lookup`). `profileModel.findProfileContext` keeps
  `{ id, timezone }` per user in `lib/cache/profileContextCache.ts` for 30 s (cap 10,000 entries, misses never cached) and
  `updateProfile` invalidates it. `getProfileContext` and both `getProfileIdForUser` use it. `getProfileByUserId` (the full
  profile, with `anonymousParticipation`) is untouched. Another instance can serve an old timezone for up to 30 s.
- **Post views counted** (done 13/10/2026, merged into `development`, not pushed). New `PostView(profileId, postId,
  lastViewedAt)` table and `POST /forum/posts/:postId/view`: one counted view per profile per post per rolling 24h,
  author skipped, `Post.views` incremented only when counted, no backfill. The client calls it on post detail mount
  because it serves posts from the list cache and often makes no GET. Design and why: `decisions/feature-design.md`.
- **Prompt builders modularised, one shared rules module** (done 12/10/2026, branch `rfc/prompt-builders`, not yet
  merged). Every prompt now lives in `src/lib/prompts/` as `<Name>PromptBuilder.ts` class (mood drop, motivational, weekly
  summary, observation, progress insight, check-in feedback). Each extends the abstract `PromptBuilder`, whose `build()`
  always assembles role, language rules (`languageInstruction`), body and output rules, so a prompt cannot skip them; shared
  pieces live in `sharedInstructions.ts`. Call sites use `new XPromptBuilder().build(input, language)`. The progress and feedback prompts now carry
  the language and no-dashes rules, and the progress summary gets the user's language (`resolveSummary` takes it; before,
  Hebrew users got English). The feedback prompt is exported and the audit imports it instead of the copy. Behaviour
  change to know: the feedback prompt's `Language: he` line became the full language instruction. Still open: the
  audit has not been rerun on the changed progress and feedback prompts.

- **`GoogleAIProvider` stored replies that ended with `finishReason=MAX_TOKENS`** (fixed 12/10/2026, branch
  `fix/google-max-tokens-guard`, not yet merged). It now throws on `MAX_TOKENS` (logging `thoughtsTokenCount`), like the
  Anthropic and OpenAI providers, so a cut-off fallback reply falls through to the template instead of being stored.
  Google is only the fallback in prod, but a fallback runs exactly when the primary failed. Cause of the 79-character
  prod insight on 10/10/2026: `google-pro` ended with `MAX_TOKENS` after thinking used the output budget.

- **A superseded check-in AI job could overwrite newer insights** (fixed 12/10/2026, branch `fix/superseded-ai-job-writes`,
  not yet merged). The worker passes a `canWrite` guard (`jobModel.holdsClaim`: status `RUNNING` and `lockedAt` equal to
  the claim token) into `generateInsightForCheckIn` and `generateRecommendationsSafely`, which check it right before each
  insight, intervention and recommendation-snapshot write and drop the result with a warning when the claim is gone.
  The check and the write are two statements, so a sliver of a race remains, but the old window was the whole AI call.

- **Activity names reached the AI prompts as raw English slugs** (fixed 11/10/2026, branch `fix/localized-activity-names`,
  not yet merged). Hebrew feedback said `walking` instead of `הליכה`. `localizeActivity` (`src/lib/activityLabels.ts`)
  maps a slug to its label from a new `activities` map in `src/locales/en.json` and `he.json` (the client's
  `checkIn.activities.default` labels plus `yoga` and `medical`); custom activities pass through unchanged. Used by the
  insight prompts (recent and top activities) and the daily observation (prompt and template). The server keeps its
  own copy of the labels: when the client adds a default activity, add it to both server locale files.

- **Check-in returns first, AI feedback is generated afterwards** (done 11/10/2026, branch `feat/checkin-async-ai`, not
  yet deployed; client `feat/checkin-async-insights` must ship after the server). `POST`/`PATCH /check-in` store the
  check-in and queue a `CheckInAiJob` row; a worker started with the server claims jobs (`FOR UPDATE SKIP LOCKED`),
  runs insights and recommendations, retries up to 3 times, and takes over a `RUNNING` job after 2 minutes (dead
  worker). Every check-in carries `insightsStatus: 'pending' | 'ready'`; the client polls `GET /check-in?limit=1`.
  Verified end to end 11/10/2026 against a throwaway Postgres with real AI keys: POST in ~80 ms, insights ready ~3 s
  later, same-day re-submit re-queues, stale-job takeover works. Deploy needs `prisma migrate deploy` on RDS
  (migration `20261011120000_add_check_in_ai_job`). SQS and socket push are in `scaling-todo.md`.

- **`countSentences` counted decimals as sentence ends, so AI progress summaries were rejected** (fixed 10/10/2026,
  `c197afe` on `development`, not yet redeployed). It now counts only periods followed by whitespace or the end of
  the text; 7 new tests including the real audit reply. The audit found 41 of 45 progress replies failing the
  prod check on this alone. The prod log could not confirm the effect: the container (up since 09/10 22:07 UTC)
  had no progress-summary lines at all. After the redeploy, search the log for `AI progress summary failed validation`.
- **`OpenAIProvider` stored replies cut off at the token limit** (fixed 10/10/2026, `afaf064`): it now throws on
  `finish_reason=length`, like `AnthropicProvider`. The Google equivalent was fixed 12/10/2026 (see below).
- **Insights said "your mood is 8" / "your pain stays around 3"** (fixed 10/10/2026, `NO_SCORES_RULE` in
  `insightsPrompts.ts`, used by the mood-drop, motivational and weekly prompts). Checked by the audit session:
  8 runs per prompt on `claude-sonnet-5`, Hebrew, 0 of 24 replies quoted a score with the rule, against 7-8 of 8
  (mood drop), 4 of 8 (motivational) and 8 of 8 (weekly) without it; same on 14 other models. No validator needed.
- **A prod `MOTIVATIONAL` insight was stored cut off mid-sentence** (found 10/10/2026, 79 characters). Cause
  confirmed from the prod log: Anthropic returned 401 (stale key), the chain fell to `google-pro`, which ended with
  `finishReason=MAX_TOKENS` and `GoogleAIProvider` stored it. The open fix is the Google guard in HIGH above. The
  `stop_reason=max_tokens` guard added to `AnthropicProvider` here was not the cause and is a safeguard only, since
  Anthropic left the prod chain.
- **Prod AI chain moved to `gpt-6.1-sol` primary with `gemini-3.1-flash-lite` fallback** (10/10/2026, `b03c6d4`):
  Anthropic and `google-pro` left the chain, `openaiModel` default is `gpt-6.1-sol`, and the chain logs a warning
  when it skips a provider for a missing key (`3282657`). Prod checked: no env overrides on the container, the
  OpenAI and Google secrets match the audited keys. Decisions in `decisions/ai-and-rag.md`.
- **Repeatable AI model audit** (10/10/2026): `scripts/eval-ai-models/`, process and results in
  `docs/AI-MODEL-AUDIT.md`, how to add scenarios for a new AI pipeline in `workflow/05-adding-ai-pipeline.md`.
- **Monitor agent for production errors** (built by the `aws-monitor` session; first commit e3e764c on 29/09/2026,
  last change 09/10/2026; resolved in this list 10/10/2026). Scripts in `scripts/monitor/` (`pull-prod-logs.sh`,
  `checkpoint.ts`, `filterSince.ts`, `processLogs.ts`), recorded fixes in `docs/prod-errors/`.
