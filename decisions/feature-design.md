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
