# Git Rules

## Before Committing
1. `npm run typecheck`
2. `npm run lint:check`
3. `npm test`
4. Env vars via config exports only — never direct access to env
5. No commented-out code

## Commit Rules
- **ALWAYS ask before committing** — never auto-commit
- **Exception - records (user decision 2026-09-21):** a commit that ONLY records a correction or decision (`corrections/`, `decisions/` and their `index.md` rows) is made in the same turn as the correction, as a `docs` commit, without asking and without waiting for a "commit" instruction. Every session, not just this one. It does not extend to any other change.
- Don't run /commit skill on small fixes, formatting or docs changing
- Always ask before invoking /commit
- Never jump ahead to commit without being asked
- Commit messages: imperative, present tense, describe what was **implemented** not just what changed
- Generate messages with /caveman-commit skill
- **Never claim commit succeeded without running actual `git commit`** — /caveman-commit is drafting only
- When committing after review fixes: include original work scope, not just the fix
- Use branches for features/fixes
- **Every separate piece of work gets its own branch.** At the start of any new piece of work, check `git branch --show-current`; if it is not a branch for that work, create one (`rfc/<topic>`, `feat/<topic>`, `fix/<topic>` etc.) before the first commit, without waiting to be asked. Never pile unrelated work onto whatever branch happens to be checked out.
- Conventional commits: `feat`, `fix`, `docs`, `style`, `rfc`, `test`, `chore`. Breaking changes: `feat!:`
- Think on what the current commit job is before deciding if it either `feat`, `rfc`, `fix`, etc and REPORT BACK your reasoning - Don't just mechanically label as `feat` for everything.
- *IMPORTANT:* refactor job - always name `rfc` instead of `refactor`!
- If you're not sure, read `"C:\Users\66bar\OneDrive\documents\Programming\conventional-commits-cheatsheet.md"` for more info
- **Always push tags** — whenever pushing a branch, also push tags (`git push origin --tags`). The version-bump hook tags every bumped commit locally; unpushed tags leave the remote's versions stale.
- **Always pull before pushing** — before any `git push` (a branch, `development`, tags), run `git pull --ff-only origin <branch>` first; if it can't fast-forward, fetch and rebase or merge, then push. Never push from a stale branch: `development` must always contain `origin/development`, so local → development → main stays in sync.
- Atomic commits — one change or fix per commit
- Claude's plans must never be committed
- Use /commit skill only when user explicitly invokes it — never on plain "commit"
- **"open pr" = "open the PR and merge it if CI is green"** (user alias, 09/10/2026). Opens `development` → `main`, waits for all checks, merges if every one passes; if any fails or is pending, stop and report. Merging only queues the Deploy workflow, which still waits for the user's approval click on the `aws-production` environment. If the merge is blocked (e.g. the stacked-PR asynchronous-merge error, or a permission denial), report it; do not work around it.
