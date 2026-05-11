# Project Structure

```
config/          # Environment config (see config/CLAUDE.md)
prisma/          # Prisma schema & migrations
src/
├── app.ts
├── __tests__/   # Jest tests (see src/__tests__/CLAUDE.md)
├── constants/
├── controllers/ # HTTP handlers (see src/controllers/CLAUDE.md)
├── errors/      # Custom errors & factories (see src/errors/CLAUDE.md)
├── interfaces/
├── lib/         # Domain-specific modules (e.g. aiInsight/)
├── locales/     # i18n message bundles (en.json, he.json) + getMessages()
├── middlewares/ # Express middleware (see src/middlewares/CLAUDE.md)
├── models/      # Data access layer (see src/models/CLAUDE.md)
├── responses/
├── routes/      # Route definitions (see src/routes/CLAUDE.md)
├── schemas/     # Zod validation (see src/schemas/CLAUDE.md)
├── services/    # Business logic (see src/services/CLAUDE.md)
├── types/       # TypeScript types (see src/types/CLAUDE.md)
└── utils/
```