# Prod Error Monitor Routine

Runs every 5h as a **Local** routine ("Pulse AWS Error Watch" at claude.ai/code/routines),
not a Cloud routine. Deliberate: a cloud routine's AWS credentials are shared with every
session/routine using that cloud environment, which is explicitly not wanted here (same
reasoning as not using a third-party service like Sentry — no external/shared-scope
credential exposure). This machine's own AWS CLI creds (already used for manual SSM
redeploys) are reused instead — never added to a cloud environment. Working directory:
`C:\Users\66bar\Claude\work\projects\pulse\pulse--server`. Design:
`docs/plans/2026-09-28-prod-error-monitor-design.md`. Milestones:
`.claude/milestones/prod-error-monitor.md`.

## Where records live

Records are `docs/prod-errors/index.md` (checkpoint, one row per error signature, 404 tallies)
plus one `docs/prod-errors/<slug>.md` per diagnosed error. The routine never writes them in the
shared checkout. It keeps them on the local branch `monitor/records`, in its own worktree
`../pulse--server.wt/monitor-records`, as **exactly one commit on top of `development`, amended
every run**. That commit reaches `development` (and origin) only in a run that merges a fix, so
quiet runs leave no commits, no pushes and no dirty tree anywhere.

Below, `$MAIN` is the repo root and `$WT` is the records worktree. Run the monitor scripts from
`$MAIN` (it has `node_modules`) but by their path in `$WT`, e.g.
`npx tsx "$WT/scripts/monitor/checkpoint.ts" get`, so they read and write `$WT`'s records.

## Steps

1. **Prepare the records worktree.**
   - If `$WT` doesn't exist: `git worktree add "$WT" -B monitor/records development`.
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
   a. **Diagnose.** Read the relevant source around the error (`stack` gives the file).
      Form a root-cause hypothesis and a minimal fix.
   b. **Confidence gate.** Only proceed to (c) if BOTH hold: the stack trace points to a
      specific line/function in this repo (not a third-party/node_modules frame as the
      sole location), AND the fix is a small, localized change (no schema/migration,
      no cross-cutting refactor, no ambiguity about which of >1 plausible causes is
      correct). If either fails: skip to (e) as notify-only.
   c. **Fix** in its own worktree, never in the shared checkout:
      `git worktree add ../pulse--server.wt/monitor-fix-<slug> -b fix/monitor-<slug> development`.
      Make the minimal fix. Run `npm test` and `npm run typecheck` — do not proceed if either
      fails; fall back to notify-only instead. Commit per this repo's `GIT_RULES.md`.
   d. **Full review before merge.** Invoke the local `code-review` skill (via the Skill tool)
      on the branch's diff — the one that runs code-reviewer, architecture-auditor,
      duplication-eliminator and security-scanner in parallel, then style-enforcer, i.e.
      `/commit`'s review without the typecheck/lint/commit steps. NOT the cloud multi-agent
      `/code-review ultra` (`/ultrareview`): never pass `ultra`, it is user-triggered and billed. Any HIGH/CRITICAL
      finding, or an ESCALATE line → the fix is not merged; notify-only with the review
      findings, and leave the branch unmerged for manual review instead of deleting it. Only
      a clean review (or one whose own auto-fixes were applied and tests/typecheck still pass)
      counts as a fix ready to merge. This is the actual gate against shipping unsafe
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
8. **Ship, only if at least one fix passed (d).** In the shared checkout (`$MAIN`): first run
   `ListAgents` and `git status`. If another session is active there or the tree is dirty, don't
   merge: leave the fix branches and records unmerged, and say "merge blocked: checkout busy" in
   the notification. Otherwise, on `development`: `git merge --no-ff` each passing fix branch,
   then `git merge --no-ff monitor/records -m "Merge branch 'monitor/records' into
   development"`, then push `development`. Remove each merged fix worktree and delete its branch.
   The next run's step 1 fast-forwards `monitor/records` (it is then 0 commits ahead).
   If no fix passed, nothing is merged or pushed; the records wait on the branch for the next
   fix.
9. **Notify** with a summary of the run: N Known Fixes rows bumped, N new 404-pattern hits, N
   new errors (M merged, K notify-only, J blocked by review or busy checkout), commit links, and
   the new records (quote them, since unshipped records aren't on origin yet).

## Guardrails

- Never touch `main`, never force-push.
- Never commit records on `development` directly, never push `monitor/records` on its own, and
  keep it at most one commit ahead of `development` (amend, don't add).
- Never invent a fix for an error whose cause isn't clearly localized (see confidence
  gate) — a wrong guess in prod is worse than a delayed manual fix.
- Never merge a fix that hasn't cleanly passed the full `/code-review` (step 5d) — that
  review is the actual safety gate on unsupervised code reaching `development`, since
  this routine may run on a smaller/cheaper model whose own judgment of "safe to merge"
  isn't trusted alone.
- Never switch branches, stash or reset in the shared checkout.
- If the checkpoint comment in `$WT/docs/prod-errors/index.md` is missing/corrupted, stop and
  notify instead of guessing a timestamp.
- If no running instance tagged `Name=pulse-server` is found, or AWS credentials aren't
  available in this environment, notify and stop rather than failing silently.
