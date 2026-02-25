# Models

Models handle all database access via Prisma. They are called by services.

## Responsibilities
- Execute Prisma queries
- Return raw data to services

## Rules
- Use the singleton Prisma client from `src/utils/PrismaClient.ts`
- No business logic — that belongs in services
- camelCase filename with `Model` suffix (e.g., `authModel.ts`)
- Complex/reusable query builders go in `models/queries/`
