# Writing Tests

**Files:**
- Unit: `src/__tests__/<domain>/<file>.test.ts`
- Integration (route): `src/__tests__/routes/<domain>.test.ts`

## Constraints
- Use `prismaMock.<model>.<method>.mockResolvedValue(...)` — never real DB in unit tests.
- Use `supertest(App)` for route tests with `createAuthenticatedRequest(user)` for auth + CSRF tokens.
- Cover happy path + all validation errors + auth failures.
- 4 pre-existing failures in `rate-limiting.test.ts` — expected, unrelated.
