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
| Null/undefined propagation chains | ✅ covered (2026-06-05) | Controllers, Services |
| Concurrent requests / race conditions | ✅ covered (2026-06-05) | Integration tests |
| External service failures (email, OAuth) | ✅ emailSender covered | Services |
| Empty/single-element/large array boundaries | ✅ covered in models/libs | Libs, Services |
| Prisma throws unexpectedly mid-transaction | ✅ covered (2026-06-05) | Models, Services |
| Cache TTL expiry and isolation | ✅ covered (2026-06-04) | Lib/Cache |

---

## Priority Fix Areas

1. **Models** — ✅ filled (2026-06-04)
2. **Controllers** — ✅ filled (2026-06-04)
3. **Services** — ✅ filled (2026-06-04)
4. **Libs** — ✅ filled (2026-06-04)

---

# CI/CD Readiness Audit

**Date:** 2026-06-04
**Branch:** tests

## Current Test Inventory

| Layer | Files | Status |
|-------|-------|--------|
| Controllers | 6 | ✅ |
| Services | 11 | ✅ |
| Models | 8 | ✅ |
| Middlewares | 7 | ✅ |
| Routes (supertest) | 9 | ✅ |
| Libs | 14 | ✅ |
| Schemas / Utils | 8 | ✅ |
| **Total** | **63** | |

`devRoute.ts` intentionally untested — dev-only email preview, excluded from prod build.

---

## Gaps Before CI/CD

### 1. Coverage Thresholds — ✅ Done (2026-06-04)

`jest.config.ts` has no `coverageThreshold`. CI runs pass even at 0% coverage.

**Fix:** add to `jest.config.ts`:
```ts
coverageThreshold: {
    global: {
        branches: 80,
        functions: 85,
        lines: 85,
        statements: 85
    }
}
```

### 2. GitHub Actions Workflow — ✅ Done (2026-06-04)

No `.github/workflows/` directory exists. Nothing runs on push/PR.

**Minimum CI pipeline steps:**
```
install → typecheck → lint:check → test (with coverage gate)
```

All scripts already exist in `package.json` (`typecheck`, `lint:check`, `test`). Just need the workflow file.

### 3. Real DB Integration Tests — ✅ Done (2026-06-05)

Every test — including all 9 route tests — mocks Prisma via `jest-mock-extended`. Zero tests touch real PostgreSQL.

**What mocked tests miss:**
- Migration drift (schema out of sync with migrations)
- Constraint violations (unique, FK, NOT NULL) under real data
- Transaction rollback behavior
- `@db.Date` / `@@unique` compound key behavior
- Prisma query builder bugs masked by mocks

**Approach for CI:**
- Docker Compose with `postgres:16-alpine` test DB service
- Separate Jest project/config (`jest.integration.config.ts`) hitting real DB
- Run `prisma migrate deploy` before test suite
- Seed minimal fixture data
- Separate npm script: `test:integration`

**Scope estimate:**
- Setup (Docker Compose + config): ~2h
- Auth + CheckIn routes against real DB: ~1 day
- Full route coverage against real DB: ~3–4 days

---

## Priority Order

| # | Task | Effort | Blocking CI? |
|---|------|--------|--------------|
| 1 | ~~Add `coverageThreshold` to `jest.config.ts`~~ ✅ | 5 min | Yes — CI is blind without it |
| 2 | ~~Create `.github/workflows/ci.yml`~~ ✅ | 30 min | Yes — nothing runs without it |
| 3 | ~~Real DB integration tests~~ ✅ | 3–4 days | No — but mocked-only CI is incomplete |

All three gaps resolved. CI pipeline is functional with both unit (mocked) and integration (real DB) jobs.

---

## Remaining Coverage Gaps

### 4. Concurrent Requests / Race Conditions — ✅ Done (2026-06-05)

Integration tests added: `src/__tests__/integration/concurrency.integration.test.ts`

**Covered:**
- Two simultaneous POST /check-in for same user same day → exactly 1 DB record (upsert race)
- Two concurrent PATCH /profile → DB in consistent state (one valid value)
- Two simultaneous POST /forum/posts/:postId/like → at most 1 PostLike row (P2002 handled)
- Sequential like → unlike → 0 rows (toggle behavior)

---

### 5. Null/Undefined Propagation Chains — ✅ Done (2026-06-05)

**Covered:**
- `GET /profile` when `profile.findUnique` returns null → 404 (added to `profile.route.test.ts`)
- GET /posts/:postId with `author.image: null` → response well-formed, `author.image` is null (added to `forum.route.test.ts`)
- All other null paths (getSavedPosts null→[], findFirst null→404) previously covered

---

### 6. Prisma Throws Mid-Transaction — ✅ Done (2026-06-05)

**Covered:**
- `createUser` profile create fails mid-transaction → propagates error (pre-existing in `authModel.test.ts`)
- `setPrimaryGoal`: second update throws → error propagated (added to `recoveryGoalModel.test.ts`)
- `completeMilestoneAndAdvance`: `milestone.update` throws mid-sequence → error propagated (added)
- `completeMilestoneAndAdvance`: `goal.update` throws after completing last milestone → error propagated (added)

---

### 7. Schema Edge Cases — ✅ Done (2026-06-05)

New file: `src/__tests__/schemas/adversarial.schemas.test.ts` (38 tests)

**Covered:**
- SQL injection strings in email/username → schema rejects (invalid email format, invalid username chars)
- XSS payloads in firstName → schema rejects (alphanumeric regex)
- XSS/SQL in image URL field → rejects (not a valid URL structure)
- Malformed email (10K chars, no @) → rejected
- Unicode/emoji in post titles, reply bodies, profile bio → accepted (text fields)
- 500+ char bio → rejected; 10K char post body → accepted (no max on text fields)
- Invalid timezone format → rejected; invalid image URL → rejected

---

### 8. Route-Level Cascading Service Failures — ✅ Done (2026-06-05)

**Covered (added to existing route test files):**
- `GET /forgot-password` when `sendEmail` throws `ECONNREFUSED` → 500 (auth.route.test.ts)
- `POST /signup` when Prisma `user.create` throws connection error → 500 (auth.route.test.ts)
- `POST /auth/login` when Prisma `user.findUnique` throws connection error → 500 (auth.route.test.ts)
- `POST /forum/posts` when `profile.findUnique` throws `ECONNREFUSED` → 500 (forum.route.test.ts)
- `GET /forum/posts` when `post.findMany` throws connection error → 500 (forum.route.test.ts)

---

## All Gaps Resolved

| # | Task | Status |
|---|------|--------|
| 4 | Concurrent request / race condition tests | ✅ Done (2026-06-05) |
| 5 | Null/undefined propagation chain tests | ✅ Done (2026-06-05) |
| 6 | Prisma mid-transaction failure tests | ✅ Done (2026-06-05) |
| 7 | Schema adversarial input tests | ✅ Done (2026-06-05) |
| 8 | Route cascading service failure tests | ✅ Done (2026-06-05) |
