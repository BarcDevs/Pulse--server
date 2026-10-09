# Prod Error Monitor Routine

Runs every 5h as a **Local** routine ("Pulse AWS Error Watch" at claude.ai/code/routines),
not a Cloud routine. Deliberate: a cloud routine's AWS credentials are shared with every
session/routine using that cloud environment, which is explicitly not wanted here (same
reasoning as not using a third-party service like Sentry — no external/shared-scope
credential exposure). This machine's own AWS CLI creds (already used for manual SSM
redeploys) are reused instead — never added to a cloud environment. Working directory:
`C:\Users\66bar\Claude\work\projects\pulse\.watchers` (dedicated, so run sessions are saved
outside the repo's `/resume` list; the routine starts there, not in the repo). Design:
`docs/plans/2026-09-28-prod-error-monitor-design.md`. Milestones:
`.claude/milestones/prod-error-monitor.md`.

## Where records live

Records are `docs/prod-errors/index.md` (checkpoint, one row per error signature, 404 tallies)
plus one `docs/prod-errors/<slug>.md` per diagnosed error. The routine never writes them in the
shared checkout. It keeps them on the local branch `monitor/records`, in its own worktree
`../pulse--server.wt/monitor-records`, as **exactly one commit on top of `development`, amended
every run**. That commit reaches `development` (and origin) only inside a fix PR that a human
merges, so quiet runs leave no commits, no pushes and no dirty tree anywhere.

The routine does NOT start in the repo, so define absolute paths first and never rely on the
current directory:
`MAIN=C:/Users/66bar/Claude/work/projects/pulse/pulse--server`,
`WT=C:/Users/66bar/Claude/work/projects/pulse/pulse--server.wt/monitor-records`.
Every git command takes `-C "$MAIN"` (shared checkout) or `-C "$WT"` (records worktree) or `-C`
of a fix worktree. Run the monitor scripts from `$MAIN` (it has `node_modules`) but by their path
in `$WT`, e.g. `cd "$MAIN" && npx tsx "$WT/scripts/monitor/checkpoint.ts" get`, so they read and
write `$WT`'s records. Before committing anything, read `$MAIN/GIT_RULES.md` (the repo's
`CLAUDE.md` does not auto-load from here).

## Steps

1. **Prepare the records worktree.**
   - If `$WT` doesn't exist: `git -C "$MAIN" worktree add "$WT" -B monitor/records development`.
   - `N=$(git -C "$WT" rev-list --count development..monitor/records)`.
     `N=0`: `git -C "$WT" merge --ff-only development`. `N=1`: `git -C "$WT" rebase development`
     (on conflict: `git -C "$WT" rebase --abort`, notify, stop). `N>1`: the one-commit rule is
     broken; notify and stop without touching anything.
2. **Get the checkpoint** and note the run start: `CHECKPOINT=$(npx tsx
   "$WT/scripts/monitor/checkpoint.ts" get)`, `RUN_START=<now, ISO8601>` (taken before pulling,
   so errors logged during the run land in the next window).
3. **Pull new errors:** `bash "$WT/scripts/monitor/pull-prod-logs.sh" "$CHECKPOINT" > <temp
   file outside the repo>`. It resolves the EC2 instance live by tag (`Name=pulse-server`); never
   pass or hardcode an instance id (the server sits behind an ASG).
   - Exit 0: `NEXT_CHECKPOINT=$RUN_START`.
   - Exit 3 (SSM output cap hit, only the oldest new errors came back):
     `NEXT_CHECKPOINT=<timestamp of the last line in the file>`; the next run picks up the rest.
   - Any other exit: notify with the error and **stop without moving the checkpoint**. An empty
     result from a failed pull must never be recorded as "no errors".
4. **Process:** `npx tsx "$WT/scripts/monitor/processLogs.ts" < <temp file>`. It bumps matching
   Known Fixes rows and 404 lines in `$WT/docs/prod-errors/index.md` and prints a JSON array of
   unknown errors, one per signature (with `count`).
5. For each unknown error:
   a. **Diagnose.** Read the relevant source under `$MAIN/` around the error (`stack` gives the file).
      Form a root-cause hypothesis and a minimal fix.
   b. **Confidence gate.** Only proceed to (c) if BOTH hold: the stack trace points to a
      specific line/function in this repo (not a third-party/node_modules frame as the
      sole location), AND the fix is a small, localized change (no schema/migration,
      no cross-cutting refactor, no ambiguity about which of >1 plausible causes is
      correct). If either fails: skip to (e) as notify-only.
   c. **Fix** in its own worktree, never in the shared checkout:
      `git -C "$MAIN" worktree add "$MAIN/../pulse--server.wt/monitor-fix-<slug>" -b fix/monitor-<slug> development`,
      then `cd` into that worktree for everything below (tests, review and commit act on the
      current directory). Make the minimal fix. Run `npm test` and `npm run typecheck` — do not
      proceed if either fails; fall back to notify-only instead. Commit per this repo's
      `GIT_RULES.md`.
   d. **Full review before opening a PR.** From inside the fix worktree, invoke the local `code-review`
      skill (via the Skill tool) on the branch's diff — the one that runs code-reviewer, architecture-auditor,
      duplication-eliminator and security-scanner in parallel, then style-enforcer, i.e.
      `/commit`'s review without the typecheck/lint/commit steps. NOT the cloud multi-agent
      `/code-review ultra` (`/ultrareview`): never pass `ultra`, it is user-triggered and billed. Any HIGH/CRITICAL
      finding, or an ESCALATE line → no PR is opened; notify-only with the review
      findings, and leave the branch unmerged for manual review instead of deleting it. Only
      a clean review (or one whose own auto-fixes were applied and tests/typecheck still pass)
      counts as a fix ready for a PR. This is the actual gate against shipping unsafe
      autonomous code — the confidence gate in (b) only decides whether to *attempt* a fix,
      not whether it's safe to land.
   e. **Record** in `$WT`: add a Known Fixes row to `docs/prod-errors/index.md` (signature from
      the processor output, occurrences = its `count`, first/last seen = today, link to the
      file) and write `docs/prod-errors/<slug>.md` from the template in the index, with the root
      cause and one of: the fix + commit link, `not auto-applied, notify only (see confidence
      gate)`, or `blocked by review, branch <name> left unmerged`.
6. **Set the checkpoint:** `npx tsx "$WT/scripts/monitor/checkpoint.ts" set "$NEXT_CHECKPOINT"`.
7. **Amend the records commit** in `$WT` (`git -C "$WT" add docs/prod-errors`):
   no records commit yet (`N=0` after step 1) → `git commit -m "docs(prod-errors): monitor
   records"`; otherwise `git commit --amend --no-edit`. Never a second commit.
8. **Open PRs, only if at least one fix passed (d).** Open a PR for each passing fix; never merge it. In order, per passing fix, from its fix
   worktree: (1) for the FIRST passing fix of the run only, if `monitor/records` has a records
   commit, `git merge --no-ff monitor/records -m "Merge branch 'monitor/records' into <branch>"`
   so the records ship in that PR; (2) `git push -u origin <branch>`; (3) `gh pr create --base
   development --head <branch>` with a title in the repo's commit convention and a body with: the
   Sentry issue link, evidence-backed root cause (`file:line`), what the fix changes, the
   typecheck/test results and the `/code-review` result. Once that PR exists, `git -C "$WT" reset
   --hard development` (the records now live in the PR; the next run starts clean), then
   `git -C "$MAIN" worktree remove` the fix worktree and keep the pushed branch for the PR.
   NEVER merge a PR, enable auto-merge, or push `development`. If push or `gh` fails, notify with
   the error and leave the branch and records as they are. If no fix passed, nothing is pushed;
   the records wait on `monitor/records` for the next fix.
9. **Notify** with a summary of the run: N Known Fixes rows bumped, N new 404-pattern hits, N
   new errors (M fix PRs opened, K notify-only, J blocked by review), the PR links, and the new
   records (quote them: they are on origin only inside a fix PR a human hasn't merged yet).

## Guardrails

- Never touch `main`, never force-push, never merge a PR, never enable auto-merge. Opening PRs
  into `development` is expected (step 8).
- Never commit records on `development` directly, never push `development`, never push
  `monitor/records` on its own (records ship inside a fix PR), and keep it at most one commit
  ahead of `development` (amend, don't add).
- Never invent a fix for an error whose cause isn't clearly localized (see confidence
  gate) — a wrong guess in prod is worse than a delayed manual fix.
- Never open a fix PR that hasn't cleanly passed the full `/code-review` (step 5d) — it is the
  quality gate on what a human is asked to merge, since this routine may run on a
  smaller/cheaper model whose own judgment of "safe to land" isn't trusted alone.
- Never switch branches, stash or reset in the shared checkout.
- If the checkpoint comment in `$WT/docs/prod-errors/index.md` is missing/corrupted, stop and
  notify instead of guessing a timestamp.
- If no running instance tagged `Name=pulse-server` is found, or AWS credentials aren't
  available in this environment, notify and stop rather than failing silently.
