# Fixer profile: server

Read by `prod-error-fixer.md` when the task prompt says `profile: server`. Every value the routine
needs that differs per repo lives here; the routine itself names the variables.

| Variable | Value |
|----------|-------|
| `PROFILE` | `server` |
| `PREFIX` | `S` (phone pushes and the notified list name issues `S#<n>`) |
| `REPO` | `BarcDevs/Pulse--server` |
| `OWNER` | `BarcDevs` |
| `MAIN` | `C:/Users/66bar/Claude/work/projects/pulse/pulse--server` |
| `WT` | `C:/Users/66bar/Claude/work/projects/pulse/pulse--server.wt/monitor-records` |
| `WTDIR` | `C:/Users/66bar/Claude/work/projects/pulse/pulse--server.wt` (fix worktrees `monitor-fix-<slug>` go here) |
| `PLANS` | `C:/Users/66bar/Claude/work/projects/pulse/.watchers/plans/issue-<n>/` |
| `LOCK` | `C:/Users/66bar/Claude/work/projects/pulse/.watchers/records.lock` (2h staleness) |
| `RECORDS` | `docs/prod-errors` (inside `$WT`) |
| `WATCHER_LABELS` | `prod-error` (the AWS monitor's issues) |
| `OTHER_REPO` | `BarcDevs/Pulse--client`, task `pulse-client-error-fixer` |

**Rules to read before planning or fixing** (they do not auto-load here): `$MAIN/GIT_RULES.md`,
`$MAIN/CORE_RULES.md`, `$MAIN/CLAUDE.md`. Tell every subagent to follow them.

**Checks** (run in the fix worktree, all must pass): `npm test`, `npm run typecheck`,
`npm run lint:check`.

**Migrations:** allowed. A plan that has one names it in the impact line and the PR body, and
carries the `migration` flag.

**Ship rule (server only).** The plan's `flags` list decides how a verified fix ships:
- no flags, or only additive and backward-compatible changes: ships as soon as the gate passes;
- `client-breaking` (a changed endpoint, response shape or removed field) or `migration`: held
  for the owner's review, see "Held fixes" in the routine. It ships only after the owner adds
  `ship-ok`, in the first run that starts inside the quiet window.

**Quiet window:** 02:00 to 05:00 Asia/Jerusalem, checked once at the start of the run
(`TZ=Asia/Jerusalem date +%H%M`, from `0200` to `0459`).

**Docs sync:** new feature, endpoint or schema change: server PRD and README and the client README,
per `$MAIN/CLAUDE.md`. AI-eval sync per `$MAIN/CLAUDE.md`.

**Records:** the monitor's `docs/prod-errors/<record-slug>.md` where the issue has one (set Fix to
the commit link, add the `Verification:` line); issues without a record keep that line in the
issue comment and PR body only.

**Cross-repo:** a plan whose impact line says `Client impact: <summary>` files a linked client issue
at ship time (see "Cross-repo tasks").
