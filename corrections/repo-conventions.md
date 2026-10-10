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

---

## 29/09/2026 — Attributed another session's commits without evidence, twice

CI on `development` broke from the prod error monitor commits (`e3e764c`, `0f4e181`). I first reported it to `aws-monitor`, because an earlier @-mention had named it, and then to my peer `server-security-audit-fixes`. Neither owned the work; the commits carried a `Claude-Session` trailer that matched no session I could name. The user had to step in twice. User: "why aws monitor? he's not related to any of this" and "im tired of being your babysitter".

**Lesson:** before reporting to an "owner", check it: match the commit's `Claude-Session` trailer, or ask one question. If no session can be shown to own it, apply the user's fallback rule (here: "if not, fix it") at once instead of routing it again. In any case, fix CI breaks that block everyone quickly, on a separate branch or worktree that leaves the other session's files alone.

---

## 30/09/2026 — Added migrations without applying them to the dev DB

The H1 fix (28/09) added `20260928191230_add_email_verified_at` and the overnight M3 fix added `20260930020000_add_share_notes_with_ai`. Tests passed because the jest integration setup runs `migrate deploy` on its own Postgres, but the Neon dev DB was never migrated. The user's dev server then failed with "The column `User.emailVerifiedAt` does not exist in the current database." User: "also you forgot to migrate the db".

**Lesson:** a change that adds a migration isn't done until `npx prisma migrate status` against the dev DB (Neon, `DEV_DATABASE_URL`) is clean. Apply it with `npx prisma migrate deploy` in the same step. It only applies additive, pending migrations and never resets. Prod gets it from `ec2-redeploy.sh`; the dev DB gets nothing automatically.

---

## 02/10/2026 — Judged DB changes against Neon first instead of RDS

During the DB perf pass I tested and reasoned about pool/timeout/index changes against the Neon dev DB (it was the only DB reachable) and only looked at RDS afterwards. User: "you should address RDS first not neon". Neon is dev only; RDS is what production runs on, and it differs: migrations run as `pulse_admin` while the app runs as `pulse_app` (no DDL), the redeploy gate rejects `DROP`/`RENAME COLUMN|TABLE`, and `db.t3.micro` has a small `max_connections`.

**Lesson:** for any DB change, check the RDS constraints first (`docs/DEPLOYMENT.md`: roles, deploy gate, instance size, Postgres 17.10) and design for them; Neon is only where it gets exercised locally. Say what could not be verified on RDS, since local work never runs against it.

---

## 02/10/2026 — Picked the client session by name again after offering to ask

I wrote that I would not pick a client session without asking. The user then said "tell client" (no session name) and I sent the request to `pulse-client-68`, the only live session with "client" in its name, which had never been part of this work. User: "why `pulse-client-68` again???????? i explicitly told you which session to use, also rule says never decide automatically which random session to use". Repeat of the 29/09/2026 entry above.

**Lesson:** "tell client" / "tell audit" is a role, not a session. Use a session only if the user named it in this conversation or it is already collaborating on this work; otherwise ask which one before sending anything, even when only one candidate exists. Being the only name match is exactly the failing case. A "queued" delivery is still not a hand-off.


---

## 09/10/2026 — Pushed and opened a PR after running only typecheck

Asked to commit, merge stale branches into `development`, push and open a PR, I ran `npm run typecheck` and pushed. `GIT_RULES.md` requires typecheck, lint and unit tests before committing, and the merge pulled in 585 lines from `fix/ai-prompt-quality`. CI's integration job then failed (a Docker Hub rate limit, unrelated to the code), and I had no local result to say whether the merged code was actually fine. User: "integrations failed, shouldve run before pushing".

**Lesson:** before any push of merged work, run the whole gate locally: `npm run typecheck`, `npm run lint:check`, `npm test` and, after merging branches, `npm run test:integration` (`docker-compose -f docker-compose.test.yml up -d` first). One passing check is not "validated". On this Windows shell, `NODE_ENV=test` in the npm scripts fails under `cmd`, so `export NODE_ENV=test` and call `npx jest` directly.

---

## 09/10/2026 — Removing worktrees left the main checkout's `node_modules` empty

After `git worktree remove` on two worktrees, the main checkout's `node_modules/` was an empty directory, so `eslint` and `jest` could not run (`npm ci` restored it). Typecheck had passed minutes earlier, so something in between emptied it. The likely cause is a worktree `node_modules` junction to main's being followed by the removal, but that was not confirmed. One of the worktrees (`monitor-records`) also still existed on disk afterwards.

**Lesson:** before `git worktree remove`, check whether the worktree's `node_modules` is a junction/symlink (`Get-Item <wt>\node_modules | fl LinkType,Target`); if so remove the link itself first. After any worktree removal, check the main checkout still has `node_modules` before running tests. Treat the cause as unconfirmed until reproduced.

---

## 09/10/2026 — "open pr" means open the PR and merge it if CI is green

Asked to "open pr", I opened `development` → `main` and then waited, because I read "open" literally. The user had meant their shorthand: "`open pr` = alias to `open pr and merge if green`, I don't write the whole sentence every time". Two earlier "open PR" requests had been left unmerged for the same reason.

**How to apply:** when the user says "open pr" (or "open the PR"), open it, wait for the checks, and merge it if they are all green; if any check fails or is pending, stop and report. Merging into `main` only queues the Deploy workflow, which still waits for the user's approval click on the `aws-production` environment. If the merge itself is blocked (e.g. the "stacked PR" asynchronous-merge error, or a permission denial), report that instead of working around it.

---

## 10/10/2026 — Told sessions to remove worktree junctions with `cmd /c rmdir`, which Git Bash mangles

Repeat of the 09/10/2026 entry. I told two sessions to remove each worktree's `node_modules` and `prisma/generated` junctions with `cmd /c rmdir` before `git worktree remove`. From Git Bash `/c` is rewritten as a path, so the first session's `cmd //c rmdir` calls failed silently, `git worktree remove` followed the junctions and emptied the main checkout's `node_modules` and `prisma/generated`. It was restored with `npm ci` and `npm run prisma:generate`; a few minutes of anything run in the main checkout or in other worktrees could have failed.

**How to apply:** when handing out the junction removal, give the exact command for the receiving shell (PowerShell: `cmd /c rmdir <path>`, Git Bash: `cmd //c rmdir <path>`), and require a check that the link is gone (`Test-Path` false, or `ls` shows no entry) BEFORE `git worktree remove`. Do not run `git worktree remove` while the check fails. Prefer not creating the junctions at all when a plain `npm ci` in the worktree is affordable.
