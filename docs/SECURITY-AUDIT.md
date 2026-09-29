# Security & Privacy Audit — 28/09/2026

Read-only audit of `pulse--server` (plus the security-relevant parts of `pulse--client` and the
deploy docs/scripts). Infra facts come from `docs/DEPLOYMENT.md` / `docs/ASG-MIGRATION.md` — live
AWS/Cloudflare config was **not** verified. Process used: `/security-audit` skill.

**Verdict:** needs security fixes before real users. Authorization of recovery data is solid (every
check-in/goal/milestone/insight query is scoped by the profile derived from the JWT — no IDOR found).
Risk sits in account identity, community privacy, transport, and session lifecycle.

Status legend: **OPEN** · **FIXED** · **DECIDED** (owner decision recorded, work pending) · **ACCEPTED** (risk accepted for now)

## Findings status

| ID | Sev | Finding | Status |
|---|---|---|---|
| H1 | High | No email verification + Google OAuth auto-links by email → pre-account takeover | DECIDED (see below) |
| H2 | High | `/auth/me` returned `emailChangeOTP` → email-change ownership bypass | FIXED (branch `security/audit-followup`) |
| H3 | High | `anonymousParticipation` (default true, UI: "Hide your identity") never enforced; public forum returns real first/last name + `user.id`; search by author name | FIXED 28/09 — `anonymizeAuthor` masks identity on every post/reply read path; name-based search removed |
| H4 | High | Cloudflare SSL mode **Flexible** → Cloudflare→origin is plaintext HTTP | FIXED 28/09 — Cloudflare Tunnel, client SG has no public 80/443 (`decisions/deployment-and-infra.md`) |
| H5 | High | Server SG port 80 "open" + public IP + `trust proxy 1` → direct API access, `X-Forwarded-For` spoofing bypasses login/OTP rate limits | FIXED — verified 28/09: server SG 80 allows only the client SG |
| M1 | Med | No session revocation: logout/password change/reset/deactivation leave the 7d JWT valid; token also returned in login body | FIXED 28/09 — per-request check of `active` + `passwordUpdatedAt` vs `iat`; JWT lifetime follows remember-me; token cookie-only. Logout stays device-local |
| M2 | Med | Account delete = deactivate only; health data kept forever; deactivated users' replies still public with name; re-signup → 500 | FIXED 29/09 — 30-day countdown + daily purge, login restores, replies hidden, email/username kept until purge |
| M3 | Med | Raw check-in notes (last 5) sent to AI providers, up to 3 via fallback chain; no opt-out | OPEN |
| M4 | Med | Every check-in create/PATCH triggers synchronous AI calls, no per-user limit, no fetch timeouts | DECIDED (see below) |
| M5 | Med | `req.ip` likely = Cloudflare edge IP behind CF→Next rewrite → shared rate-limit buckets, wrong geo timezone | OPEN (verify) |
| M6 | Med | Client sends no CSP / frame-ancestors / HSTS headers | OPEN |
| L1 | Low | `GET /auth/forgot-password/:email` → email in URL/logs/Sentry breadcrumbs | DECIDED (see below) |
| L2 | Low | Enumeration via signup / confirm-email / reset-password responses | OPEN |
| L3 | Low | `bcrypt.hashSync`/`compareSync` (cost 12) block the event loop | OPEN |
| L4 | Low | Session cookies `SameSite=None` in prod though prod is same-origin | OPEN |
| L5 | Low | Logout is `GET` without CSRF | OPEN |
| L6 | Low | App runs with RDS master credentials | OPEN |
| L7 | Low | Weak password rule (8 chars, letter+digit); stale error text claims upper/special | DECIDED (see below) |
| L8 | Low | Reply body has no max length | OPEN |
| L9 | Low | Arbitrary https `<img>` in posts / profile image → reader IP leak | OPEN |
| L10 | Low | Client localStorage drafts hold DOB/recovery type/care provider; community drafts not per-user; not cleared on logout | OPEN |
| L11 | Low | Client `getSafeRedirectUrl` accepts `/\evil.com` (possible open redirect) | OPEN |
| L12 | Low | `npm audit`: server `axios` (unused — remove), `nodemailer`, `sanitize-html`; client `quill`, `dompurify` | PARTIALLY FIXED 29/09 — server: removed unused `axios`, bumped `nodemailer` 8→10 (CRLF injection, TLS cert validation, file/URL-access bypass CVEs). `sanitize-html` left pinned at 2.17.4: 2.17.5+ pulls in an ESM-only `htmlparser2` that breaks Jest's CJS transform — needs a Jest ESM config change to take, deferred. Client `quill`/`dompurify` still open (client-side) |
| L13 | Low | Intervention logs pair `userId` with reason/severity/mode (health-derived) | ACCEPTED |
| L14 | Low | Prisma error messages (may include query args) go to server logs | OPEN |

Informational: prod CORS fallback origin `pulse-client.vercel.app`; swagger + `/dev` exposed on any non-`production` env (e.g. `APP_ENV=staging`); Google AI key in URL query; free Gemini tier in non-prod (keep real data out); unused Vercel Analytics on EC2; **prod email config (`EMAIL_*`) not passed by `ec2-redeploy.sh` and `production.ts` sets port 587 + `secure: true` — reset/change-email mail may be broken in prod**; dead code (`constants/cookies/authCookies.ts`, `PASSWORD_HASH_ROUNDS`, `OTP_CONFIG`, `authModel.deleteUser`, `googleOAuthService.generateState/validateState`); client `ignoreBuildErrors: true`.

Full evidence, file:line refs, positives and data-flow map: see the audit report in session
`https://claude.ai/code/session_01Df9dZW4kdBjucJjvRtbqaY`. Key refs are repeated per finding below
where work is pending.

---

## Owner responses & recommendations

### H1 — Email verification / Google hijack

**Owner position:** email ownership verification was skipped on purpose to avoid signup friction.
Scaling plan: block posting until verified.

**Recommendation:** keep frictionless signup — it's a fine trade-off — but the Google hijack is
independent of posting and must be closed now. The attack: attacker signs up with
`victim@gmail.com` + own password → victim later uses "Sign in with Google" →
`findOrCreateUser` (`src/services/googleOAuthService.ts:193-199`) links victim's Google identity
into the attacker's account → victim's check-ins become readable by the attacker.

Fix, zero friction for legit users:
1. Add `emailVerifiedAt DateTime?` to `User`.
2. Set it whenever inbox ownership is proven: Google login (`email_verified` is already required),
   successful password-reset OTP, successful email-change OTP, and (later) the signup OTP.
3. In `findOrCreateUser`, when the email matches an account with `emailVerifiedAt = null`:
   **Google wins** — link the Google ID, set `emailVerifiedAt`, replace the local password with a
   random hash, and invalidate existing sessions (needs M1's `tokenVersion`/`passwordUpdatedAt`
   check). The attacker's password stops working; a legit user who had a password just keeps using
   Google or does "forgot password".
   Alternative: refuse to auto-link and ask for the local password first — more friction, same safety.
**Decided (28/09):** the stricter variant — Google auto-links **only** into a local account whose
`emailVerifiedAt` is set. Unverified match → no link; tell the user an account exists and to sign in
with its password or reset it (the reset OTP sets `emailVerifiedAt`). Replaces step 3's "Google wins".

4. Later (scaling plan): gate posting/replying on `emailVerifiedAt`, and send the signup OTP
   (`sendConfirmEmailOTP` exists in `src/lib/authOTP.ts:138` but is never called).

### H2 — `/auth/me` leaked the email-change OTP — FIXED

Clarification: the `OTP` field in the `/auth/change-email` **response body** is dev-only
(`isDev ? otpCode : null`) — that part was fine. The leak was different: `sanitizeUserData` uses a
deny-list (`src/constants/excludedUserFields.ts`) that didn't include `emailChangeOTP`, so the
**DB column** came back from `GET /auth/me` in every environment.

Fix: added `pendingEmail`, `emailChangeOTP`, `emailChangeExpiration`, `googleId`, `active` to the
deny-list (client doesn't read any of them; `role` kept — client uses it) + unit test in
`src/__tests__/services/auth.service.test.ts`. Follow-up worth doing: switch to an allow-list
`select` so new columns are private by default; add an attempts counter to email-change confirm.

### M2 — Account deletion

**Decided (28/09):** single delete action with a **30-day countdown** to hard delete (log back in =
cancel); immediate deletion via support. Dialog copy must be updated — today it says "Your data is
kept and the account can be restored by contacting support". The options below were the input.

**Owner position:** the Q&A says "account is only deactivated, contact support to permanently delete".

**Recommendation:** the Q&A alone isn't enough — users read the dialog at the moment they click,
not the Q&A — and support-mediated deletion is manual work that doesn't scale. Preferred:

1. **Two explicit options in the delete flow:**
   - *Deactivate* — reversible, hides your content, data kept. (Current behavior.)
   - *Delete permanently* — deactivates immediately, sets `deletedAt`, and hard-deletes after a
     30-day grace period (cascades on `Profile` already remove check-ins, insights, goals, posts,
     replies, likes). Logging back in during the grace period cancels it.
2. Dialog copy states exactly what each option does and what is kept.
3. Needs a daily purge job (none exists yet — options: in-process daily timer on the single
   instance, or an EventBridge-scheduled SSM command).
4. Regardless of option: hide replies of deactivated authors (`getReplies` / `postInclude` replies
   don't filter `active`), make deactivation revoke sessions (M1), and handle re-signup with a
   deactivated email (currently P2002 → 500).

Minimum acceptable interim if the above waits: keep deactivate-only, but put the "contact support
to permanently delete" sentence **in the delete confirmation dialog itself**.

### M4 — AI cost amplification

**Owner position:** limit per user to 3-5 (normal use never exceeds 5).

**Recommendation:** a per-user limiter on `POST`/`PATCH /check-in` — `express-rate-limit` with
`keyGenerator: (req) => req.userId`, mounted after `isAuthenticated`, `limit: 5`, window 1 day.
In-memory store is fine on the single instance (resets on deploy — acceptable). Better UX
variant: never block the edit, just skip AI regeneration after the 5th mutation of the day and
keep the last insight. Also add `AbortSignal.timeout()` to the three provider `fetch` calls.

### L1 — forgot-password email in the URL

**Owner question:** time to adopt the HTTP `QUERY` method?

**Answer:** technically available — Node 24 lists `QUERY` in `http.METHODS`, Express 5 routes it,
axios accepts any method string — but **`QUERY` is the wrong fit here**. It's defined as *safe and
idempotent* (a read with a body). `forgot-password` generates an OTP, writes the DB and sends an
email — a side effect — so it must be `POST`. Also unverified: whether Cloudflare and the Next.js
rewrite proxy pass `QUERY` through. Do `POST /auth/forgot-password` with `{ email }` in the body
(client change too). `QUERY` is worth revisiting for read-only complex searches (e.g. forum search
with rich filters), after confirming proxy support.

### L7 — password policy

**Owner position:** the "uppercase and special characters" message is a leftover; add an uppercase
requirement and a sequence check — do it together with the client.

**Recommendation (to implement jointly, server + client in one change):**
- Rule: min 8, at least one lowercase, one uppercase, one digit; reject sequences/repeats
  (e.g. `1234`, `abcd`, `aaaa` — 4+ ascending/descending/repeated chars) and the user's own
  email local-part/username.
- Single source of truth for the rule + message on each side; fix the stale message in
  `src/schemas/auth/signupSchema.ts`.
- Apply to signup, reset-password and change-password only — **not** login (`loginSchema` currently
  runs `PASSWORD_FORMAT` on login; a stricter rule there would lock out existing users).

---

## Suggested order

1. **Now:** H1 (steps 1-3), H3, H4, H5.
2. **Before production users:** M1, M2, M3, M4, M5, M6, L1, L6, L12, prod email config check.
3. **Post-MVP:** remaining Lows, allow-list user `select`, retention policy for check-ins/insights.
