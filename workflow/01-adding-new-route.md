# Adding a New Route

**Files to touch:**
- `src/routes/<domain>Route.ts` — register the route
- `src/controllers/<domain>Controller.ts` — add handler
- `src/services/<domain>Service.ts` — add business logic
- `src/models/<domain>Model.ts` — add DB query
- `src/schemas/<feature>/<name>Schema.ts` — add Zod validation (if needed)
- `docs/API.md` — document the new endpoint
- `src/__tests__/routes/<domain>.test.ts` — integration test

## Constraints (Routes)
- Route files only wire URLs to controllers — no logic.
- Auth: `isAuthenticated` middleware before any protected route.
- CSRF: `extractCsrfToken` + `csrfMiddleware` (both, in order) on all state-mutating routes (POST, PUT, PATCH, DELETE).
- Every route needs a swagger JSDoc comment block above it.
- Use `successResponse(res, data, message, status)` — never `res.json()` directly.

## Constraints (Controllers)
- No `try/catch`, no `NextFunction` — errors propagate to global handler automatically.
- Always `return successResponse(res, data, message, status)`.
- Auth: inline `if (!userId) throw errorFactory.auth.unauthorized()`.
- Validate with `ValidationError.catchValidationErrors(schema.safeParse(req.body))` in the controller, before calling service.
- Controllers only call services — no Prisma, no business logic.

## Constraints (Services)
- Services call models only — no Prisma, no HTTP concerns.
- All business logic and authorization checks live in services.
- Throw typed errors via `errorFactory` from `src/errors/factory/ErrorFactory.ts`.

## Constraints (Models)
- Models wrap Prisma calls only — no business logic.
- Export individual functions, not a class.
- Import: `import Prisma from '../utils/prismaClient'` (lowercase `p`).
- Select only needed fields — avoid pulling sensitive columns unnecessarily.
- Complex or reusable query builders go in `src/models/queries/`.
- Not-found checks may throw raw `new Error(...)` — services layer on typed errors where needed.

## Constraints (Validation)
- Schema files in `src/schemas/<feature>/`, camelCase filename with `Schema` suffix.
- One schema per file.
- Validation in the controller, before calling the service.
- Use `ValidationError.catchValidationErrors(schema.safeParse(data))` — not `validateAndExtract`.
