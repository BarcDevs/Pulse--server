# Claude Code Preferences

## Project Overview
HealEase Server — Node.js/Express TypeScript backend API for a health and wellness forum with user authentication, CSRF protection, and community features.

## Architecture
MVC pattern: Controller → Service → Model → Database

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
- **File naming**: PascalCase for classes & types (`CustomError.ts`, `UserType.ts`), camelCase for everything else (`authController.ts`)
- **Folder naming**: camelCase

## Import Organization
```typescript
// 1. Node.js built-ins
import path from 'path'

// 2. Third-party packages
import express from 'express'

// 3. Third-party @-scoped packages
import { PrismaClient } from '@prisma/client'

// 4. Local modules (types → config → controllers → services → models → middleware → utils → constants → errors → schemas)
import { UserType } from '../types/data/UserType'
import { authConfig } from '../../config'
import { authService } from '../services/authService'
```

## Code Formatting
- Break long lines and function parameters onto multiple lines
- Space inside curly braces: `{ var1, var2 }`
- 2+ conditions in an `if` → one condition per line:
  ```typescript
  if (
      condition1 &&
      condition2
  ) {
  ```

## Clean Code
- Delete unused code — never comment it out
- No hardcoded values — use constants or config
- No code snippets — always provide complete, production-ready code
- No backwards-compatibility shims for removed code

## Before Committing
1. `npm run typecheck`
2. `npm run lint:check`
3. `npm test`
4. Verify env vars accessed via config exports (not `process.env`)
5. No commented-out code left behind

## Git
- Write clear commit messages (imperative, present tense)
- Use branches for features/fixes
- Use conventional commit format (feat, fix, docs, style, refactor, test, chore)
- Avoid large commits; keep them focused and atomic (every commit should have one change or fix)