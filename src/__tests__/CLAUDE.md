# Tests

## Stack
- Jest for unit and integration tests
- Supertest for HTTP/route testing

## Rules
- Mirror the `src/` structure: files in `controllers/` → tests in `__tests__/controllers/`
- Test file naming: `<name>.test.ts`
- Run before every commit: `npm test`
- Setup/teardown helpers live in `__tests__/setup/`
