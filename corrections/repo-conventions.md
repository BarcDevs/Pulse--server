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
