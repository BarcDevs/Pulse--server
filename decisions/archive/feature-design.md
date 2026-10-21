# Decisions — Feature & Product Design (archive)

Superseded entries moved here from [[decisions/feature-design]]. Not current guidance.

---

## 19/10/2026 — Check-in AI jobs: two attempts, 10 s apart (issue #65)

*Archived 20/10/2026: `runAfter` is now written with the database clock and a re-submit uses a fixed epoch date, so the app-clock caveat below no longer holds (issue #69). Replaced by the entry of the same title in `decisions/feature-design.md`.*

**Problem:** a failed job went straight back to `PENDING` and the same drain loop claimed it again, so every attempt could burn within seconds during a short outage.

**Decision (owner):** at most 2 attempts (one initial, one retry), with a fixed 10 s delay stored in a new `CheckInAiJob.runAfter` column. `claimNextJob` takes a `PENDING` job only when `runAfter <= now()`; a re-submit resets `attempts` to 0 and `runAfter` to now, so changed data is processed at once. The owner rejected three attempts: the AI fallback model and the static template already run inside a single attempt, so a job retry only covers infrastructure errors.

**Why over alternatives:** growing backoff (10 s, 30 s) was the first plan and was dropped with the third attempt. An in-memory delay in the worker loses the delay on restart and ignores other instances. The re-submit reset stays because the check-in rate limit (5 per user per day) already bounds it.

**How to apply:** change the attempts or the delay only in `src/constants/checkInAiJob.ts`. The migration must run before the new code is deployed (the claim and enqueue queries use `runAfter`); otherwise check-ins submitted in between get no job. `runAfter` is written from the app clock and compared with the database `now()`, which is fine at 10 s on one NTP-synced fleet.
