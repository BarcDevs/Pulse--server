# Corrections — Repo Conventions

⚠️ Load only when following a link from [[corrections/index]] for a specific entry, or scanning for
context in this topic — not routinely.

---

## 10/08/2026 — Delete temp/generated files immediately after they've served their purpose

**Correction:** build scripts, draft docs, temp Postman collections, duplicate configs — don't leave them sitting in the repo waiting for a cleanup pass.

**Lesson:** delete temp/generated files immediately after they've served their purpose.

---

## 10/08/2026 — `config/` (env system) vs. `src/config/` (app-level constants) are different things

**Correction:** `config/` (root, node-config env system) and `src/config/` (app-level constants/domain config, e.g. `recoveryGoals.ts`, `progressInsights.ts`) are different things — root `config/CLAUDE.md`'s "config/ is exclusively for env-mapped config" rule does not apply to `src/config/`.

**Lesson:** `src/config/*.ts` files are not env-mapped and belong where they are; don't move them to `src/constants/`.

---

## 10/08/2026 — Never run `prisma migrate reset` without explicit user confirmation

**Correction:** `prisma migrate reset` destroys all data in the dev DB.

**Lesson:** never run it without explicit user confirmation, including in auto mode. Use `prisma migrate dev` (keeps data) or `prisma migrate deploy` (CI/prod) instead; only ever suggest `reset` as an option and wait for an explicit yes.

---

## 18/09/2026 — Don't push a branch or open a PR after a fix unless explicitly asked

**Correction:** after committing a bug fix locally, auto-followed with `git push` then `gh pr create` into `development` — neither asked for. User caught both: "you shouldn't pr every fix if im not telling u", then "also why did u pushed from a fix branch?????"

**Lesson:** committing locally is fine by default (matches the feature→development→main pipeline), but pushing to remote and opening a PR are separate, explicit actions — push publishes to a shared remote, which the global permission rules already gate on confirmation. After a local commit, stop and report the commit (branch, hash); only push/PR when the user actually says to.

---

## 26/09/2026 - Every separate piece of work gets its own branch

A whole rfc series was done on whatever branch was checked out (an upgrade branch) without creating a branch for it; another session then merged unrelated work into that branch, mixing the two. User: "u shoul've done it by yourself. a separate branch for every separate work needed."

**Lesson:** at the start of any new piece of work, check `git branch --show-current`; if it is not a branch for that work, create one (`rfc/<topic>`, `feat/<topic>`, `fix/<topic>` etc.) before the first commit, without waiting to be asked. Never pile unrelated work onto whatever branch happens to be checked out.

---

## 28/09/2026 - Merge and close worktrees when the work is done

`feat/localise-error-messages` (error codes for client localization) sat finished in its own worktree for over a day, never pushed or merged, while `development`'s TODO already marked the item closed - so it looked shipped when it wasn't. User: "add a rule (sync in all places) to always merge and close WT when done working on it".

**Lesson:** when work in a worktree is finished, merge its branch into the integration branch (per branch flow), `git worktree remove` it and `git branch -d` the branch in the same session. Verify "merged" with `git cherry <integration> <branch>` (no `+` lines), not by a TODO saying it's done. Rule lives in the "Shared Checkouts & Other Sessions" section of this repo's CLAUDE.md, pulse--client, pantry and both `.sources` CLAUDE skeletons.

## 28/09/2026 - Version-bump tag collision across parallel branches: bump to the next free version

Two `fix` branches were open off the same base (1.4.1); each commit's post-commit hook bumped to 1.4.2. The second one's `git tag v1.4.2` failed (hook exit 128) because the first branch already owned the tag, leaving an untagged commit that duplicated the version. User: "bump to v1.4.3 and assign the correct tag. do it whenever a collision like this happens".

**Lesson:** after any commit where the post-commit hook fails with a tag collision (`git tag` exit 128 / `v<ver>` already exists), without asking: take the next free version above the highest existing `v*` tag, set it in `package.json` + `package-lock.json` (root and `packages[""]`), amend with `SKIP_VERSION_BUMP=1 git commit --amend` updating the `Version-Bump:` footer, then `git tag v<new>`. Only on unpushed commits. Expect a version-line conflict in `package.json`/lock when the second branch merges; resolve it to the higher version.

---

## 29/09/2026 — Worktrees only when another session is actively working in the repo

During the security-audit follow-up I created a new worktree for every piece of work (M1, M2, email config, Hebrew email), each with a `node_modules` junction, `npx husky` and `prisma generate`, even after the only other session on the repo had gone idle. User: "why are you working on a WT when no other session active on codebase??????". The worktree overhead also caused misses: hooks didn't fire until `npx husky` was run, and the user tested an unmerged fix from the main checkout, which still had the old code.

**Lesson:** default to a branch in the main checkout. Check `ListAgents` first. Use a worktree only when another session is **busy** in the same repo, not merely listed or idle. Work already started in a worktree is moved back to the main checkout once the other session is done.

---

## 29/09/2026 — Routed a hand-off to a session picked by its name instead of the active collaborator

The user said "tell client to reverse it as well". The collaborator all session had been `server-security-audit-fixes`, which also did the client side of L1. I picked `pulse-client-95` from `ListAgents` because of its name, although it had been idle for 5 days and had never been part of the work. I then reported the hand-off as done, based only on a "queued" delivery result. User: "there's no session in this name, idk where you swithed from @server-security-audit-fixes to this but you should get it together".

**Lesson:** hand work to the session already collaborating on it, not to the one whose name matches the repo. If the target is ambiguous, ask. A "queued" result is not a hand-off: say it's done only after the other session replies.

---

## 29/09/2026 — Model Selection section in CLAUDE.md still said Haiku for sub-agents

`CLAUDE.md` Model Selection told sessions to use Haiku for sub-agents and lookups, a leftover from before the move to Sonnet. Noticed while checking which model the commit-skill agents run on. The real setup: Sonnet is the default for execution and every sub-agent, Opus via `/opusplan` for planning and hard reasoning.

**Lesson:** when a `CLAUDE.md` line conflicts with the user's global rule (all sub-agents on Sonnet), the repo line is stale, not an override. Fixed in both pulse repos.

---

## 29/09/2026 — Opened a PR from feature branch into `development` instead of merging directly

Pushed `feat/prod-error-monitor` and started opening a PR into `development`. User interrupted, angrily: "no, dev doesnt need a pr in the 100000000000000 time!!!!!!! only main". I'd misread the repo's "feature-branch → development → PR to main, never skip development" rule as meaning every hop needs a PR; it only means the `development` step can't be skipped when going to `main` — the feature→`development` step itself is a direct merge.

**Lesson:** only `development` → `main` goes through a PR. Feature/fix branch → `development` is `git merge` (or fast-forward), no PR, no branch protection expected on that hop.
