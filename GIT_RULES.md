# Git Rules

## Before Committing
1. `npm run typecheck`
2. `npm run lint:check`
3. `npm test`
4. Env vars via config exports only — never direct access to env
5. No commented-out code

## Commit Rules
- **ALWAYS ask before committing** — never auto-commit
- Don't run /commit skill on small fixes, formatting or docs changing
- Always ask before invoking /commit
- Never jump ahead to commit without being asked
- Commit messages: imperative, present tense, describe what was **implemented** not just what changed
- Generate messages with /caveman-commit skill
- **Never claim commit succeeded without running actual `git commit`** — /caveman-commit is drafting only
- When committing after review fixes: include original work scope, not just the fix
- Use branches for features/fixes
- Conventional commits: `feat`, `fix`, `docs`, `style`, `rfc`, `test`, `chore`. Breaking changes: `feat!:`
- Think on what the current commit job is before deciding if it either `feat`, `rfc`, `fix`, etc and REPORT BACK your reasoning - Don't just mechanically label as `feat` for everything.
- *IMPORTANT:* refactor job - always name `rfc` instead of `refactor`!
- If you're not sure, read `"C:\Users\66bar\OneDrive\documents\Programming\conventional-commits-cheatsheet.md"` for more info
- Atomic commits — one change or fix per commit
- Claude's plans must never be committed
- Use /commit skill only when user explicitly invokes it — never on plain "commit"