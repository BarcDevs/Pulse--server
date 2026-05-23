# Adding Error Handling

## Pattern
- Throw typed errors in services via `errorFactory` from `src/errors/factory/ErrorFactory.ts`.
- Use `errorFactory.auth.unauthorized()`, `errorFactory.auth.forbidden()`, `errorFactory.notFound('Resource')`, `errorFactory.validation.generic()`.

## Constraints
- Global error handler in `src/middlewares/` catches all — no try/catch in controllers.
- Error classes in `src/errors/` — check factory coverage before adding new ones.
