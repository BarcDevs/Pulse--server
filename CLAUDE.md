# Claude Code Preferences

## Project Overview
HealEase Server — Node.js/Express TypeScript backend for a health/wellness forum with auth, CSRF protection, and community features.

## Architecture
MVC: Controller → Service → Model → Database

## Project Roadmap
[HealEase Roadmap](https://www.notion.so/HealEase-Development-Timeline-3129e15469d28100be18df6e1ce0a984?source=copy_link)

## File Structure
See `docs/STRUCTURE.md` for the full directory layout and subdirectory rules.

## Behavioral Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Code Style Rules (Apply Everywhere)
Rules listed in `CORE_RULES.md` but summarized here for quick reference. See that file for detailed explanations and rationale. Style is critical for readability and maintainability. These rules are non-negotiable and must be followed

## Before Committing
1. `npm run typecheck`
2. `npm run lint:check`
3. `npm test`
4. Env vars via config exports only — never `process.env`
5. No commented-out code

## Git
- **ALWAYS ask before committing** — Never auto-commit without explicit approval
- Don't run /commit skill on small fixes or formatting changes
- Never jump ahead trying to commit without being asked, even if you think the changes are ready
- Write clear commit messages (imperative, present tense)
- Commit messages must accurately describe what was **implemented** not just what changed (e.g., "replace mock data with real API integration" not "fix imports")
- When committing after fixing issues found during review: include the original work scope in the message, not just the fix (e.g., "feat: replace mock data..." not "fix: correct import order")
- Generate commit messages with the /caveman-commit skill
- Use branches for features/fixes
- Use conventional commit format (feat, fix, docs, style, rfc, test, chore). breaking changes should have `!` after the type (e.g., `feat!: ...`)
- Avoid large commits; keep them focused and atomic (every commit should have one change or fix)
- Claude's plans should never be committed
