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

## 26/09/2026 - Every separate piece of work gets its own branch

A whole rfc series was done on whatever branch was checked out (an upgrade branch) without creating a branch for it; another session then merged unrelated work into that branch, mixing the two. User: "u shoul've done it by yourself. a separate branch for every separate work needed."

**Lesson:** at the start of any new piece of work, check `git branch --show-current`; if it is not a branch for that work, create one (`rfc/<topic>`, `feat/<topic>`, `fix/<topic>` etc.) before the first commit, without waiting to be asked. Never pile unrelated work onto whatever branch happens to be checked out.

---

## 28/09/2026 - Version-bump tag collision across parallel branches: bump to the next free version

Two `fix` branches were open off the same base (1.4.1); each commit's post-commit hook bumped to 1.4.2. The second one's `git tag v1.4.2` failed (hook exit 128) because the first branch already owned the tag, leaving an untagged commit that duplicated the version. User: "bump to v1.4.3 and assign the correct tag. do it whenever a collision like this happens".

**Lesson:** after any commit where the post-commit hook fails with a tag collision (`git tag` exit 128 / `v<ver>` already exists), without asking: take the next free version above the highest existing `v*` tag, set it in `package.json` + `package-lock.json` (root and `packages[""]`), amend with `SKIP_VERSION_BUMP=1 git commit --amend` updating the `Version-Bump:` footer, then `git tag v<new>`. Only on unpushed commits. Expect a version-line conflict in `package.json`/lock when the second branch merges; resolve it to the higher version.
