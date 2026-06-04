# Remaining Missing Tests

## Tier 3 — Lib/utilities (no tests)

| File | Notes |
|------|-------|
| `authCrypto.ts` | `createToken`, `hashPassword`, `comparePassword` |
| `authHelpers.ts` | `getCookiesOptions`, `generateRandomUsername`, `sanitizeUserData` |
| `profileHelpers.ts` | `ensureProfileExists` |
| `interventionOrchestrator.ts` | main orchestration logic |
| `insightBuilder.ts` | progress insight building |
| `promptBuilder.ts` | AI prompt construction |
| `observationTemplates.ts` | template fallback logic |
| `diversitySelector.ts` | recommendation diversity |

## Tier 3 — Middlewares (no tests)

`csrf.ts`, `isAdmin.ts`, `loggerMiddleWare.ts`

## Models (no unit tests)

`recoveryGoalModel.ts`, `checkInModel.ts`, `profileModel.ts`, `authModel.ts`
