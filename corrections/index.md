# Corrections — index

**Why this file exists:** corrections and confirmed preferences given to Claude during sessions in
this repo — Claude's mistakes and the user's corrections to Claude's behavior/claims. Not
app-generated user feedback (see `pulse--resources/user-feedbacks/` for that, out of scope for
this log).

⚠️ **Load on demand.** This is a log of past mistakes, grouped by topic so a session only opens
the one file it actually needs, not every dated entry ever written. Full spec:
`~/Claude/work/projects/RULES.md`.

## Repo Conventions — [[corrections/repo-conventions]]
Standing rules about how to work in this repo — file cleanup, config vs. src/config, destructive Prisma commands.

| Date | Entry |
|---|---|
| 10/08/2026 | Delete temp/generated files immediately after they've served their purpose |
| 10/08/2026 | `config/` (env system) vs. `src/config/` (app-level constants) are different things |
| 10/08/2026 | Never run `prisma migrate reset` without explicit user confirmation |
| 18/09/2026 | Don't push a branch or open a PR after a fix unless explicitly asked |
| 26/09/2026 | Every separate piece of work gets its own branch - check `git branch --show-current` first, create one before the first commit |
| 28/09/2026 | Merge and close worktrees when done - `git cherry` to verify merged, then `worktree remove` + `branch -d` |
| 29/09/2026 | Worktrees only when another session is busy in the same repo; otherwise a branch in the main checkout |
| 29/09/2026 | Hand work to the active collaborator session, not one picked by name; a "queued" send is not a confirmed hand-off |
| 29/09/2026 | Verify who owns commits (Claude-Session trailer) before routing a report; if no owner is provable, apply the fallback and fix it |
| 29/09/2026 | Only `development` → `main` goes through a PR; feature branch → `development` is a direct merge, no PR |
| 30/09/2026 | A new migration isn't done until it's applied to the Neon dev DB (`prisma migrate deploy`, then `migrate status` clean) |
| 02/10/2026 | DB changes: check RDS constraints first (roles, deploy gate, instance size); Neon is only the local test bed |
| 02/10/2026 | "tell client" is a role, not a session: ask which session even if only one name matches (repeat of 29/09) |
| 09/10/2026 | Run the full gate (typecheck, lint, unit, integration after merges) before pushing, not just typecheck |
| 09/10/2026 | `git worktree remove` left the main checkout's `node_modules` empty - check for a junction first, verify `node_modules` after |

## Infra Facts — [[corrections/infra-facts]]
Stale/wrong claims about current infrastructure, corrected against what's actually running post-AWS-migration.

| Date | Entry |
|---|---|
| 10/08/2026 | CI/CD pushes images to ECR, not S3 |
| 10/08/2026 | Client is deployed on its own EC2+Docker instance, not S3+CloudFront |
| 10/08/2026 | Domain DNS is Cloudflare, not Route53 |
| 18/09/2026 | Local dev DB is Neon only; local app never runs against RDS (supersedes archived "DB is RDS, not Neon") |

## Code Quality — [[corrections/code-quality]]
Implementation habits corrected mid-session — reaching for an existing utility instead of reinventing it.

| Date | Entry |
|---|---|
| 10/08/2026 | Use existing time-constants (`*InMs`) instead of hardcoding ms math |
| 27/09/2026 | Used a Python heredoc to edit a doc file right after logging the same mistake in a sibling repo |

## Claims & Verification — [[corrections/claims-and-verification]]
A claim stated to the user (cost, status) without actually checking/verifying it first.

| Date | Entry |
|---|---|
| 02/09/2026 | Told the user AWS cost would be "nearly free" without checking combined infra cost across both EC2 instances |
| 07/09/2026 | Marked a bug "Fixed"/resolved before deploying or actually testing the fix |
| 18/09/2026 | Claimed a Firefox-only font fix "fixed" it despite having no way to test Firefox (Chrome-only browser automation) |
| 24/09/2026 | Told the user to restore a form field to its old value without asking what it represented (marketing spend was the mistake, not the fix) |
| 26/09/2026 | Called the VPC charge a "NAT Gateway" without checking usage types (it is public IPv4 addresses; no NAT exists) |
| 26/09/2026 | Planned an Elastic IP on the server without reading the topology (domain → client public IP; client → server private IP baked at build) |
| 29/09/2026 | Model Selection in CLAUDE.md said Haiku for sub-agents (stale); Sonnet default, Opus via /opusplan |
