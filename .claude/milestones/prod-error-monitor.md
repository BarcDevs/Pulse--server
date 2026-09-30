# Milestones: prod-error-monitor

<!-- baseline: b93f02aa71ef075c5ecbe3821791cf00d42d5262 -->

- [ ] M1 — Scaffold `docs/PROD-ERRORS.md`: sections for Known Fixes, 404 Patterns, checkpoint state (empty, structured).
- [ ] M2 — SSM log-pull script (`scripts/monitor/pull-prod-logs.sh`), reusing `ec2-redeploy.sh`'s SSM access pattern, outputs lines since a given checkpoint timestamp.
- [ ] M3 — Log classifier: split pulled lines into generic-404 bucket vs. real-error bucket; normalize real-error signatures (type + message shape, no stack/timestamp).
- [ ] M4 — 404 aggregation: tally by route, write/update counts into `## 404 Patterns` in `docs/PROD-ERRORS.md`.
- [ ] M5 — Known-fix matcher: compare real-error signatures against `## Known Fixes` entries; on match, bump occurrence count + last-seen date.
- [ ] M6 — New-error routine logic (prompt, not deterministic code): on no match — diagnose, branch off `development` (`fix/monitor-<slug>`), write fix, merge directly into `development` (no PR — matches repo's feature→development rule; only `development`→`main` PRs), append new `Known Fixes` entry, send Claude Code notification.
- [ ] M7 — Checkpoint persistence: read/write last-processed log timestamp so reruns don't reprocess old lines.
- [ ] M8 — Confidence gate: low-confidence diagnosis → notify only, skip branch/merge/doc-entry.
- [ ] M9 — Register as a **local** Windows Scheduled Task (`scripts/monitor/register-task.ps1`, every 5h) running `claude -p` — not a cloud routine, so AWS creds stay local instead of shared across a cloud environment's sessions.
- [ ] M10 — Dry run against real prod logs + docs sync (mention in `docs/DEPLOYMENT.md`, remove/close the TODO.md item once verified working).

## Log

_(append a dated line per completed step)_

- 2026-09-30: found the watcher blind since it started. It read `logs/error.log`, which the file transport pretty-prints as multi-line objects, so `filterSince.ts` parsed nothing and every run reported no errors. Now reads `docker logs --since` (JSON per line) and fails loudly on SSM timeouts or the output cap. M10 (dry run against real prod logs) is still open and would have caught this.
- 2026-09-30: records moved from `docs/PROD-ERRORS.md` to `docs/prod-errors/` (index + one file per error) and onto the local `monitor/records` branch, one amended commit that ships only with a fix. Checkpoint reset to 1970 so the first working run rescans the current container.
