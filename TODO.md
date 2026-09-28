# TODO

## LAUNCH BLOCKERS (security audit 28/09/2026)

Details, file:line refs and decisions per id in `docs/SECURITY-AUDIT.md`.

- **Verify prod email works.** `ec2-redeploy.sh` never passes `EMAIL_*`, and
  `config/production.ts` sets port 587 + `secure: true` — reset/change-email mail may be
  broken. Check first: H1's recovery path depends on password reset.
- **H1 — Google links only into verified local accounts.** Add `emailVerifiedAt`; set it on
  Google login and on reset/change-email OTP success; unverified match → no link, tell user to
  sign in with password or reset it.
- **H3 — Enforce `anonymousParticipation` server-side.** Pseudonym instead of name/image/`user.id`
  in every post/reply query; stop exposing `user.id` publicly; drop author-name search.
- **M4 — Per-user check-in mutation limit (5/day)** keyed by `req.userId`; `AbortSignal.timeout`
  on AI provider fetches.
- **L1 — `forgot-password` → `POST` with body** (server + client).
- **L12 — Remove unused `axios`; `npm audit fix`.**

## LOW PRIORITY (non-blocking)

- **Monitor agent for production errors.**
  Catch unexpected prod errors, create PR + notify dev, record in a doc, and check if
  recurring — if so, reuse the recorded fix instead of inventing a new one.
