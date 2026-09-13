# GCP Project Consolidation — Migration Guide

Three separate GCP projects are currently in use under this Google account, all
informally called "Pulse." GCP has no merge feature — projects can't be combined.
This is a manual migration: recreate credentials in the target project, repoint
app config, then decommission the old projects.

## Current state (audited 2026-09-07)

| Project | Project ID | Project # | Billing | What's actually on it |
|---|---|---|---|---|
| **Pulse** (target) | `gen-lang-client-0497058436` | 583038005639 | ✅ Linked | Gemini API key `default` (service account `ais-gemini-key-262b8d…`) → `GOOGLE_AI_API_KEY`. Also a second key `eval` (service account `ais-gemini-key-30dd…`), used by `scripts/eval-ai-models/`. |
| **Pulse** (OAuth) | `healease` | 930116230640 | ❌ None | OAuth 2.0 Web client **"Pulse web client"** → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI`. Two secrets currently enabled (old one from 11 Mar 2026, a new one just rotated 7 Sep 2026 — confirm which one prod is actually using before deleting the old one). Also has BigQuery/Cloud SQL/Storage/etc. APIs enabled but these look like GCP defaults, not actually provisioned resources (no billing account, so nothing chargeable could be running here anyway). |
| pulse-dev | `gen-lang-client-0064017105` | 378202638901 | ❌ None | Gemini API key `free-tier` (service account `ais-gemini-key-59b76a0b…`) → `GOOGLE_FREE_AI_API_KEY`. Live traffic observed (~0.013 req/s). |

Mapping confirmed against `config/custom-environment-variables.ts` (lines 18-33) and
`docs/DEPLOYMENT.md` — all four keys are read from AWS Secrets Manager
(`pulse/app/GOOGLE_AI_API_KEY`, `pulse/app/GOOGLE_FREE_AI_API_KEY`,
`pulse/app/GOOGLE_CLIENT_ID`, `pulse/app/GOOGLE_CLIENT_SECRET`), with
`GOOGLE_REDIRECT_URI` passed as a plain env var in `ec2-redeploy.sh`.

No Compute Engine, Cloud Run, Cloud SQL, or Storage resources are actually
provisioned on any of the three projects — this is credentials-only. That makes
the migration much smaller than a typical project merge.

## Target

Consolidate everything into **`gen-lang-client-0497058436`** (583038005639) — it's
the one with billing already linked.

## Migration steps

### 1. Recreate the OAuth client in the target project
GCP OAuth clients can't be moved between projects — must be recreated.

1. In `gen-lang-client-0497058436` → **APIs & Services → OAuth consent screen**:
   configure it (app name, support email, scopes) — this project doesn't have one yet.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID** → Web application.
3. Copy in the same Authorized JavaScript origins from `healease`'s client:
   - `https://healease-server.onrender.com`
   - `https://pulse-server-staging-thrx.onrender.com`
   - `https://pulse-git-development-bar-cohens-projects.vercel.app`
   - `https://pulse-rehab.vercel.app`
   - `https://pulse-owgg.onrender.com`
4. Copy in the same Authorized redirect URIs (9 total, includes localhost:4000/4001
   dev callbacks, Render/Vercel `/api/v1/auth/google/callback` and `/api/v2/auth/google/callback`).
5. Save → note the **new** Client ID and generate a new Client Secret.

### 2. Update secrets
- AWS Secrets Manager: update `pulse/app/GOOGLE_CLIENT_ID` and
  `pulse/app/GOOGLE_CLIENT_SECRET` with the new values (see `docs/DEPLOYMENT.md`
  for the secrets layout and redeploy process).
- Render (staging) and any other env consuming these: update the same two vars.
- `GOOGLE_REDIRECT_URI` is unaffected — it's just a URL string, not tied to a project.

### 3. Consolidate the Gemini keys (optional but recommended)
`gen-lang-client-0497058436` already has its own `default` and `eval` Gemini keys.
Decide whether `pulse-dev`'s `free-tier` key is still needed as a distinct
lower-quota key, or whether `GOOGLE_FREE_AI_API_KEY` can just point at the same
`default` key already in the target project:
- If keeping a separate free-tier key: create a new API key in
  `gen-lang-client-0497058436` restricted to Gemini API, update
  `pulse/app/GOOGLE_FREE_AI_API_KEY` in Secrets Manager.
- If not: point `GOOGLE_FREE_AI_API_KEY` at the same value as `GOOGLE_AI_API_KEY`
  and drop the separate key entirely.

### 4. Cut over and verify
- Deploy with new secrets (staging first).
- Test Google Sign-In end-to-end (new OAuth client) on staging before prod.
- Test both AI insight paths (regular + free-tier) hit Gemini successfully.
- Watch `pulse/app/GOOGLE_CLIENT_ID`'s old client in `healease` for a few days —
  check **Last used date** on the old OAuth client to confirm traffic has moved off it.

### 5. Decommission old projects
Only after step 4 is verified stable for a few days:
- Delete/disable the OAuth client in `healease` (or just shut down the project).
- Delete the `free-tier` key + service account in `gen-lang-client-0064017105`.
- Shut down both projects: **IAM & Admin → Settings → Shut down project** for
  `healease` and `gen-lang-client-0064017105`. GCP holds shut-down projects for
  30 days before permanent deletion, so this step is reversible for a window.

## Not needed
- No Compute/Storage/Cloud Run/SQL migration — nothing is deployed on GCP itself,
  the app runs on AWS EC2/RDS (`docs/DEPLOYMENT.md`). GCP here is purely
  "Google as an OAuth + Gemini API provider."
- No DNS or App Engine considerations — not used.
