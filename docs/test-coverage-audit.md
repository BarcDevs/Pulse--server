# Test Coverage Audit — Error/Edge Cases

**Date:** 2026-06-04
**Branch:** tests
**Scope:** `src/__tests__/` — all 67 test files

---

## Summary

~50% error/edge case coverage, ~50% happy path.
Strong in validation & auth security. Weak in infrastructure and concurrency failures.

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

### Libs — 50% error coverage
- `authOTP`: OTP mismatch, user not found, expiration, wrong OTP
- **Missing:** email service failures during OTP send, race conditions on OTP generation

### Services — 45% error coverage
- Auth: duplicate email, missing user, wrong password, expired OTP, DB conflicts
- CheckIn: P2002 constraint violations, missing records, timezone edge cases
- **Missing:** external service timeouts, transaction rollback, network failures

### Controllers — ✅ filled (2026-06-04)
- Auth failures, invalid input, missing userId
- Added: service error propagation for all CheckIn, UserController, ProfileController, RecoveryGoalController handlers
- Added: ForumController — likePost, likeReply, savePost, getSavedPosts, reportUnknownTag, getUnknownTagAttempts, getCategoryStats (auth + happy + service-throw)
- Added: validateOwner throw paths for updatePost, updateReply, deleteReply
- Added: getSavedPosts null→[] coercion, savePost/likePost toggle (liked/unliked, saved/unsaved)
- 144 controller tests total, all passing

### Models — ✅ filled (2026-06-04)
- Added: `getUserByUsername`, `setUserOTP`, `setEmailChangeOTP`, `updateEmail`, `linkGoogleId` (authModel)
- Added: Prisma error propagation for `getUserById`, `createUser` mid-transaction, `updateUser`, `deleteUser`
- Added: `updateUserLastCheckIn`, custom limit, empty results, P2002/P2025 propagation (checkInModel)
- Added: `updateProfile` P2025 propagation (profileModel)
- Added: `updateGoal`, `setPrimaryGoal`, `countMilestonesByGoalId`, `createMilestonesInBatch` (happy + max exceeded), `completeMilestoneAndAdvance` (5 cases), `activateFirstLockedMilestone`, `lockNonCompletedMilestones`, `getMilestonesStats`, `getCompletedDatesForStreak`, `getGoalsByProfileId` status filter (recoveryGoalModel)
- 115 tests total, all passing

---

## Cross-Cutting Gaps

| Gap | Affected Layers |
|-----|----------------|
| DB connection / network failures | Models, Services, Controllers |
| Null/undefined propagation chains | Controllers, Services |
| Concurrent requests / race conditions | Models, Services |
| External service failures (email, OAuth) | Services |
| Empty/single-element/large array boundaries | Libs, Services |
| Prisma throws unexpectedly mid-transaction | Models, Services |

---

## Priority Fix Areas

1. **Models** — add Prisma error scenarios (connection failure, unique constraint, not found)
2. **Controllers** — add tests for when service throws (DB error, null return)
3. **Services** — add external service failure paths (email, Google OAuth token exchange)
4. **Libs** — boundary values on arrays (empty, single, large N)
