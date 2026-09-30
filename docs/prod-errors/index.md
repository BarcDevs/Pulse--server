<!-- checkpoint: 2026-09-30T21:06:40Z -->

# Production Errors

Maintained by the prod error monitor routine (`.claude/routines/prod-error-monitor.md`).
The `checkpoint` comment above is machine-managed; don't hand-edit it.

Shaped like `decisions/` and `corrections/`: this index holds one row per error signature and
one line per 404 route, so it stays short. Each error's diagnosis lives in its own
`<slug>.md` next to this file. Resolved errors that haven't recurred in a while move to
`archive/<slug>.md` (row removed here, file kept verbatim plus an "archived <date> — why" line).

The routine records on the local branch `monitor/records` (one commit on top of `development`,
amended every run). Records reach `development` only together with a merged fix.

## Known Fixes

Error signatures already diagnosed. When the monitor sees one again it bumps the row (and does
not re-diagnose). `|` inside a signature is written as `\|`.

| Signature | Occurrences | First seen | Last seen | Record |
|-----------|-------------|------------|-----------|--------|
| `Error: Unhandled error caught Unauthorized! please login first!` | 16 | 2026-09-30 | 2026-09-30 | [error-handler-log-level](error-handler-log-level.md) |
| `Error: Unhandled error caught Route not found! please check your inputs and try again!` | 1 | 2026-10-01 | 2026-10-01 | [custom-error-name](custom-error-name.md) |

<!--
Row template:
| `<normalized signature>` | N | YYYY-MM-DD | YYYY-MM-DD | [<slug>](<slug>.md) |

<slug>.md template:
# <ERROR_TYPE>: <short description>
- **Signature:** `<normalized signature>`
- **First seen:** YYYY-MM-DD
- **Root cause:** ...
- **Fix:** <what changed> (<commit link>) | not auto-applied, notify only (see confidence gate) |
  blocked by review, branch <name> left unmerged
-->

## 404 Patterns

Route-not-found hits, aggregated by route. Not bugs: tracked to spot routes users keep
hitting (possible missing feature, client routing bug, or stale link), reviewed
manually, never auto-fixed.

_(none recorded yet)_

<!--
Entry template:

- `<method> <route>` — N hits, first seen YYYY-MM-DD, last seen YYYY-MM-DD
-->
