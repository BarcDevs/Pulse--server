# Global Constraints

These constraints apply to all scenarios. Project-specific rules in `CLAUDE.md`.

## Architecture
- MVC: Controller → Service → Model → Prisma
- Never skip layers

## Naming Conventions
- Routes: camelCase with `Route` suffix (e.g., `authRoute.ts`)
- Controllers: camelCase with `Controller` suffix (e.g., `authController.ts`)
- Services: camelCase with `Service` suffix (e.g., `authService.ts`)
- Models: camelCase with `Model` suffix (e.g., `authModel.ts`)
- Schemas: camelCase with `Schema` suffix, in `src/schemas/<feature>/`

## Error Handling
- Global error handler catches all — no try/catch in controllers
- Services throw typed errors via `errorFactory`
- Use `src/errors/factory/ErrorFactory.ts` for all error creation

## Response Format
- Always use `successResponse(res, data, message, status)` — never `res.json()` directly
- Controllers return responses, no data returned from service/model layer to controller

## File Structure
- Routes: `src/routes/`
- Controllers: `src/controllers/`
- Services: `src/services/`
- Models: `src/models/`
- Schemas: `src/schemas/<feature>/`
- Tests: `src/__tests__/`
