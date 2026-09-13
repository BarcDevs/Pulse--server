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
