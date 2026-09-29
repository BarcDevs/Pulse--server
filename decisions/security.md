# Decisions — Security & Privacy

⚠️ Load only when following a link from [[decisions/index]] for a specific entry, or scanning for
context in this topic — not routinely.

---

## 28/09/2026 — Security audit follow-up: owner positions on H1, M2, M4, L1, L7

Context: full read-only audit, findings + status tracked in `docs/SECURITY-AUDIT.md`.

- **H1 — no email verification at signup (deliberate).** Skipped to avoid signup friction; scaling
  plan is to block posting until verified. Still open: the Google-OAuth auto-link-by-email hijack
  (`googleOAuthService.findOrCreateUser`) is independent of posting. Recommended fix: `emailVerifiedAt`
  set on any proven inbox ownership (Google login, reset/change-email OTP), and when Google matches an
  unverified local account, Google wins — link, rotate the local password, revoke sessions.
- **H2 — fixed.** The change-email OTP in the response body was already dev-only; the real leak was
  the `emailChangeOTP` DB column returned by `/auth/me` in all envs. Added it (and `pendingEmail`,
  `emailChangeExpiration`, `googleId`, `active`) to `excludedUserFields`.
- **M2 — current policy is deactivate-only + "contact support to permanently delete" (stated in Q&A).**
  Recommended instead: two options in the delete dialog (deactivate / delete permanently with a
  30-day grace then hard delete via existing cascades); at minimum move the support sentence into the
  delete dialog. Owner to choose.
- **M4 — per-user limit on check-in mutations, 3-5 per user** (normal use never exceeds 5).
  Recommended: `express-rate-limit` keyed by `req.userId`, 5/day, or skip AI regeneration after the
  5th mutation instead of blocking.
- **L1 — `QUERY` HTTP method considered and rejected for forgot-password.** Node 24/Express 5/axios
  support it, but `QUERY` is safe/idempotent by definition and forgot-password has side effects
  (writes OTP, sends email) → use `POST` with body. Revisit `QUERY` for read-only complex searches
  after confirming Cloudflare + Next rewrite pass it through.
- **L7 — password policy to be strengthened jointly with the client:** add uppercase requirement and
  a sequence/repeat check; drop the stale "uppercase and special characters" message. Apply to
  signup/reset/change only, never login.

**How to apply:** check `docs/SECURITY-AUDIT.md` status table before starting any auth, forum-privacy,
account-lifecycle or AI-prompt work; update the row's status when a finding is fixed.

---

## 28/09/2026 — Account deletion: 30-day countdown, support for immediate delete; OAuth link rule

Supersedes the M2 bullet of the entry above ("owner to choose").

- **M2 — decided:** one delete action, no second button. Deleting deactivates immediately, sets
  `deletedAt`, and hard-deletes after **30 days** (existing `Profile` cascades) unless the user logs
  back in. Immediate deletion stays available by contacting support. Current dialog copy
  ("Your data is kept and the account can be restored by contacting support") must change to state
  the 30-day permanent deletion. Why: two buttons judged overkill; a countdown gives a real deletion
  path without support load, and keeps an undo window.
- **H1 — OAuth link rule:** Google may auto-link only into a local account whose email is already
  verified (`emailVerifiedAt` set). Unverified match → no link; user is told an account exists and
  to sign in with its password or reset it (reset OTP proves the inbox and sets `emailVerifiedAt`).
  Posting-gate on verification stays post-MVP.
- **L1:** `QUERY` method investigation added to `scaling-todo.md`.

---

## 29/09/2026 — Remaining audit findings: owner decisions for the overnight run

- **M3 (raw check-in notes sent to AI providers):** add an opt-out. Notes are still sent by default, but a privacy setting ("use my notes for insights") turns it off, and the privacy page says so. Chosen over dropping notes entirely (insights lose nuance) and over keeping the current behavior with only a policy mention.
- **L9 (external images leak viewer IPs):** allowlist image hosts. Only images from our own origin and a short allowlist render; any other image URL shows as a link. Chosen over stripping all external images, and over deferring until uploads/S3 exist.
- **M6 (client security headers):** enforce the basics now: HSTS, frame-ancestors/X-Frame-Options, nosniff, referrer-policy. The CSP ships as Report-Only and gets tightened after reviewing reports, so Google login, Sentry and fonts can't break silently in prod.
- **Unattended overnight authority:** commit each item after tests and a security scan, and merge it locally into `development`. No push, PR or deploy; the owner reviews everything in the morning. This is a one-time waiver of "ask before committing" for this run only.
- **Defaults the owner accepted without override:** L2 makes confirm-email and reset replies identical for known and unknown emails, while signup keeps "email in use". L7 requires an uppercase letter and rejects runs of 4+ sequential or repeated characters, on signup, reset and change but never login. L8 reuses the post-body cap for replies. L6 (least-privilege DB user) is prepared as a script the owner runs, because secrets and IAM writes need them.
