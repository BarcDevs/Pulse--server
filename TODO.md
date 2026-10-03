# TODO

## LAUNCH BLOCKERS (security audit 28/09/2026)

Details, file:line refs and decisions per id in `docs/SECURITY-AUDIT.md`.

All cleared 29/09/2026 (server `b308d17`, client `b62caa9` in production). Last item, prod
email, verified: startup log shows `Email transport ready (smtp.resend.com:465)` and a real
password reset (email -> code -> new password) worked end to end.

## FIRST ON SCALING

- **Re-check DB performance once there is real forum data.** The DB-perf release was verified
  on RDS on 03/10/2026 (all 7 migrations applied, `pg_trgm` and the new indexes present, the
  old ones gone, `Post.replyCount` drift 0, the per-session `statement_timeout` enforced). Prod
  held only 2 users and no posts, so speed was not measurable. Once there are posts: run
  `EXPLAIN ANALYZE` on forum search (expect the trigram indexes, not a seq scan), watch the logs
  for `Slow database query` warnings and any `57014` cancel, and if `Post.replyCount` is ever
  suspect, reconcile it with
  `UPDATE "Post" p SET "replyCount" = (SELECT count(*) FROM "Reply" r WHERE r."postId" = p.id) WHERE "replyCount" <> (SELECT count(*) FROM "Reply" r WHERE r."postId" = p.id);`
- **Clean up accounts verified through the H6 bug (security audit H6, fixed 30/09).**
  Until the fix, 5 wrong codes on `POST /auth/confirm-email` marked any email verified, and a
  verified email lets a Google sign-in link into that account. The confirm-email code was never
  actually sent, so no real user verified that way. Password reset and Google also set
  `emailVerifiedAt`, so the data alone can't separate them. Candidates:
  `SELECT id, email, "emailVerifiedAt" FROM "User" WHERE "emailVerifiedAt" IS NOT NULL AND "googleId" IS NULL;`
  Safe remedy: clear `emailVerifiedAt` on those rows. A real user only loses Google-linking
  until their next password reset.
- **Real email verification at signup (security audit H1 scaling plan).** Send the confirm-email
  code on signup (`sendConfirmEmailOTP` exists but is never called), add the client step, and
  block posting until the email is verified.

## LOW PRIORITY (non-blocking)

- **Monitor agent for production errors.**
  Catch unexpected prod errors, create PR + notify dev, record in a doc, and check if
  recurring — if so, reuse the recorded fix instead of inventing a new one.
