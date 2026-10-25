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

---

## 02/10/2026 — Account deletion keeps replies as `deleted-user`; posts still go

**Problem:** the 30-day purge hard-deletes the user, and `Reply.authorId` cascades from the profile, so every reply the user ever wrote on other people's threads vanished, leaving gaps in conversations.

**Decision (owner):** when an account is purged, its posts are still deleted (with their replies, as before), but its replies on other users' posts stay, attributed to `deleted-user`. Likes the user gave are removed as before.

**Implementation choice:** `Reply.authorId` becomes nullable with `ON DELETE SET NULL`, and a reply with no author is returned with a placeholder author whose username is `deleted-user`. Chosen over a sentinel "deleted-user" account (a fake login-able user that shows up in search, stats and the active-user filters). Reply queries must treat a null author as visible, since the "active author" filter would otherwise hide exactly these replies. During the 30-day countdown the user's replies stay hidden, as today; they reappear as `deleted-user` only after the purge.

**How to apply:** any new reply query filters on the reply-aware active-author condition, never on `activeAuthorWhere` alone. Reply text is kept verbatim, so it can still contain what the user wrote about themselves.


---

## 21/10/2026 — Support tickets are stored: retention, purged accounts, and a service key for the Claude reader

**Problem:** `POST /support/contact` only emailed support and stored nothing, so a future admin app had no data and a failed email lost the message. Tickets hold personal data (sender email, free text), so how long they live and who reads them needed an answer (issue #66).

**Decision (owner):** (1) **Reader credential:** the Claude reader uses a service key (`SUPPORT_READER_SECRET`, a Bearer secret like `LAUNCH_FUNNEL_SECRET`), not an admin session. It is accepted on `GET /support/claude/tickets` only, has its own 30 per 15 min limiter and returns a masked sender email, a short excerpt and no user id. (2) **Retention:** `CLOSED` tickets are deleted 6 months after `closedAt`; tickets never closed are deleted 24 months after `createdAt`. (3) **Purged accounts:** the ticket is kept when its account is purged (`userId` becomes null, the email stays) until it is `CLOSED`; at retention time the email and user link are blanked.

**Implementation choice:** the retention job deletes the whole row (and its replies) instead of nulling `senderEmail` and `userId` on a row that is kept. Deletion removes both fields at the same moment the decision wanted them blanked, and a ticket whose only purpose was that contact has no value left. `userId` is `ON DELETE SET NULL`, so the account purge needs no code. A never-closed ticket is identified by `closedAt` null, not by status. No route closes a ticket yet (the admin app will set `CLOSED` and `closedAt`), so until then only the 24-month cap runs.

**Why over alternatives:** an admin session for the reader would hand an automation account a full admin login and the full emails and messages. A single shared retention period would either keep closed tickets too long or drop open ones a user is still waiting on.

**How to apply:** never log a ticket email or message, only its id. Any new ticket read for automation maps through the allow-list in `src/lib/supportTicketReader.ts`. A new route that should accept `SUPPORT_READER_SECRET` needs the owner's say-so: the credential is deliberately accepted nowhere else.

---

## 25/10/2026 — Support reader limiter: failed attempts and valid reads get separate buckets

**Problem:** the reader limiter ran before `supportReaderAuth` and was keyed by IP, so junk requests from the reader's IP burned its 30-read budget and the real reader got 429s (issue #76).

**Decision:** two limiters. `supportReaderFailedAuthLimiter` runs first, per IP, counts only failed requests (`skipSuccessfulRequests`), 10 per 15 min (100 in dev). Then `supportReaderAuth`, then `supportReaderRateLimiter`: one shared key for the single reader credential, 30 valid reads per 15 min (100 in dev). The service key decision of 21/10/2026 is unchanged.

**Why over alternatives:** a single limiter after auth would let an attacker guess the secret without any throttle. A single limiter before auth keyed by IP is the bug. Keying the valid-read bucket by IP adds nothing, since only one credential holder can reach it.

**How to apply:** keep the order failed-auth, auth, reader limiter. Limiters are per process, so each instance keeps its own counts. A cap this low locks a misconfigured reader out for 15 minutes.
