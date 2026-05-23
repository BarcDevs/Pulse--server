# Claude Code Preferences

HealEase Server — Node.js/Express TypeScript backend for a health/wellness forum with auth, CSRF protection, and community features.
Architecture: MVC — Controller → Service → Model → Database.

## Model Selection
- **Haiku**: sub-agents, file lookups, search queries, simple edits (<50 lines), code explanation, formatting fixes, style enforcement
- **Sonnet/Opus**: complex debugging, architecture decisions, multi-file refactors, reasoning-heavy tasks

## Token Efficiency
- Grep/Glob over Bash find/ls/grep. Read with offset+limit when line known.
- Edit over Write. Write only for new files or full rewrites.
- Parallel independent tool calls. Sequential only when output feeds next.
- Sub-agents for >3 searches, large scans, slow multi-call tasks. Don't sub-agent tasks <100 lines.
- Don't re-read files already in context. Don't read full file to confirm small detail.
- No preamble/postamble. No restating request. No summarizing visible diffs.
- No speculative refactors. No "just in case" error handling.

## Behavior
**Before coding:** State assumptions. Ask when uncertain — don't implement until 95% confident. Surface tradeoffs. If multiple interpretations exist, present them — don't pick silently.
**Simplicity:** Minimum code that solves the problem. No extra features, abstractions, flexibility, or impossible-scenario handling. 200 lines that could be 50 → rewrite.
**Surgical:** Touch only what you must. Don't improve adjacent code. Match existing style. Mention unrelated dead code — don't delete it. Remove only imports/vars YOUR changes made unused.
**Learn from mistakes:** Save feedback memory on any correction or confirmed non-obvious choice. User should never repeat the same correction. Check memory before similar work.
**Goal-driven:** Define success criteria before starting. For multi-step tasks, state a plan: `1. [step] → verify: [check]`. Loop until verified.

## File Structure
See `docs/STRUCTURE.md` for the full directory layout and subdirectory rules.

## Project Roadmap
[HealEase Roadmap](https://www.notion.so/HealEase-Development-Timeline-3129e15469d28100be18df6e1ce0a984?source=copy_link)

## Code Style
Rules in `CORE_RULES.md`. Non-negotiable — follow exactly.

### Quick Checklist
Arrow functions | Single quotes | 4-space indent | PascalCase classes/types, camelCase everything else
Env vars via config exports only — never `process.env` | No commented-out code
MVC layers: controller → service → model → Prisma (never skip layers)

**Never:** `function` declarations | `interface` (except declaration merging/Express extension) | `console.log`
**Never:** Direct `process.env` access | Commented-out code | String literal object keys | Hardcoded values

## Git & Commits
→ See `.claude/GIT_RULES.md`