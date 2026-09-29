# TODO

## LAUNCH BLOCKERS (security audit 28/09/2026)

Details, file:line refs and decisions per id in `docs/SECURITY-AUDIT.md`.

- **Verify prod email works.** `ec2-redeploy.sh` never passes `EMAIL_*`, and
  `config/production.ts` sets port 587 + `secure: true` — reset/change-email mail may be
  broken. Check first: H1's recovery path depends on password reset.
- **M4 — Per-user check-in mutation limit (5/day)** keyed by `req.userId`; `AbortSignal.timeout`
  on AI provider fetches.
- **L1 — `forgot-password` → `POST` with body** (server + client).

## LOW PRIORITY (non-blocking)

- **Monitor agent for production errors.**
  Catch unexpected prod errors, create PR + notify dev, record in a doc, and check if
  recurring — if so, reuse the recorded fix instead of inventing a new one.
