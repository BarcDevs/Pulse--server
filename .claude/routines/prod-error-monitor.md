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
every run**. That commit reaches `development` (and origin) only in a run that merges a fix, so
quiet runs leave no commits, no pushes and no dirty tree anywhere.

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
   **Re-open check.** The processor bumps a known row without looking at what its record says.
   After it runs, read `$WT/docs/prod-errors/index.md`: every row whose Last seen is today is
   "bumped". Open its `<slug>.md` and branch on its **Fix**:
   - a **merged fix** (commit link) → don't reinvent it. If the newest occurrence in this run's
     logs is later than that fix's commit (`git -C "$MAIN" log -1 --format=%cI <sha>`), the fix did
     not hold, or is not deployed yet (check the deploy state before concluding): flag it
     explicitly and add it to the list below to re-diagnose;
   - **anything else** (`notify only`, `blocked by review`, an unverified hypothesis) → the
     error is still OPEN. A record is not a resolution: do NOT carry the old verdict forward. Add
     it to the list below and redo 5a and 5b from scratch, treating the recurrence (higher
     `count`, new route, new status) as new evidence.
   Step 5 runs on the unknown errors from the processor plus every re-opened row.
5. **First notification, before diagnosing anything** (only if step 5 has at least one error to
   work on: unknown or re-opened): send a Claude Code notification that errors were found: how
   many, and for each its signature, `count` and route. Then, for each:
   a. **Diagnose — investigation is mandatory, and happens BEFORE the confidence gate.** You may
      not reach (b) until all of these are done and written down for the record:
      1. Read the raw log lines for the signature in the temp file, not just the processor's
         summary: stack, route, method, status, request id, timestamps, and the `count` trend
         against the record. Pull neighbouring lines for the same request id if present.
      2. Find the first-party code involved. If the stack is all third-party frames
         (`node_modules`), that is the START of the investigation, not the end of it: Grep
         `$MAIN/src` for the library API named in the frames, and open the route handler,
         controller and service behind the logged route and method. Read what you find.
      3. Verify any claim about the environment before relying on it (config, schema, env vars,
         deploy state): read the file, or use read-only AWS/SSM checks. Never change
         infrastructure.
      4. State the root cause only if the evidence supports it, citing `file:line` and what you
         saw. If it is a guess, label it `Hypothesis (unverified)`; never write a guess under
         "Root cause".
      5. List the realistic options (e.g. fix in app code, change config, leave alone, filter the
         log) with the trade-off of each, and pick a recommendation.
   b. **Confidence gate.** Evaluated only on the evidence from (a). Only proceed to (c) if BOTH
      hold: the root cause is traced to first-party code you read (the stack frame itself, OR the
      first-party code that triggers the library path, found in (a)2), AND the fix is a small,
      localized change (no schema/migration, no cross-cutting refactor, no ambiguity about which
      of >1 plausible causes is correct). "Every stack frame is third-party" alone is NOT a
      reason to fail the gate: it is only valid together with the result of the (a)2 search
      ("looked in X, Y; first-party code Z triggers it but cannot be changed safely because …").
      If the gate fails: skip to (e) as notify-only, and the record must say which criterion
      failed and what you checked.
   c. **Fix** in its own worktree, never in the shared checkout:
      `git -C "$MAIN" worktree add "$MAIN/../pulse--server.wt/monitor-fix-<slug>" -b fix/monitor-<slug> development`,
      then `cd` into that worktree for everything below (tests, review and commit act on the
      current directory). Make the minimal fix. Run `npm test` and `npm run typecheck` — do not
      proceed if either fails; fall back to notify-only instead. Commit per this repo's
      `GIT_RULES.md`.
   d. **Full review before merge.** From inside the fix worktree, invoke the local `code-review`
      skill (via the Skill tool) on the branch's diff — the one that runs code-reviewer, architecture-auditor,
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
      file) and write `docs/prod-errors/<slug>.md` from the template in the index, with one of:
      the fix + commit link, `not auto-applied, notify only (see confidence gate)`, or `blocked
      by review, branch <name> left unmerged`. Every record needs an **Investigated** section
      (what you pulled and read in (a): log lines, files/lines opened, greps and read-only checks
      run), a **Root cause** (evidence-backed with `file:line`, or `Hypothesis (unverified)`),
      and **Options** with a recommendation. A record without an Investigated section means (a)
      was skipped: go back and do it. For a re-opened row, append a dated "recurrence" note with
      what you re-checked, not just the bumped count.
6. **Set the checkpoint:** `npx tsx "$WT/scripts/monitor/checkpoint.ts" set "$NEXT_CHECKPOINT"`.
7. **Amend the records commit** in `$WT` (`git -C "$WT" add docs/prod-errors`):
   no records commit yet (`N=0` after step 1) → `git commit -m "docs(prod-errors): monitor
   records"`; otherwise `git commit --amend --no-edit`. Never a second commit.
8. **Ship, only if at least one fix passed (d).** Merge into `development`, push it, then open the release PR; never
   merge that PR. In the shared checkout (`$MAIN`): first run `ListAgents` and `git status`. If
   another session is active there or the tree is dirty, don't merge: leave the fix branches and
   records unmerged, say "merge blocked: checkout busy" in the notification, and open no PR.
   Otherwise, on `development` (all via `git -C "$MAIN"`): first `pull --ff-only origin
   development` (GIT_RULES.md: always pull before pushing; if it can't fast-forward, merge nothing
   and notify), then `merge --no-ff` each passing fix branch,
   then `merge --no-ff monitor/records -m "Merge branch 'monitor/records' into development"`, then
   `git push origin development`. Remove each merged fix worktree (`git -C "$MAIN" worktree
   remove`) and delete its branch. The next run fast-forwards `monitor/records` (it is then 0
   commits ahead). Then open the PR that carries it to `main` (flow: local -> development -> main):
   if `gh pr list --base main --head development --state open` shows one, add a comment to it
   listing the new fixes; otherwise `gh pr create --base main --head development` with a title in
   the repo's commit convention and a body listing each fix (issue link, evidence-backed root cause
   with `file:line`, what changed, typecheck/test results, `/code-review` result) plus the line
   "This PR carries everything on `development` not yet on `main`." NEVER merge a PR, enable
   auto-merge, or push `main`. If the push or `gh` fails, notify with the error (the fixes stay
   merged on `development`). If no fix passed, nothing is merged, pushed or opened; the records
   wait on the branch for the next fix.
9. **Final notification** (the second of the run) with a summary: N Known Fixes rows bumped, N new 404-pattern hits, N
   new errors (M merged to `development`, K notify-only, J blocked by review or busy checkout), the
   `development` -> `main` PR link, commit links, and the new records (quote them). For each
   notify-only error include the recommendation from (a)5, and flag any error that has now been
   notify-only for 2+ runs as "needs a human decision", with its `count` trend.

## Guardrails

- Never push `main`, never force-push, never merge a PR, never enable auto-merge. The only branch
  this routine pushes is `development` (step 8), and the only PR it opens is `development` -> `main`.
- Never commit records on `development` directly (they arrive via the `monitor/records` merge),
  never push `monitor/records` on its own, and keep it at most one commit ahead of `development`
  (amend, don't add).
- Never invent a fix for an error whose cause isn't clearly localized (see confidence
  gate) — a wrong guess in prod is worse than a delayed manual fix.
- Recording is not handling. Every error must end a run as a merged fix, blocked-by-review, or a
  notify-only backed by an actual investigation (5a). Never stop at the processor's summary and
  never write a guess as a root cause. Never carry a previous run's notify-only verdict forward
  without re-checking it (step 4, Re-open check).
- Never merge a fix that hasn't cleanly passed the full `/code-review` (step 5d) — that review is
  the actual safety gate on unsupervised code reaching `development`, since this routine may run on
  a smaller/cheaper model whose own judgment of "safe to merge" isn't trusted alone.
- Never switch branches, stash or reset in the shared checkout.
- If the checkpoint comment in `$WT/docs/prod-errors/index.md` is missing/corrupted, stop and
  notify instead of guessing a timestamp.
- If no running instance tagged `Name=pulse-server` is found, or AWS credentials aren't
  available in this environment, notify and stop rather than failing silently.
