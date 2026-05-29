# Core Rules (Apply Everywhere)

## Principles
- SOLID principles — Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- Industry standards — Clean, readable, maintainable code
- Keep DRY rules
- One concern per file
- Always provide informative names for files, functions, and variables
- For every function you want to create, check it doesn't already exist
- Never use string literals as object keys — define typed constants and use computed property names `[CONST.Key]: value`
- Avoid using re-export files
- When building tests, cover both happy paths and edge cases; ensure they are comprehensive and meaningful
- Always provide informative filenames and variable names

## Code Style
- Never use array index as key — use the current element as an index
- Text: never use the `—` character. Only the simple hyphen `-` for all text, including classnames and config keys
- Time values: Always use `src/constants/time.ts` (minuteInMs, hourInMs, etc.) instead of hardcoding milliseconds
- Text blocks: Don't break unless really long (120-150 chars OK)
- Condition operators at the end of a line if line-breaking
- Use unified imports for modules that have many imports
- Don't break single imports to multiple lines unless very long (50+ chars); if too long, break before the `from` keyword
- String blocks with `'` in them, use backticks to avoid escaping
- Avoid redundant braces or parentheses
- Avoid redundant line breaking — break only when it improves readability or meets the line length threshold; don't make line-breaking too strict

## Reading Files
- Whenever reading files to understand and identify patterns that may be needed in the future, document them in corresponding context to avoid repeating it afterwards

## TypeScript Conventions
- 4-space indentation
- Arrow functions always — never `function` declarations
- Prefer `type` over `interface` (use `interface` only for declaration merging / extending Express types)
- File naming: PascalCase for classes & types, camelCase for everything else
- Folder naming: camelCase

## Code Formatting
- Break long lines and function parameters onto multiple lines
- Limit lines to about 50 chars
- Generic utility types (`Pick`, `Omit` etc.) with 3+ keys → each key on its own line
- 2+ elements in an array → each on its own line
- Avoid changes in other projects — different projects are read only

## If Statements
- 2+ conditions → one condition per line
- No condition and action in same line
- Ternary conditions with long or complex expressions → break to multiple lines
- Avoid single statement followed by return — inline: `if (x) return fn()` not `if (x) { fn(); return }`

## Objects and Functions
- Inline objects with 3+ properties, or 2+ in long lines → always break to new lines, never inline
- 2+ chained accessor calls → break after root object
- Nested objects always on a new line — never inline inside a parent object or array
- Objects with 2+ properties → each property on its own line
- 2+ function parameters → each on its own line
- Closing `)` of a multi-line callback stays inline with the next chained method: `.map(...).find(Boolean)` not `.map(...)\n.find(Boolean)`

## Logging
- Never use `console.log` — use `console.info`, `console.warn`, or `console.error` for intentional output
- `console.log` is for temporary debugging only; remove before committing

## Clean Code
- Delete unused code — never comment it out
- No backwards-compatibility shims for removed code
- No hardcoded values — use constants or config
- Always provide complete, production-ready code
- Don't use redundant braces or parentheses
