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

## Steps

1. `cd` into `pulse--server` repo root (this file's `../../`).
2. Get the checkpoint: `tsx scripts/monitor/checkpoint.ts get`.
3. Pull new logs since checkpoint:
   `bash scripts/monitor/pull-prod-logs.sh "$CHECKPOINT"` — resolves the current EC2
   instance live by tag (`Name=pulse-server`) itself; never pass/hardcode an instance id
   (the server sits behind an ASG, the instance can be replaced at any time).
4. Pipe the output through the processor:
   `tsx scripts/monitor/processLogs.ts < logs.jsonl` — this updates
   `docs/PROD-ERRORS.md`'s `## 404 Patterns` and bumps matching `## Known Fixes`
   entries automatically, and prints a JSON array of unmatched new errors to stdout.
5. If the array is empty, update the checkpoint to now
   (`tsx scripts/monitor/checkpoint.ts set <now-ISO8601>`) and stop — nothing else to do.
6. For each new error in the array:
   a. **Diagnose.** Read the relevant source around the error (`stack` gives the file).
      Form a root-cause hypothesis and a minimal fix.
   b. **Confidence gate.** Only proceed to (c) if BOTH hold: the stack trace points to a
      specific line/function in this repo (not a third-party/node_modules frame as the
      sole location), AND the fix is a small, localized change (no schema/migration,
      no cross-cutting refactor, no ambiguity about which of >1 plausible causes is
      correct). If either fails: skip to (d) with `prLink: null`.
   c. **Fix.** Branch off `development` as `fix/monitor-<short-slug>`. Make the minimal
      fix. Run `npm test` and `npm run typecheck` — do not proceed if either fails; fall
      back to notify-only instead. Commit per this repo's `GIT_RULES.md`.
   c2. **Full review before merge.** Invoke the `/code-review` skill on the branch's diff
      (code-reviewer, architecture-auditor, duplication-eliminator, security-scanner, then
      style-enforcer — same as it runs for a human-authored change). Any HIGH/CRITICAL
      finding, or an ESCALATE line → do NOT merge; fall back to notify-only with the
      review findings included, and leave the branch unmerged for manual review instead
      of deleting it. Only a clean review (or one where the review's own auto-fixes were
      applied and tests/typecheck still pass) proceeds to merge. This is the actual gate
      against shipping unsafe autonomous code — the confidence gate in (b) only decides
      whether to *attempt* a fix, not whether it's safe to land.
   d. **Merge.** Merge directly into `development` (`git merge --no-ff`, no PR — matches
      the repo's feature→development rule; PR only exists for `development`→`main`, and
      this routine never touches `main`), delete the branch after merge, push
      `development`.
   e. **Record.** Append a new `## Known Fixes` entry to `docs/PROD-ERRORS.md` with the
      error's normalized signature (see `normalizeSignature` in
      `scripts/monitor/processLogs.ts`), first/last seen = today, occurrences = 1, the
      root cause, and one of: the fix + commit link, `Fix: not auto-applied — notify only
      (see confidence gate)`, or `Fix: blocked by review — branch <name> left unmerged,
      see review findings` (when (c2) failed).
7. Commit the `docs/PROD-ERRORS.md` update as its own small `docs` commit on `development`
   directly (not through a PR — matches the existing records-commit exception in
   `CLAUDE.md`), separate from any fix-branch commits.
8. Update the checkpoint to now.
9. Send a Claude Code notification summarizing the run: N known-fix matches bumped,
   N new 404-pattern hits, N new errors found (M merged, K notify-only, J blocked by
   review), with commit links and the updated `docs/PROD-ERRORS.md` entries.

## Guardrails

- Never touch `main`, never force-push.
- Never invent a fix for an error whose cause isn't clearly localized (see confidence
  gate) — a wrong guess in prod is worse than a delayed manual fix.
- Never merge a fix that hasn't cleanly passed the full `/code-review` (step 6c2) — that
  review is the actual safety gate on unsupervised code reaching `development`, since
  this routine may run on a smaller/cheaper model whose own judgment of "safe to merge"
  isn't trusted alone.
- If `docs/PROD-ERRORS.md`'s checkpoint comment is missing/corrupted, stop and notify
  instead of guessing a timestamp.
- If no running instance tagged `Name=pulse-server` is found, or AWS credentials aren't
  available in this environment, notify and stop rather than failing silently.
