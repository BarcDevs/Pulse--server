# Decisions — index

**Why this file exists:** architecture/technical decisions made during sessions in this repo, with
the reasoning behind them (problem, decision, why over alternatives, how to apply) — so a session
doesn't have to re-derive or re-litigate a choice that was already made deliberately.

⚠️ **Load on demand.** This is a log of past decisions, grouped by topic so a session only opens
the one file it actually needs, not every dated entry ever written. Full spec:
`~/Claude/work/projects/RULES.md`.

## Feature & Product Design — [[decisions/feature-design]]
Behavioral/algorithmic design choices inside app features — intervention logic, streak/stats definitions, AI-context construction.

| Date | Entry |
|---|---|
| 10/04/2026 | Reflective Feedback / Bad Day Support intervention system: known design tradeoffs |
| 13/04/2026 | Goals/Milestones stats endpoint: streak definition and schema |
| 10/08/2026 | Check-in gap detection for intervention feedback |

## AI Providers & RAG — [[decisions/ai-and-rag]]
Whether/where to use RAG or embeddings, AI provider fallback strategy, and the infra picked to support them (pgvector, embedding model).

| Date | Entry |
|---|---|
| 11/08/2026 | RAG: not needed app-wide, one legit fit identified for later |
| 12/08/2026 | No manual AI provider switch needed before Anthropic price change |
| 12/08/2026 | Post title/body length cap; pgvector confirmed viable; embedding model/vector DB picked for RAG plan |

## Deployment & Infra — [[decisions/deployment-and-infra]]
AWS EC2/RDS architecture, cost/capacity decisions, and infra-migration root-causing (Render → AWS).

| Date | Entry |
|---|---|
| 13/08/2026 | Single EC2 instance has no automated recovery (flagged as CRITICAL TODO), with 02/09/2026 capacity/rightsizing/IP-stability follow-up |
| 07/09/2026 | Root-caused Google OAuth login regression from AWS migration (fix implemented, not yet verified) |
| 13/09/2026 | Fixed EOL Docker base (bullseye→bookworm) + Node 20→24 bump; root-caused intermittent prod latency to a leftover, permission-denied ECS agent baked into the instance's AMI — disabled |
| 16/09/2026 | GCP project consolidation verified + completed — old `healease`/`gen-lang-client-0064017105` projects deleted |
| 26/09/2026 | Keep production on RDS, not Neon — private in-VPC DB; ~$15/mo saving not worth the architecture trade-off |
| 26/09/2026 | Cost impact of ASG + Elastic IP calculated: ~$0/mo change (EIP replaces the auto-assigned IPv4 already billed) |
| 26/09/2026 | Corrected topology (domain → client public IP → server private IP); revised IP-stability/ASG plan pending go-ahead |

## Security & Privacy — [[decisions/security]]
Owner positions and recommended approaches from security audits — auth/verification, account lifecycle, AI data, rate limits.

| Date | Entry |
|---|---|
| 28/09/2026 | Security audit follow-up: owner positions on H1 (no signup verification), M2 (deactivate-only), M4 (per-user limit), L1 (QUERY rejected), L7 (password policy) |
| 28/09/2026 | Account deletion = 30-day countdown + support for immediate; Google links only into verified local accounts |

## Dev Workflow & Git Hooks — [[decisions/dev-workflow]]
Repo tooling decisions — git hooks, husky wiring, commit conventions.

| Date | Entry |
|---|---|
| 07/09/2026 | Root cause of lost post-commit version-bump hook: `.husky` gitignored + husky never wired up |
