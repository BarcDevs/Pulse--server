# Decisions — Feature & Product Design

⚠️ Load only when following a link from [[decisions/index]] for a specific entry, or scanning for
context in this topic — not routinely.

---

## 10/04/2026 — Reflective Feedback / Bad Day Support intervention system: known design tradeoffs

**Implemented (MVP):** Weight-based low-state detection with clamped ranges [0.7-1.0]/[0.6-1.0]/[0.5-0.9]; mode degradation FULL -> SOFT -> SILENT based on consecutive occurrences; emotional severity priority rules (LOW_MOOD <=2 always primary, HIGH_PAIN >=9 secondary); intervention tracking preserved internally even in SILENT mode. Code: `src/services/feedback/` (`interventionOrchestrator.ts`, `interventionSuppression.ts`, `interventionLogger.ts`, `aiRenderer.ts`, `messageAssembler.ts`).

**Known tradeoffs, not yet fixed:**
1. **Fixed weight ranges bias toward users with naturally low mood** (e.g. chronic-depression baseline) — LOW_MOOD constantly triggers at weight >=0.7 for them vs. rarely for a baseline-7 user. Fix: per-user baseline calibration after a 30-day burn-in, normalize thresholds relative to the user's own distribution. Priority: medium, after retention stabilizes.
2. **SILENT mode shows nothing to the user** — solves notification fatigue but risks reading as "the system stopped caring." Options considered: (A) subtle "we're monitoring, rest easy" UI indicator, (B) batch SILENT insights into a weekly digest, (C) optional "here's why we're quiet" explanation. Priority: medium, implement if retention dips during SILENT phases.
3. **No effectiveness measurement loop** (the big one) — interventions are generated/suppressed with no metric validating the strategy works: no data yet on whether interventions improve next-day mood, whether mode degradation helps or hurts retention, or which users benefit from suppression vs. constant support. Fix: track `nextDayMoodDelta` and `engagementResponse` ('checked_in'/'skipped'/'abandoned') per intervention (mode, primaryReason, severity), starting an outcome-correlation table `InterventionOutcome`. Unlocks A/B analysis (SOFT vs FULL), reason/severity effectiveness tuning, engagement early-warning, and decision-rule retraining from real outcomes instead of just detection thresholds. Depends on 30+ days of production data. Priority: high once that data exists — this is the structural blocker for optimizing the whole system.

**Monitoring queries to run once in production** (against `interventionLogger` output):
- **SILENT-mode engagement risk:** flag a user with >=2 consecutive SILENT interventions AND a missing check-in the next calendar day. Warning at ~5% of users, critical at >10% with 3+ consecutive SILENT + 2 missed check-ins. Action: sample 5-10 affected users, check profile notes, A/B an ultra-soft acknowledgment against SILENT if it's a UX issue.
- **AI/fallback tone drift:** flag `fallbackUsed=true` on day N followed by `aiUsed=true` within 2 days with `toneMismatchRisk=true`. Warning at >5 users/week, critical at >20 (likely model divergence). Action: manually audit AI vs. fallback messages for the same (reason, severity) pair; update fallback templates or check for AI prompt drift.
- Run SILENT-risk daily, tone-drift ~3x/week. Do not tune thresholds, add intervention types, or expand the AI prompt until 30+ days of production data exists.

**How to apply:** When picking up any of these (post-MVP, per the priorities above), start from `src/types/feedback.ts` and `src/services/feedback/interventionLogger.ts` for the existing logged fields (`silentModeUsed`, `fallbackUsed`, `aiUsed`, `toneMismatchRisk`, `primaryReason`, `severity`) — the outcome/monitoring work builds on top of what's already logged, no new instrumentation needed to start.

---

## 27/09/2026 — Error-code granularity: per-factory-method, not per-resource

**Problem:** Implementing the locked 2026-09-15 error-code decision (server stays language-agnostic,
client owns translation table) required picking a code shape for ~75 `errorFactory.*` call sites,
notably `errorFactory.generic.notFound('Post'|'Milestone'|'Goal'|'User'|...)` — 15+ open-ended
resource names passed as dynamic English text.

**Decision:** One fixed `code` per factory method (e.g. `NOT_FOUND`, `AUTH_UNAUTHORIZED`,
`VALIDATION_GENERIC`) — ~13 codes total — rather than a distinct code per resource
(`NOT_FOUND_POST`, `NOT_FOUND_MILESTONE`, ...). The resource/property name moves to a
`params: Record<string, string>` field on the error (e.g. `params: { resource: 'Post' }`) for
client-side interpolation, alongside the existing English `message` (kept as-is, diagnostics only).

**Why over per-resource codes:** per-resource codes would mean a new client translation entry
every time a new resource type is added server-side — open-ended and easy to silently miss. Fixed
codes + `params` keep the client's translation table bounded and resource-agnostic.

**How to apply:** `src/constants/errorCodes.ts` is the single source of truth for the code set —
add a new code only when a genuinely new *category* of error is introduced (new factory method),
never per resource/entity. `CustomError` and all four subclasses take `code` as their 2nd
constructor arg and an optional `params` as their last; `serializeErrors()` includes both. Code:
`src/errors/`, `src/errors/factory/`, `src/middlewares/errorHandler.ts` (fallback uses
`INTERNAL_ERROR`). Docs: `README.md#error-responses`, `docs/TECHNICAL_PRD.md`, client `README.md`.

---

## 13/04/2026 — Goals/Milestones stats endpoint: streak definition and schema

**Streak definition (chosen):** consecutive calendar days with >=1 completion event (goal OR milestone combined) — not "consecutive completions in sequence," which is meaningless once a user has multiple goals running at once. Aligns with habit-formation psychology and stays stable for coaching logic across multiple goals. Code: `src/lib/checkInStats.ts`, `src/controllers/recoveryGoalController.ts`.

**Response shape:** a compact aggregation DTO per goals/milestones (`totalCreated`, `completed`, `completionRate`, `streak`, `active`, `paused`, `byCategory` for goals) — deliberately excludes timeline/daily breakdown, which belongs in a separate future analytics endpoint. Filters: `fromDate`/`toDate` (ISO 8601), `category` (PHYSICAL/MENTAL/LIFESTYLE, filters goals only - milestones inherit via their goal's category).

**Why designed this way:** this endpoint is meant as a telemetry-layer foundation for AI insight generation, relapse-pattern detection, and engagement risk scoring later — kept compact now specifically to avoid a rewrite when those consumers show up.

---

## 10/08/2026 — Check-in gap detection for intervention feedback

**Problem:** `contextBuilder.ts` builds AI intervention context from the last 7 check-in records (`checkInModel.getCheckIns(profileId, 7)`), ordered by `checkInDate desc`. If a user has a reporting gap (e.g. 3 weeks of silence), those 7 records can span a much longer real time window than 7 days. `determineTrendDirection` computed mood/pain deltas across that window with no gap awareness, so the AI could describe a "trend" that's actually two disconnected time periods — factually derived from real data, but temporally misleading.

**Decision:** Don't change the fetch (still `take: 7`, no date-range query, no extra DB round-trip). Instead, derive the gap from `checkInDate` values already in hand:
- Added `FEEDBACK_DETECTION.TREND.GAP_DAYS_THRESHOLD` (`src/constants/feedback/detection.ts`).
- Added `gapDays` to `InterventionContext.trend` (`src/types/feedback.ts`), computed as the largest gap between consecutive check-ins in the window (`contextBuilder.ts: calculateMaxGapDays`).
- If `gapDays >= GAP_DAYS_THRESHOLD`, `determineTrendDirection` forces `'stable'` instead of computing a delta.
- `aiRenderer.ts` prompt includes an explicit note when the gap exceeds threshold, instructing the AI not to imply a continuous trend.

**Why this approach over alternatives:** A date-windowed query (e.g. `WHERE checkInDate >= now() - 7d`) would silently return fewer/zero records on a gap instead of surfacing it, and adds a query variant to reason about. Computing the gap from already-fetched data costs nothing extra and lets both the deterministic trend math and the AI prompt react to it explicitly.

**How to apply:** Any other consumer of `getCheckIns` history for trend/streak logic (e.g. `progressInsightsService.ts`, `recommendationsService.ts`) should be checked for the same blind spot if it computes deltas across a record window without checking `checkInDate` continuity.

Implementation uses the existing `dayInMs` from `src/constants/time.ts` for the ms→days conversion (caught in review — first pass hardcoded `1000 * 60 * 60 * 24` instead of checking for an existing time-constants file).

**Follow-up (12/08/2026):** `GAP_DAYS_THRESHOLD` started at 10, dropped to **7** — too large relative to the 7-check-in fetch window; symmetric with it is simpler to reason about ("gap exceeding one check-in cycle voids the trend").

**TODO (future):** expose `trend`/`gapDays` to the client response — currently computed but discarded after prompt-building, only the AI's free-text output reaches the user. Positive ('up') trends are already fed into the AI prompt today, just not surfaced as structured data. **TODO (future):** split intervention feedback into two distinct messages (trend-change feedback + supportive feedback) instead of one blended AI response.

---

## 02/10/2026 — Anonymity is chosen per post/reply, not in settings

**Problem:** anonymity was one profile-wide setting (`anonymousParticipation`, default true) in the settings page, so a user could not be anonymous in one thread and named in another.

**Decision (owner):** each post and reply carries its own `isAnonymous` flag, chosen with a toggle on the post and reply forms, and the settings toggle goes away. The toggle starts from the user's last choice, which is stored on the profile (the existing `anonymousParticipation` column, now meaning "last choice" and updated on every create) and is not shown in settings. The alias stays the same per user (`anonymous-<profile id prefix>`), so one voice can be followed in a thread. Owner confirmed the linking is intended, not a cost: a different alias on every post or reply would be confusing, because the same person would look like many strangers. The flag is fixed at creation and can't be edited afterwards. Existing posts and replies are backfilled from their author's current setting (no real data existed at decision time).

**Why over alternatives:** a new alias per post would stop linking but make a user look like a stranger in their own thread; defaulting always to anonymous or always to named was rejected in favor of remembering the last choice so the form matches what the user usually wants.

**How to apply:** the author shown on a post or reply comes from that item's `isAnonymous`, never from the profile. The old profile column is kept (the deploy gate blocks DROP COLUMN) and only stores the last choice.

---

## 02/10/2026 — The anonymity toggle starts off (named) until the user has chosen otherwise

Follows the per-post anonymity entry above and changes its default.

**Decision (owner):** the toggle on the post and reply forms starts OFF. It only starts ON if the user's previous post or reply was made anonymous. The remembered value (`Profile.anonymousParticipation`) therefore defaults to `false`, and the migration reset every existing profile to `false`, because the old value was just the old default (the column cannot tell a stored default from a real choice, and nobody had chosen under the per-post model). Posts and replies already created keep their own `isAnonymous`, so nothing visible changed.

**Why:** the owner wants named posting to be the starting point and anonymity to be an explicit choice each time it is first made.

**How to apply:** a new profile is created with `anonymousParticipation = false`; never seed or backfill it to `true`.

---

## 09/10/2026 — AI insight prompts: Hebrew wording rules, and one streak line over all check-ins

**Problem:** generated Hebrew said "המצב רוח", used an en dash and "ההליכה". The streak in the prompt was computed from the 7 latest check-ins only, so it could never exceed 7 while the dashboard showed the real one (18).

**Decision (owner):** the language instruction of every insight and observation prompt now says: use the exact term `מצב הרוח` for mood, never use em dashes, en dashes or typographic quotes, and write activity names as bare nouns without a leading definite article. The insight service also computes current streak, best streak and total check-ins over all check-ins (one dates-only query) and passes them as `metadata.stats`. The prompt still receives only the 7 latest check-ins. The streak is one line: `Current streak: 18 days (best streak: 24 days)`. The weekly prompt also gets total check-ins, average pain and today's check-in.

**Why over alternatives:** sending more than 7 check-ins costs tokens and changes what a "weekly" summary is about, while the stats are one line. Fixing the wording in the prompt (not in the saved text) keeps every future generation right.

**How to apply:** `languageInstruction` still exists in two files (`observationPrompt.ts`, `insightsPrompts.ts`), so change both until it is deduplicated. The database returns check-ins newest first, so helpers pick "latest" and "recent N" by `checkInDate` (`getLatestMood`, `extractRecentActivities`, `extractRecentNotes`), never by array position.

---

## 09/10/2026 — A good check-in gets two insights: the baseline and a motivational one

**Decision (owner):** when a check-in is good (mood 7 or more and pain 4 or less, `isGoodCheckIn`), the service creates the usual baseline insight and then also a `MOTIVATIONAL` insight (classification `baseline`). It is skipped when the baseline already is `MOTIVATIONAL`, because `AIInsight` is unique on (checkInId, type). Both use the same stats.

**Why over alternatives:** low check-ins already get an intervention insight, good ones got only the generic summary. A second insight needs no schema change and the dashboard already lists every insight of the latest check-in.

**How to apply:** the thresholds equal the daily observation's `better_days_pattern` (separate constants today, change both together). Ordinary check-ins still get exactly one insight.

---

## 09/10/2026 — Daily observation rotates through every pattern that applies

**Problem:** `detectObservationType` returned the first rule that matched. `activity_consistency` (an activity in 3 of the last 5 check-ins) is first, so `pain_improvement` and `better_days_pattern` were never reached for anyone who logs activities.

**Decision (owner):** "the order shouldn't hide anything". `detectAllObservationTypes` lists every pattern that applies; `detectObservationType(checkIns, rotation)` shows one, and the service passes days since epoch, so each pattern gets its turn on different days. The generic `checkin_consistency` stays a last resort, used only when nothing specific applies.

**Why over alternatives:** reordering priorities would only hide a different pattern. Showing several cards at once was not wanted (one card per day, cached per day).

**How to apply:** add a pattern by pushing to the list in `detectAllObservationTypes`, never with an early `return`. The default `rotation = 0` keeps the old first-match behavior for callers that do not pass one.
