# Fixer profile: client

Read by `prod-error-fixer.md` when the task prompt says `profile: client`. The routine file and
this profile live in the server repo; the client repo is the one this profile works on.

| Variable | Value |
|----------|-------|
| `PROFILE` | `client` |
| `PREFIX` | `C` (phone pushes and the notified list name issues `C#<n>`) |
| `REPO` | `BarcDevs/Pulse--client` |
| `OWNER` | `BarcDevs` |
| `MAIN` | `C:/Users/66bar/Claude/work/projects/pulse/pulse--client` |
| `WT` | `C:/Users/66bar/Claude/work/projects/pulse/pulse--client.wt/monitor-records` |
| `WTDIR` | `C:/Users/66bar/Claude/work/projects/pulse/pulse--client.wt` |
| `PLANS` | `C:/Users/66bar/Claude/work/projects/pulse/.watchers/plans/client/issue-<n>/` |
| `LOCK` | `C:/Users/66bar/Claude/work/projects/pulse/.watchers/client.lock` (2h staleness) |
| `RECORDS` | `docs/sentry-errors` (inside `$WT`) |
| `WATCHER_LABELS` | `sentry-error`, `user-feedback` (the client watcher's issues) |
| `OTHER_REPO` | `BarcDevs/Pulse--server` (never edited from a client run) |

**Rules to read before planning or fixing:** `$MAIN/GIT_RULES.md`, `$MAIN/CORE_RULES.md`,
`$MAIN/WORKFLOW.md`, `$MAIN/CLAUDE.md`, and the `decisions/` and `corrections/` indexes in
`$MAIN`. UI work follows the repo's `match-design` skill where a design file exists, and reads the
Next.js docs in `node_modules` before writing Next.js code, as `$MAIN/CLAUDE.md` says. Tell every
subagent to follow them.

**Checks** (run in the fix worktree, all must pass): `npx vitest run` (the package's `test` script
is `vitest`, which watches and never exits, so never use it), `npm run typecheck`,
`npm run lint:check`. The routine never runs the Playwright e2e suites. A fix worktree needs its
own `node_modules`: link or install per `$MAIN/CLAUDE.md` before running checks.

**Migrations:** none (the client has no database). Skip every migration step.

**Ship rule:** none; a verified client fix ships as soon as the gate passes. The client deploy is
still gated by the owner's approval, as for the server.

**Records:** `docs/sentry-errors/<record-slug>.md` where the issue came from Sentry (set Fix to the
commit link, add the `Verification:` line). `user-feedback` issues have no record file; the
`Verification:` line goes in the issue comment and the PR body.

**Cross-repo:** a client issue filed from a server fix carries the label `cross-repo` and a
`Server issue:` link in its body. Read the full change summary the server run saved at
`.watchers/plans/client/issue-<n>/server-change.md` before planning. The client run never edits
server code; if the server side is wrong, comment on the server issue instead.

**The records branch is shared** with the client watcher (`sentry-error-monitor.md`): both take
`$LOCK` before any `$WT` write, as the routine's "Records worktree" section says.
