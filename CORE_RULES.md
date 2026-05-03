# Core Rules (Apply Everywhere)

## Core Principles
- SOLID principles — Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- Industry standards — Clean, readable, maintainable code
- Keep DRY rules
- One concern per file
- Provide a full file edit instead of one edit at a time
- Always provide informative names for files, functions and variables
- When building tests, cover both happy paths and edge cases, and ensure they are comprehensive and meaningful
- Avoid using re-export files

## Code Style
- Never use array index as key; use the current element as an index
- Text: never use the `—` character. only the simple hyphen `-` for all text, including classnames and config keys. This avoids encoding issues and ensures consistency across all contexts (JSX, CSS, config, etc.)
- Time values: Always use `src/constants/time.ts` (minuteInMs, hourInMs, etc.) instead of hardcoding milliseconds
- Text blocks: Don't break unless really long (120–150 chars OK)
- Condition operators at the end of a line if line-breaking
- No line breaking to single import unless very long
- String blocks with `'` in it, use backticks to avoid escaping
- Avoid redundant braces or parentheses
- Avoid redundant line breaking — break only when it improves readability or meets the line length threshold

## Reading Files:
- Whenever reading files to understand and identify patterns that may be needed in the future, document them in corresponding context to avoid repeating it afterwards

## TypeScript Conventions
- 4-space indentation
- Arrow functions always — never `function` declarations
- Prefer `type` over `interface` (use `interface` only for declaration merging / extending Express types)
- File naming: PascalCase for classes & types, camelCase for everything else
- Folder naming: camelCase

## Code Formatting
- Break long lines and function parameters onto multiple lines
- Limit lines up to about 50 chars
- Generic utility types (`Pick`, `Omit` etc.) with 3+ keys → each key on its own line
- 2+ Elements in an array → each on its own line
- Avoid changes in other projects. different projects are read only

## If statement:
- 2+ conditions → one condition per line
- no condition and action in same line
- Ternary conditions with long or complex expressions: → break to multiple lines

## Objects and functions:
- Inline objects with 3+ properties, or 2+ in long lines → always break to new lines, never inline
- 2+ chained accessor calls → break after root object
- Nested objects always on a new line — never inline inside a parent object or array
- Objects with 2+ properties → each property on its own line
- 2+ function parameters → each on its own line

## Clean Code
- Delete unused code — never comment it out
- No backwards-compatibility shims for removed code
- No hardcoded values — use constants or config
- Always provide complete, production-ready code
- No backwards-compatibility shims for removed code
- Don't use redundant braces or parentheses