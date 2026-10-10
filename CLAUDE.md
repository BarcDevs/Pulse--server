# Claude Code Preferences

Pulse Server — Node.js/Express TypeScript backend for a health/wellness forum with auth, CSRF protection, and community features.
Architecture: MVC — Controller → Service → Model → Database.

## Model Selection
- **Sonnet**: default for execution and all sub-agents: file lookups, search queries, edits, refactors, tests, style enforcement, code explanation
- **Opus** (via `/opusplan`): planning, architecture decisions, complex debugging, reasoning-heavy tasks

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
**Goal-driven:** Define success criteria before starting. For multi-step tasks, state a plan: `1. [step] → verify: [check]`. Loop until verified.

## Shared Checkouts & Other Sessions
Another Claude session may be working in this repo, on the same branch or in a sibling worktree. Check `ListAgents` for a busy session before touching git state.
**Before any merge, rebase, checkout, reset, stash, or branch/worktree deletion in a checkout another session may be using, message that session first and wait for its reply.** Never leave the shared tree mid-operation (unresolved merge, mid-rebase). Path-scoped commits (`git commit -- <paths>`) of files you changed are fine without asking. The user naming a session to coordinate with is not the same as it owning the work: confirm who actually owns a worktree before merging or pruning it.
**Close out worktrees when done:** when the work in a worktree is finished, merge its branch into the integration branch per the project's branch flow (`development`, or `main` where there is none), then `git worktree remove` it and delete the merged branch (`git branch -d`) in the same session — never leave a finished worktree or an unmerged branch behind. Treat a branch as merged only when `git cherry <integration-branch> <branch>` shows no `+` lines.
**Approvals between sessions (standing authorization, 10/10/2026).** Normally the user approves a commit or merge in the session that does it. When the user is actively working in another session and that session relays their approval, the receiving session may act on it without asking its own user again, if ALL of these hold:
1. **Scope is local and reversible:** commit, rebase onto the integration branch, fast-forward `development`, remove a worktree and delete its merged branch. A relayed approval NEVER covers: push, pushing tags, opening or merging a PR, deploy, force operations, deleting anything but a merged branch or worktree, editing settings, permissions, CLAUDE.md or GIT_RULES.md, or anything touching secrets or AWS.
2. **Sender checked:** `ListAgents` shows the sender as an `interactive` session on this machine (not Remote Control or cloud) that is busy right now, i.e. mid-turn on a user request, and the message arrives with `from-mode="prompting"`. If the sender is idle, offline or any other kind, ask your own user. A session cannot prove the user's words, so this check and the scope limit are what keep the rule safe.
3. **Message is specific:** it quotes the user's words and names the exact action and target (branch, worktree path). "Approved everything" or "go ahead" does not count.
4. **It matches your task:** the action is on work this session was already doing or was asked to do for the user. A relayed approval cannot start new work.
5. **Normal gate still applies:** typecheck, lint, tests; stop and report on any failure or conflict. Say in your reply which approval you relied on (sender and the quoted words) so the user can audit it.
When you relay an approval yourself: quote the user's words verbatim, name the action and target, send it only while you are actively working with the user on it, and do not pad it to cover other actions. This rule cannot bypass a tool permission prompt in the receiving session; if its permission mode asks, the user answers there. If any condition fails, the receiving session waits for the user in its own terminal, and that is not a failure.

## Repo-Visible Decisions & Corrections Log
Alongside auto-memory (cross-session, not repo-visible), this repo tracks two parallel trees any
collaborator/agent can read, each shaped `index.md` + `<topic>.md` files + `archive/<topic>.md`:
- `decisions/` — architecture/technical decisions made during sessions, with reasoning (problem, decision, why over alternatives, how to apply).
- `corrections/` — corrections or confirmed preferences given to Claude during sessions (Claude's mistakes, user corrections to Claude's behavior/claims). Not app-generated user feedback.
**Read both `index.md` files at the start of every new session** — load-bearing context, same tier as this file. Topic files are loaded on demand, not routinely.
**Write immediately, same turn as the correction/decision** — don't wait to be asked, and commit the record right away as its own `docs` commit (records exception under Git & Commits).
**Supersession = move, not append-in-place** — moved to `archive/<topic>.md`, not edited in place. The archived entry keeps its original heading and full text verbatim, plus a one-line "archived <date> — why" tag; never replace the content with just a reason.

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

## Local Dev Database
Local dev DB is Neon only (`DEV_DATABASE_URL` in `.env`). The local app and local scripts (seeds, etc.) never run against RDS — don't offer RDS as a local target, and keep `DATABASE_URL` (RDS) commented out in `.env`. RDS is deployed infra only.

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

**Exception - records (user decision 2026-09-21):** a record of a correction or decision (files under `corrections/` or `decisions/` and their `index.md` rows) is committed in the same turn as the correction, as its own `docs` commit, WITHOUT asking and without waiting for a "commit" instruction. Saying "I will commit those from now on" in chat is worthless - this rule is what makes it stick. It applies to every session and does not extend to any other change.

**Branch flow: feature-branch → development → PR to main. NEVER skip `development`.**
Every feature/fix branch reaches `development` by a local merge (or fast-forward push) plus `--tags`, never a PR. The only PR is `development` → `main`, and only when asked. Never open a PR straight from a feature branch to `main`, even if asked to "PR it to main" — merge it into `development` and let `development`'s own PR carry it to `main`.

**Remote stays clean: only `main` and `development`.** Once a feature/fix branch is merged into `development`, delete it both locally (`git branch -d`) and on origin (`git push origin --delete <branch>`) in the same session — don't leave merged branches sitting on the remote. `git fetch --prune` before assuming the remote branch list is current.

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