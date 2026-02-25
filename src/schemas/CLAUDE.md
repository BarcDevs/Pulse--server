# Schemas

Joi schemas for request validation (body, query, params).

## Rules
- Use Joi for all validation
- camelCase filename with `Schema` suffix (e.g., `loginSchema.ts`, `newPostSchema.ts`)
- Organized by feature subdirectory (`auth/`, `forum/`, etc.)
- Validate at the controller/route boundary before the request reaches the service
