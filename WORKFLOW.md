# Pulse Server — Feature Implementation Workflow

Quick-reference guide. Find your scenario, read constraints + references only.

**Critical:** All rules in `CLAUDE.md` apply everywhere. This doc adds scenario-specific constraints only.
**Architecture:** Controller → Service → Model → Prisma. Never skip layers.

## Scenarios
- [Adding a New Route](./workflow/01-adding-new-route.md)
- [Changing Database Schema](./workflow/02-changing-database-schema.md)
- [Writing Tests](./workflow/03-writing-tests.md)
- [Adding Error Handling](./workflow/04-adding-error-handling.md)
- [Global Constraints](./workflow/global-constraints.md)
