# Middlewares

## Common Middleware
- `isAuthenticated.ts` — Authentication guard
- `csrf.ts` — CSRF protection
- `errorHandler.ts` — Global error handling
- `sanitization.ts` — Input sanitization
- `rate-limiting.ts` — Rate limiting
- `cache.ts` — Response caching
- `loggerMiddleWare.ts` — Request logging

## Rules
- Declare and apply all middleware centrally in `middlewares/index.ts`
- camelCase filenames
- Each file has a single responsibility
