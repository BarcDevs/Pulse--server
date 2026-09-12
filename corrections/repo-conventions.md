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
