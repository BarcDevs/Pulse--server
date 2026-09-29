<!-- checkpoint: 1970-01-01T00:00:00.000Z -->

# Production Errors

Maintained by the prod error monitor routine (see `docs/plans/2026-09-28-prod-error-monitor-design.md`
and `.claude/routines/prod-error-monitor.md`). Manual edits are fine but the `checkpoint`
comment at the top is machine-managed — don't hand-edit it.

## Known Fixes

Recorded signatures for errors already diagnosed and fixed. When the monitor sees a
matching signature again, it bumps the entry instead of re-diagnosing/re-PRing.

_(none recorded yet)_

<!--
Entry template:

### <ERROR_TYPE>: <short description>
- **Signature:** `<normalized type + message shape used for matching>`
- **First seen:** YYYY-MM-DD
- **Last seen:** YYYY-MM-DD
- **Occurrences:** N
- **Root cause:** ...
- **Fix:** ... (PR: <link>)
-->

## 404 Patterns

Route-not-found hits, aggregated by route. Not bugs — tracked to spot routes users keep
hitting (possible missing feature, client routing bug, or stale link), reviewed
manually, never auto-fixed.

_(none recorded yet)_

<!--
Entry template:

- `<method> <route>` — N hits, first seen YYYY-MM-DD, last seen YYYY-MM-DD
-->
