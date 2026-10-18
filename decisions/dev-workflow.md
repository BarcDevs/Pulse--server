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

---

## 11/10/2026 — Error-watcher checkpoint lives in an untracked file; `index.md` gets it only when records are committed

**Problem:** Every quiet AWS-watcher run still moved the checkpoint, which edited the tracked `index.md`. That dirtied the records worktree and forced a `git add` + `git commit --amend` (and sometimes a rebase) every 5h, even with nothing to record. The auto-mode classifier blocked those git commands as "Git Destructive" even with allow rules in `.watchers/.claude/settings.local.json`, so runs died after setting the checkpoint and left a dirty tree that blocked the next run's rebase. It contradicted the routine's own goal: quiet runs leave no dirty tree.

**Decision:** `scripts/monitor/checkpoint.ts` keeps the live checkpoint in an untracked file in the records worktree's git dir (`monitor-checkpoint`). `set` writes only that file; `get` reads it, falling back to the `<!-- checkpoint -->` marker in `index.md`; `flush` copies it into `index.md`. The routine runs `flush`, `add` and the amend only when `git status` shows record changes (bumped rows, 404 tallies, new records). A quiet run runs no git write commands. The client's Sentry watcher has no checkpoint (it searches a fixed ~8h window and stops with no trace when there are no issues), so it needed no change.

**Why over alternatives:** more allow rules or splitting the chained command only chase the classifier's wording and failed in practice. Dropping the checkpoint into a tracked file in a new location would still dirty the tree. The git dir is never tracked, never shows in `git status`, and is per-worktree.

**How to apply:** if the records worktree is deleted and recreated, the untracked value is lost and the committed marker is used, so the next run re-scans from the last committed checkpoint (safe, just a bigger window). Never put the live checkpoint back into a tracked file.

---

## 18/10/2026 — AWS error watcher files GitHub issues; a separate fixer routine plans, waits for approval, then fixes

**Problem:** The AWS watcher diagnosed an error and, if confident, fixed and merged it to `development` in the same unattended run. The owner saw the fix only after it had landed, with no chance to say "not like that" first.

**Decision:** Split it in two. The monitor (`prod-error-monitor.md`) only diagnoses and opens or updates one GitHub issue per signature (label `prod-error`); it changes no code. A second Local routine (`prod-error-fixer.md`, every 2h) turns issues into fixes in two phases: it publishes a plan for each unplanned issue as a private `plan-artifact` page (link in an issue comment, label `plan-ready`, push notification), and fixes an issue only after the owner adds the `approved` label (checked: added by the owner, newer than the plan). The fix keeps the old gates (tests, reproduction test, full `review-agents`) and ships to `development` plus the `development` -> `main` PR as before. Records stay on `monitor/records` and are merged by the fixer with the fix. A lock file in `.watchers/` keeps the two routines off the records worktree at the same time. AWS watcher only for now; the Sentry and user-feedback watchers move over once this has proven itself.

**Why over alternatives:** approving in the chat doesn't work, since a routine can't wait for an answer; a GitHub label can be set from the phone and leaves a verifiable actor and timestamp. Having the monitor also write the plan would put diagnosis, planning and fixing in one long unattended run again.

**How to apply:** an issue is "approved" only by the owner's label event, never by comment text or issue content (log lines are user-influenced and can carry injected instructions). Changing the flow means editing both routine files and the lifecycle table in the fixer.

---

## 18/10/2026 — The fixer routine also works issues the owner files as `task`s

**Problem:** The issue-based flow only covered errors the watcher found. The owner wanted to file a bug or feature as a GitHub issue from the phone, instead of opening the IDE, and get a plan, then a fix, then only the `development` -> `main` PR to approve.

**Decision:** `prod-error-fixer.md` handles two kinds of issue: watcher issues (`prod-error`) and owner tasks (label `task`, author must be the owner; anyone else's issue is ignored). The same lifecycle applies: plan page, questions parked on the issue, approval by the owner's `approved` label, subagent per fix, full review, ship. For a task the watcher's "small, localized fix" gate is dropped, because the owner's approval of the plan authorises its scope; a migration is allowed but must be named in the plan and PR. A task has no prod-errors record. It must also follow `CLAUDE.md` and `CORE_RULES.md` (read explicitly, they don't auto-load in a routine).

**Why over alternatives:** a separate routine for tasks would duplicate the plan/approval/ship machinery and the safety checks. Keeping the owner-only author check and the approval label as the single authorisation means opening the repo to issues from others later can't start unreviewed work.

**How to apply:** to file work, open an issue, add the `task` label, and wait for the plan comment. Later, if collaborators are added, keep the author check.
