# Claude Code Preferences

Pulse Server — Node.js/Express TypeScript backend for a health/wellness forum with auth, CSRF protection, and community features.
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

## Repo-Visible Decisions & Corrections Log
Alongside auto-memory (cross-session, not repo-visible), this repo tracks two parallel trees any
collaborator/agent can read, each shaped `index.md` + `<topic>.md` files + `archive/<topic>.md`:
- `decisions/` — architecture/technical decisions made during sessions, with reasoning (problem, decision, why over alternatives, how to apply).
- `corrections/` — corrections or confirmed preferences given to Claude during sessions (Claude's mistakes, user corrections to Claude's behavior/claims). Not app-generated user feedback.
**Read both `index.md` files at the start of every new session** — load-bearing context, same tier as this file. Topic files are loaded on demand, not routinely.
**Write immediately, same turn as the correction/decision.** Don't wait for the user to ask "did you save that." Missing one is a bug.
**Supersession = move, not append-in-place** — moved to `archive/<topic>.md`, not edited in place.

## File Structure
See `docs/STRUCTURE.md` for the full directory layout and subdirectory rules.

## Docs Sync
New feature added → update server PRD, server README, AND client README same time, every time.

## AI Eval Sync
Any change to AI provider logic, prompts, insight types, or generation config
(`src/services/aiProviders/`, `src/lib/aiInsight/`, `aiInsightGeneratorService.ts`,
`config/default.ts` ai section) → check `scripts/eval-ai-models/` still reflects it:
scenarios cover the current insight types, prompts match `insightsPrompts.ts`,
model ids match config defaults. Update the eval scripts in the same change if
they've drifted — don't let them silently test stale prompts/models.

## AWS Deployment
Server runs on EC2 + RDS (eu-central-1), replacing Render. Full details, including
infra IDs, redeploy steps, and secrets layout: see `docs/DEPLOYMENT.md`.

Two build-time gotchas specific to this stack, worth knowing before touching
`tsconfig.json`, `prisma/schema.prisma`, or the Dockerfile:
- Prisma's `prisma-client` generator defaults to an ESM/TS-native output that requires
  sibling `.ts` files at runtime — needs `moduleFormat = "cjs"` on the generator, plus
  `rewriteRelativeImportExtensions` in `tsconfig.json` so tsc rewrites those `.ts`
  imports to `.js` on emit. Jest also needs `moduleNameMapper` to strip the same
  extensions (`jest.config.ts`, `jest.integration.config.ts`) — its resolver doesn't
  follow explicit `.ts`/`.js` specifiers the way tsc does.
- RDS enforces SSL by default — `DATABASE_URL` needs `?uselibpqcompat=true&sslmode=require`
  appended, or connections fail with a misleading "denied access" error from Prisma.

## Project Roadmap
[Pulse Roadmap](https://www.notion.so/Pulse-Development-Timeline-3129e15469d28100be18df6e1ce0a984?source=copy_link)

## Code Style
Rules in `CORE_RULES.md`. Non-negotiable — follow exactly.

### Quick Checklist
Arrow functions | Single quotes | 4-space indent | PascalCase classes/types, camelCase everything else
Env vars via config exports only — never `process.env` | No commented-out code
MVC layers: controller → service → model → Prisma (never skip layers)

**Never:** `function` declarations | `interface` (except declaration merging/Express extension) | `console.log`
**Never:** Direct `process.env` access | Commented-out code | String literal object keys | Hardcoded values
**Never:** Raw numeric HTTP status codes (`200`, `404`, `500`) — always `HttpStatusCodes.OK`/`.NOT_FOUND`/etc. from `@src/constants/httpStatusCodes.ts`

## Testing
Integration tests (`npm run test:integration`) need Postgres on `localhost:5433` — not running by default. Start it with `docker-compose -f docker-compose.test.yml up -d` before running them locally. CI provisions its own Postgres service, so this is local-only.

## Git & Commits
**Read `GIT_RULES.md` before committing or when instructed to commit.** Do not skip it.
Full rules there. Key constraint: never invoke `/commit` skill on small fixes, formatting, or docs changes — use plain `git commit` for those.

**Branch flow: feature-branch → development → PR to main. NEVER skip `development`.**
Every feature/fix branch merges into `development` first, via PR. Only `development` gets PR'd into `main`. Never open a PR straight from a feature branch to `main`, even if asked to "PR it to main" — branch off `development`, PR into `development`, and let `development`'s own PR carry it to `main`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

**`graphify` is not a bare PATH command in this environment.** The CLI is a Python package installed to a uv/pipx venv, not on PATH here. `graphify query ...` will fail with "command not found" if invoked directly — that failure is not a signal that the graph is unavailable, it just means the wrong invocation was used. Before concluding graphify isn't available, always try:

```bash
$(cat graphify-out/.graphify_python) -m graphify query "<question>"
```

`graphify-out/.graphify_python` holds the absolute path to the Python interpreter that has graphify installed (saved by the graphify skill itself). Same pattern for `path`/`explain`/`update`. Only fall back to inline NetworkX traversal of `graphify-out/graph.json` (see the graphify skill's `references/query.md`) if that invocation itself errors.

Rules:
- For codebase questions, first run the query above when graphify-out/graph.json exists. Use `path "<A>" "<B>"` for relationships and `explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- **Do not spawn an Explore/general-purpose subagent for a codebase question until graphify has been tried (with the correct invocation above) and either failed or come up short.** Spawning an agent to do raw file exploration when the graph could have answered directly wastes tokens for nothing — try graphify first, every time, no exceptions for "seems faster to just delegate."
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- `explain "<name>"` needs a bare node name with no file extension (e.g. `explain "forumRoute"`, not `explain "forumRoute.ts"`) — extension-qualified names reliably fail with "no node matching." `path "<A>" "<B>"` accepts either form fine.
- After modifying code, run `$(cat graphify-out/.graphify_python) -m graphify update .` to keep the graph current (AST-only, no API cost).