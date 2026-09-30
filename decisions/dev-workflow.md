# Decisions — Dev Workflow & Git Hooks

⚠️ Load only when following a link from [[decisions/index]] for a specific entry, or scanning for
context in this topic — not routinely.

---

## 07/09/2026 — Root cause of lost post-commit version-bump hook: `.husky` gitignored + husky never wired up

**Problem:** A post-commit hook that auto-bumps `package.json` version per commit type existed at some point but was missing after a directory move — two `fix` commits (`2bbfc55`, `bb3f4aa`) shipped without their version bump, caught only because the user noticed and asked why.

**Root cause (two layered issues):**
1. `.gitignore:43` ignores `.husky` entirely. `.husky/pre-commit` is tracked today only because it was force-added (`git add -f`) at some point in the past — any new file dropped into `.husky/` afterward (like a `post-commit` script) is silently ignored by git and never committed. A directory move/re-clone drops anything never committed.
2. Deeper: `core.hooksPath` was never actually configured in this checkout at all (no `prepare` script in `package.json`, `.git/hooks/` held only `.sample` files) — meaning even `.husky/pre-commit` (lint-staged) was not being invoked by git as a hook, regardless of the gitignore issue. `npx husky` (v9) needs to run once to set `core.hooksPath` to `.husky/_`, and needs a `"prepare": "husky"` script so a fresh `npm install` re-wires it.

**Decision:**
- Added `"prepare": "husky"` to `package.json` and ran `npx husky` once to set `core.hooksPath`.
- Recreated `.husky/post-commit` (tested on `test/post-commit-hook` branch first, including feat/fix dummy commits to confirm patch/minor bump behavior and no infinite amend loop) and force-added it (`git add -f`), same pattern as `pre-commit`.
- Hardened the hook to no-op during rebase/cherry-pick/merge (`git commit --amend` is invalid mid-cherry-pick and corrupted an early test attempt).
- Same hook + force-add pattern to be applied to `pulse--client` and other projects under `~/Claude/work/projects/` that want the same version convention.

**Why this approach over alternatives:** Removing `.husky` from `.gitignore` entirely was considered but rejected — unclear why it was added in the first place; safer to force-add the specific files needed than change ignore behavior repo-wide without knowing original intent.

**How to apply:** Any new file added under `.husky/` must be force-added (`git add -f`) or it silently never commits — check with `git ls-files .husky/` after adding a hook. After a fresh clone, run `npm install` (triggers `prepare` -> `npx husky`) before relying on any git hook in this repo.

---

## 30/09/2026 — Error-watcher records: index + files, on a local amended branch that ships only with a fix

**Problem:** The AWS watcher wrote its checkpoint and entries into `docs/PROD-ERRORS.md` in the shared checkout. Quiet runs left an uncommitted checkpoint edit behind every 5h (it only committed when it found errors), noisy runs would add a commit per run to `development`, and one growing file would get long once real traffic starts. While checking a quiet run, also found the watcher had been blind since it started (it parsed pretty-printed `logs/error.log` as JSON lines; fixed in `3748894` by reading `docker logs --since`).

**Decision:**
- Records move to `docs/prod-errors/`: `index.md` holds the checkpoint, one table row per error signature and the 404 tallies; each diagnosed error gets its own `<slug>.md`; stale resolved ones go to `archive/`. Same shape as `decisions/` and `corrections/`. The client's Sentry watcher gets the same in `docs/sentry-errors/`.
- The routine writes records only in its own worktree (`../pulse--server.wt/monitor-records`) on the local branch `monitor/records`, kept as exactly one commit on top of `development` and amended every run. It is merged into `development` and pushed only in a run that merges a fix. Fixes are also made in their own worktrees.

**Why over alternatives:** committing records straight to `development` (the old step 7) fills history with bookkeeping and pushes it on its own; leaving them uncommitted dirties the shared checkout other sessions use. An amended local branch keeps both clean and still loses nothing, since the branch persists between runs and the notification quotes unshipped records.

**How to apply:** Look for the latest watcher records on the `monitor/records` branch, not only on `development`. Never push that branch on its own or let it grow past one commit. Watcher steps are in `.claude/routines/prod-error-monitor.md` (and the client's `sentry-error-monitor.md`).
