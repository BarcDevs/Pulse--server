# Changing Database Schema

**Files to touch:**
- `prisma/schema.prisma` — edit the schema
- `prisma/migrations/` — generated automatically
- `src/models/<domain>Model.ts` — update queries
- `prisma/seed.ts` — update if needed

## Steps
1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name describe_change`
3. Update model file with new fields/queries
4. Update seed data if needed (`prisma/seed.ts`)

## Constraints
- Never edit migration SQL files by hand.
- New nullable fields safe to add; new non-null fields need a default or migration default.
- Compound unique keys → Prisma where key uses `_` separator: `@@unique([a, b])` → `{ a_b: { a, b } }`.
- Select only needed fields in model queries — avoid pulling sensitive columns unnecessarily.
- Complex or reusable query builders go in `src/models/queries/`.
