# Test Coverage Audit — Error/Edge Cases

**Date:** 2026-06-04 (extended 2026-06-04)
**Branch:** tests
**Scope:** `src/__tests__/` — all 67 test files

---

## Summary

~65-70% error/edge case coverage.
Strong in validation, auth security, models, cache. Remaining gaps: concurrent requests, OAuth failure paths.

---

## By Category

### Middlewares — 70% error coverage (strongest)
- `isAuthenticated`: malformed tokens, expiration, wrong secrets, empty tokens (6+ scenarios)
- `errorHandler`: all custom error types (Auth, Validation, NotFound) with correct status codes
- **Missing:** partial middleware chains, error handler stack ordering

### Schemas — 70% error coverage
- Password pattern (uppercase, lowercase, digits), email format, length constraints
- Boundary lengths (username 3–30 chars), special char rejection, TLD variations
- **Missing:** SQL injection patterns, XSS payloads, extremely long inputs (10K+ chars)

### Routes — 55% error coverage
- Missing fields (7+ tests), invalid formats, conflicts, expired OTP, non-existent users
- **Missing:** network errors during Prisma calls, cascading service failures

### Cache Layer — ✅ filled (2026-06-04)
- Added: `progressInsightsCache.test.ts` — hit/miss, TTL expiry, key isolation, overwrite, cleanup, clear
- Added: `dailyObservationCache.test.ts` — hit/miss/null, TTL expiry, per-user isolation, overwrite, cleanup on set

### Libs — ✅ filled (2026-06-04)
- `authOTP`: OTP mismatch, user not found, expiration, wrong OTP
- Added: SMTP + DB failure propagation for `sendForgotPasswordOTP`, `sendConfirmEmailOTP`, `sendEmailChangeOTP`
- Added: `calculateAverageMood/Pain/TopActivities` — empty, single, multi, N=50, no-activities, fractional avg
- Added: `forumHelpers.test.ts` (new) — `extractRemovedTags` boundary cases (undefined, empty, partial/full overlap, N=50), `ensurePostExists` (found, not found, model error), `validateOwnerHelper` (post/reply, wrong author, missing replyId)

### Services — ✅ filled (2026-06-04)
- Auth: duplicate email, missing user, wrong password, expired OTP, DB conflicts
- CheckIn: P2002 constraint violations, missing records, timezone edge cases
- Added: external service failure paths, model-throw propagation, `handleCallback` full coverage (21 new tests)

### Controllers — ✅ filled (2026-06-04, extended 2026-06-04)
- Added: `recommendationsController` — auth guard (missing userId), service propagation, empty response
- Auth failures, invalid input, missing userId
- Added: service error propagation for all CheckIn, UserController, ProfileController, RecoveryGoalController handlers
- Added: ForumController — likePost, likeReply, savePost, getSavedPosts, reportUnknownTag, getUnknownTagAttempts, getCategoryStats (auth + happy + service-throw)
- Added: validateOwner throw paths for updatePost, updateReply, deleteReply
- Added: getSavedPosts null→[] coercion, savePost/likePost toggle (liked/unliked, saved/unsaved)
- 144 controller tests total, all passing

### Models — ✅ filled (2026-06-04, extended 2026-06-04)
- Added: `aiInsightModel` — upsert (create/update, metadata, defaults), findMany (limit, empty), findFirst (null, error)
- Added: `forumModel` — posts CRUD, replies CRUD, tags, togglePostLike/ReplyLike/SavePost, getCategoryStats, trackUnknownTagAttempts
- Added: `recommendationsModel` — saveSnapshot, getLatestSnapshot, getSnapshotWithFlags, setPendingGeneration, getCandidatePosts
- Added: `getUserByUsername`, `setUserOTP`, `setEmailChangeOTP`, `updateEmail`, `linkGoogleId` (authModel)
- Added: Prisma error propagation for `getUserById`, `createUser` mid-transaction, `updateUser`, `deleteUser`
- Added: `updateUserLastCheckIn`, custom limit, empty results, P2002/P2025 propagation (checkInModel)
- Added: `updateProfile` P2025 propagation (profileModel)
- Added: `updateGoal`, `setPrimaryGoal`, `countMilestonesByGoalId`, `createMilestonesInBatch` (happy + max exceeded), `completeMilestoneAndAdvance` (5 cases), `activateFirstLockedMilestone`, `lockNonCompletedMilestones`, `getMilestonesStats`, `getCompletedDatesForStreak`, `getGoalsByProfileId` status filter (recoveryGoalModel)
- 115 tests total, all passing

---

## Cross-Cutting Gaps

| Gap | Status | Affected Layers |
|-----|--------|----------------|
| DB connection / network failures | ✅ covered in models | Models, Services, Controllers |
| Null/undefined propagation chains | Partial | Controllers, Services |
| Concurrent requests / race conditions | Open | Models, Services |
| External service failures (email, OAuth) | ✅ emailSender covered | Services |
| Empty/single-element/large array boundaries | ✅ covered in models/libs | Libs, Services |
| Prisma throws unexpectedly mid-transaction | Partial | Models, Services |
| Cache TTL expiry and isolation | ✅ covered (2026-06-04) | Lib/Cache |

---

## Priority Fix Areas

1. **Models** — ✅ filled (2026-06-04)
2. **Controllers** — ✅ filled (2026-06-04)
3. **Services** — ✅ filled (2026-06-04)
4. **Libs** — ✅ filled (2026-06-04)
