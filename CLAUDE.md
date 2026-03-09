# Claude Code Preferences

## Project Overview
HealEase Server — Node.js/Express TypeScript backend for a health/wellness forum with auth, CSRF protection, and community features.

## Architecture
MVC: Controller → Service → Model → Database

## File Structure
See `docs/STRUCTURE.md` for the full directory layout and subdirectory rules.

## Core Principles
- SOLID principles — Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- Industry standards — Clean, readable, maintainable code
- One concern per file
- Provide a full file edit instead of one edit at a time

### Code Style
- Never use array index as key; use the current element as an index
- Text: never use the `—` character. only the simple hyphen `-` for all text, including classnames and config keys. This avoids encoding issues and ensures consistency across all contexts (JSX, CSS, config, etc.)
- Time values: Always use `src/constants/time.ts` (minuteInMs, hourInMs, etc.) instead of hardcoding milliseconds
- Text blocks: Don't break unless really long (120–150 chars OK)

## Reading Files:
-  Whenever reading files to understand and identify patterns that may be needed in the future, document them in corresponding context to avoid repeating it afterwards

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
5. Relative parent `../`
6. Relative same-dir `./`

## Code Formatting
- Break long lines and function parameters onto multiple lines
- Limit lines up to about 50 chars
- Generic utility types (`Pick`, `Omit` etc.) with 3+ keys → each key on its own line
- 2+ Elements in an array → each on its own line
- Avoid changes in other projects. different projects are read only

### If statement:
- 2+ conditions → one condition per line
- no condition and action in same line
- Ternary conditions with long or complex expressions: → break to multiple lines

### Objects and functions:
- Inline objects with 3+ properties, or 2+ in long lines → always break to new lines, never inline
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
- Use conventional commit format (feat, fix, docs, style, rfc, test, chore)
- Avoid large commits; keep them focused and atomic (every commit should have one change or fix)
- Claude plans should instructions never be committed
