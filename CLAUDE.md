# Claude Code Preferences

## Project Overview
HealEase Server — Node.js/Express TypeScript backend for a health/wellness forum with auth, CSRF protection, and community features.

## Architecture
MVC: Controller → Service → Model → Database

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
├── middlewares/ # Express middleware (see src/middlewares/CLAUDE.md)
├── models/      # Data access layer (see src/models/CLAUDE.md)
├── responses/
├── routes/      # Route definitions (see src/routes/CLAUDE.md)
├── schemas/     # Joi validation (see src/schemas/CLAUDE.md)
├── services/    # Business logic (see src/services/CLAUDE.md)
├── types/       # TypeScript types (see src/types/CLAUDE.md)
└── utils/
```

## Core Principles
- **SOLID principles** — Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **Industry standards** — Clean, readable, maintainable code
- **One concern per file**

## TypeScript Conventions
- Single quotes for all strings and imports
- No semicolons (except where required)
- 4-space indentation
- Arrow functions always — never `function` declarations
- Prefer `type` over `interface` (use `interface` only for declaration merging / extending Express types)
- File naming: PascalCase for classes & types, camelCase for everything else
- Folder naming: camelCase

## Import Order
1. Node.js built-ins
2. Third-party packages
3. Third-party `@`-scoped packages
4. Local modules: types → config → controllers → services → models → middleware → utils → constants → errors → schemas

## Code Formatting
- Break long lines and function parameters onto multiple lines
- Limit lines up to about 50 chars
- Generic utility types (`Pick`, `Omit` etc.) with 3+ keys → each key on its own line
- 2+ Elements in an array → each on its own line

### If statement:
- 2+ conditions → one condition per line
- no condition and action in same line

### Objects and functions:
- Inline object types with 2+ parameters → always break to new lines, never inline
- 2+ chained accessor calls → break after root object
- Nested objects always on a new line — never inline inside a parent object or array
- Objects with 2+ properties → each property on its own line
- 2+ function parameters → each on its own line

## Clean Code
- Delete unused code — never comment it out
- No hardcoded values — use constants or config
- Always provide complete, production-ready code
- No backwards-compatibility shims for removed code
- don't use redundant braces or parentheses

## Before Committing
1. `npm run typecheck`
2. `npm run lint:check`
3. `npm test`
4. Env vars via config exports only — never `process.env`
5. No commented-out code

## Git
- Write clear commit messages (imperative, present tense)
- Use branches for features/fixes
- Use conventional commit format (feat, fix, docs, style, refactor, test, chore)
- Avoid large commits; keep them focused and atomic (every commit should have one change or fix)