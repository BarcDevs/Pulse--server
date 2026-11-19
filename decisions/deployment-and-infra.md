# Decisions — Deployment & Infra

⚠️ Load only when following a link from [[decisions/index]] for a specific entry, or scanning for
context in this topic — not routinely.

---

## 13/08/2026 — Single EC2 instance has no automated recovery (flagged as CRITICAL TODO)

> **Status (updated 14/10/2026): IMPLEMENTED 26-27/09/2026.** The server now runs in ASG `pulse-server-asg` (min=max=1, one instance in `eu-central-1a`, EC2 health check, 300s grace) from launch template `pulse-server-lt`, with a fixed ENI (`172.31.16.100`) so the client's baked-in server IP survives replacement, and `deploy.yml` targets the `Name=pulse-server` tag instead of a fixed instance id. The old standalone instance `i-0df518d8572bfcfd6` is terminated. Steps, resource ids and the deploy incidents are in `docs/ASG-MIGRATION.md`. The entry below is the original problem/decision, kept for history: its "no ASG", "single fixed instance" and "deferred" wording describes the state *before* 26/09/2026, not today.

**Problem:** Surfaced during architecture-interview prep, not from a production incident. Production deploy targets one fixed EC2 instance (`i-0df518d8572bfcfd6`), addressed by instance ID via SSM Run Command in `ec2-redeploy.sh`. The blue/green swap logic protects against a *bad deploy*, but there's no protection if the EC2 instance itself dies (hardware fault, host maintenance, etc.) — no Auto Scaling Group, no automated replacement. Recovery today means someone notices and fixes it by hand.

**Decision:** Move to an Auto Scaling Group with `min=1/max=1/desired=1`. This is not deferred for cost reasons — an ASG at desired=1 costs exactly the same as the standalone EC2 instance today, AWS doesn't charge for the ASG control plane itself. It's deferred because the current deploy pipeline assumes a static instance ID and a static IP, both of which break under ASG-managed replacement.

**Why this approach over alternatives:** A full multi-instance + Application Load Balancer setup was considered and rejected as premature — it solves a scaling problem we don't have yet, on top of the recovery problem we do have. `min=1/max=1` gets automated recovery (the actual gap) without taking on load-balancing complexity that isn't needed at current traffic.

**How to apply:** When picked up — (1) update `ec2-redeploy.sh`/the GitHub Actions workflow to target the ASG rather than a fixed instance ID for SSM Run Command, (2) handle the IP change on instance replacement: either re-associate a fixed Elastic IP to the new instance on launch, or move to a health-check-based DNS update in Cloudflare. Tracked as CRITICAL in `TODO.md`.

**02/09/2026 follow-up — capacity, EC2 rightsizing, and IP-stability approach:**

**Problem:** August AWS invoice came in at $63.78 (unexpected to the user). Root cause traced via Cost Explorer, not guessed: two EC2 instances ran concurrently all month — `pulse-client-app` (t3.micro) and `pulse-server` (t3.small, `i-0df518d8572bfcfd6`) — for a combined ~1,262 running-hours against the account's shared 750hr/month free-tier pool, so ~512 hours billed at full rate ($23.02 of the $28.10 EC2 charge, confirmed by matching per-instance-type cost breakdown: $7.28 micro + $15.73 small). The account's `get-free-tier-usage` API showed no free-tier credit actually applied to EC2 or RDS at all this cycle (only AWS Glue), separate from the general "T3.small is Free-Plan-eligible" marketing claim on AWS's docs, which describes plan eligibility, not a guarantee of zero cost past the shared hour quota. Remaining EC2 cost is EBS volume storage, not compute hours. RDS ($19.94) and VPC ($7.74 — corrected 26/09/2026: entirely public IPv4 addresses, 2 in-use at $0.005/hr each, NOT a NAT Gateway; none exists; never free-tier eligible) are separately billed baseline costs, unrelated to CI/CD pipeline runs (those cost fractions of a cent — SSM calls + image pushes).

**Decision 1 — correct the `min=1/max=1` ASG sizing from the 13/08/2026 entry to `min=1/desired=1/max=2`.** `max=2` only provides headroom for a brief overlap during an unhealthy-instance replacement event — steady-state cost stays identical to today's single instance, it does not double the baseline bill. (Original entry is being kept as-is above for history; this note is the correction of record.)

**Decision 2 — downsized `pulse-server` from t3.small to t3.micro** (stop → modify-instance-attribute → start), since the instance currently carries no real traffic besides UptimeRobot's health check. Saves roughly half the instance's compute cost (~$15.73 → ~$7.28/mo at similar hours) and reduces the account's combined free-tier-hour pressure. Verified live afterward: `curl https://pulserehab.app/api/status` returned successfully post-restart. Tradeoff: t3.micro halves available RAM (2GB → 1GB) vs t3.small — acceptable pre-/early-launch, but Prisma connection pool memory should be watched via CloudWatch once real traffic starts, and resized back up if sustained memory pressure appears.

**Decision 3 — confirmed the resize surfaced the ASG IP-change risk is real, and settled the fix: Elastic IP over Route53, deferred until ASG exists.** The manual stop/start changed the instance's public IP (35.157.40.177 → 18.199.102.66) with no Elastic IP attached; the site stayed reachable because DNS is Cloudflare-proxied and the origin record already reflected the new IP by the time of the check — the exact mechanism for that (fast Cloudflare propagation vs. some existing update-on-boot step) was not identified, so it should not be assumed reliable for a future ASG replacement event, which is a more disruptive IP swap than a manual resize.

Evaluated three options for the underlying IP-stability problem:
- **Current state (dynamic IP, relying on Cloudflare to stay in sync):** $0 extra cost, but the actual sync mechanism is unconfirmed — real risk once ASG exists.
- **Elastic IP:** confirmed via AWS Pricing API at the flat post-Feb-2024 rate, $0.005/hr (~$3.60/mo) for any public IPv4, attached or idle — replacing the old "first EIP free" rule. Net cost of adding one is ~$0 (added 26/09/2026): it replaces the auto-assigned public IPv4 the instance already pays the same $0.005/hr for, so the bill only changes if an extra address is added. Solves the problem directly: same IP persists across instance replacement via an ASG lifecycle-hook re-association script, Cloudflare's origin record is set once and never needs to change again.
- **Route53:** confirmed via AWS Pricing API at $0.50/mo per hosted zone + $0.40/million queries (trivial at current traffic) — cheap in isolation, but redundant, since Cloudflare already provides the DNS/proxy layer Route53 would add. Route53 only earns its place if paired with health-check-triggered failover routing, which duplicates what an Elastic IP + lifecycle hook already solves more simply. Confirmed via `list-hosted-zones` (empty) and Cost Explorer ($0.00 for August) that Route53 isn't in use and cost nothing this cycle.

**Why this approach over alternatives:** Elastic IP is the direct fix (removes the need for anything to "stay in sync" at all) at negligible cost; Route53 was considered and rejected as redundant given Cloudflare is already the DNS layer in use.

**How to apply:** Add the Elastic IP only when the ASG work from the original 13/08/2026 entry is actually implemented — no cost or benefit to adding it while still on a single manually-managed instance. Tracked alongside the ASG item in `TODO.md`.

**Confirmed via Billing console (Free Tier page), not just the API:** only 3 service offerings show as free-tier-tracked on this account at all — KMS, Glue, SNS, all trivial and unrelated to compute. EC2, RDS, and VPC don't appear on the Free Tier usage page whatsoever, meaning the August EC2+RDS charges were never partially offset by free tier and never could have been, regardless of instance type or hours run — this account simply isn't enrolled/tracked for free tier on those services, full stop. Rules out any remaining theory that instance-type eligibility (t3.small vs. t3.micro) was the deciding factor.

**Closed 16/09/2026 — AWS Support: account never eligible for Free Tier credits, no override.** First reply (15/09) claimed credits were "issued at enrollment," which didn't match Cost Explorer data — RECORD_TYPE=Credit/Refund returned $0.00 for every month Jan–Sep 2026, account lifetime, and Billing Console Credits page showed none active or inactive. Follow-up sent citing that discrepancy. Second reply (16/09) superseded the first: account is not a new-customer account (existing or prior AWS account), so Free Tier program/credits never applied — not a missing-credit bug, a straight ineligibility. No override, no further detail given ("for security reasons"). Free Tier credit question fully closed — no further action. AWS Activate (startup credits) application remains the only open path; outcome pending, user will report back.

**Deferred 16/09/2026 — new-account migration to reclaim Free Tier credit, gated on Activate outcome.** Root cause of ineligibility identified: current AWS account's email (`barcprodevelopment@gmail.com`) was used on a prior AWS account in 2024. Option considered: create a new account under `barcohendev@gmail.com` and migrate infra (EC2 AMI/RDS snapshot copy across accounts, re-provision Secrets Manager + IAM, repoint Cloudflare DNS) to get a fresh Free Tier enrollment. Known risk: AWS Free Tier eligibility checks match not just email but also payment method (card) and phone number across accounts per AWS's own FAQ and Support's stated overlap signals — a new email alone likely isn't sufficient, and account signup requires a payment method *during* creation (with a $1 auth hold), so there's no window to swap cards after the fact. No documented/confirmed answer on whether an unbilled/newly-added card would still get flagged — AWS doesn't publish its dedup logic. **Update 23/09/2026 — Activate application REJECTED (second time), same two reasons as the first:** (1) website cannot be accessed or fails to load, (2) application email domain does not match the AWS account's email domain. Checked live the same day: apex `https://pulserehab.app` returns 200 in ~0.4s (also over http); `www.pulserehab.app` has no DNS record (NXDOMAIN) — so if the form was given the `www` URL, that alone explains reason (1). Correction same day: the application's website field was the apex `https://pulserehab.app/` (which loads fine) and both the application email and the AWS account email were `bar@bardevs.com` — so the `www` theory and the "account email might be gmail" theory were both wrong. Both rejection reasons therefore contradict the data as submitted. Unverified hypotheses: (1) the reviewer's automated fetch is blocked or challenged by Cloudflare bot protection/WAF even though a normal request returns 200; (2) the "email domain" check actually compares the email domain to the website domain (the form itself warned "bar@bardevs.com and your website domain don't match"), not to the AWS account email. Candidate fix for a third attempt: use an address on `pulserehab.app` for both the AWS account root email and the application, and check Cloudflare security settings for the apex. Decision 23/09/2026 (user): change the AWS account root email to `bar@pulserehab.app` so it matches the website domain, then reapply; treat "website fails to load" as automated boilerplate (rejection text says "including"; apex verified 200), not a real fault. Prerequisite: `bar@pulserehab.app` must be able to receive the AWS verification code (e.g. Cloudflare Email Routing forwarding). Root-email change is console-only, root login required. The deferral below still holds, but Activate is not a sure thing.

**Update 26/09/2026 — September actuals after the t3.micro downsize (Cost Explorer, 1–25 Sep = $49.46 incl. tax, ~$58.78 projected vs $63.78 in August).** Downsize saves ~$0.012/hr (~$8.6/mo like-for-like) but the month-over-month drop is only ~$5 because August was a partial month for both instances (~607 micro-hrs and ~655 small-hrs logged) while September runs both for the full month; all EC2 hours are billed at list price (no free tier applied). Remaining baseline (25 days): RDS $14.78, EC2 compute $14.53, public IPv4 $5.89 (2 in-use addresses at $0.005/hr — not a NAT Gateway), EBS gp3 $3.88, Secrets Manager $2.44, tax $7.54. Levers left: the second EC2 (client) instance and its public IPv4 (~$3.6/mo each), RDS size, Secrets Manager secret count. Elastic IPs for the ASG plan cost the same $0.005/hr as the auto-assigned IPv4 already paid, so they add ~nothing per attached address.

**Update 26/09/2026 — Activate application REJECTED a third time, after the email fix (`bar@pulserehab.app` on both account and application).** New generic reason: internal checks on (1) valid billing and AWS account details, (2) consistent business information, (3) connection to accounts linked to misuse; no website or email complaint this time, so those earlier reasons were noise. Unverified reading: the account is being linked to the closed 2024 AWS account (shared email, phone, card, or IP), the same signal Support gave for Free Tier ineligibility. AWS discloses no detail. Consequence for the deferred new-account plan below: the Activate gate has resolved negatively, but the same linkage signals (card, phone, IP) would likely follow a new account, so the migration is low-odds and not recommended without a genuinely different card and phone. AWS credits are treated as unavailable; cost control stays on rightsizing (pulse-server already t3.micro).

Decision: **defer this entirely until the AWS Activate application outcome is known** — Activate credits (~$1000+ typical) dwarf the Free Tier one-time credit (~$100-200), no reason to spend migration effort + a spare card/phone if Activate comes through first.

**Update 14/10/2026 — Activate application REJECTED a fifth time, same internal-checks reason as #3/#4.** Attempt #5 (11/10/2026, Tel Aviv city, 2026 founded date matching LinkedIn, rewritten description, correct AWS-experience band) still rejected with the same generic reason as attempts #3/#4: internal checks on (1) valid billing/AWS account details, (2) consistent business info, (3) connection to accounts linked to misuse. No mechanical reason given this time either (website/email checks weren't the complaint — those were only attempts #1/#2's reasons). Since the 2-year-founding-age fix (the mentor's leading theory going into #5) produced no change in outcome or reason text, that theory is now **downgraded** — not ruled impossible, but it didn't move the needle. The **account-linkage theory from 16/09/2026 (closed Free Tier case) is back to being the leading explanation**: AWS Support already confirmed this account is tied to a prior 2024 AWS account under the same email, and "connection to accounts linked to misuse" in the Activate rejection reads as the same signal. Full history and draft tracking in private file (`.claude/private/aws-activate-application.md`, gitignored, PII — not duplicated here).

---

## 07/09/2026 — Root-caused Google OAuth login regression from AWS migration (fix implemented, not yet verified)

**Problem:** Google OAuth login broken since Render→AWS migration. Root cause: `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI` were never carried over to AWS Secrets Manager during the migration — `scripts/deploy/ec2-redeploy.sh` only fetched 6 secrets (DB creds, JWT, Anthropic/Google-AI/OpenAI keys), so the prod container ran with no Google OAuth env vars at all.

**Decision:**
- Created `pulse/app/GOOGLE_CLIENT_ID` and `pulse/app/GOOGLE_CLIENT_SECRET` in Secrets Manager (eu-central-1); added both ARNs to the `pulse-secret-read` IAM policy on `pulse-ec2-role`.
- `GOOGLE_REDIRECT_URI` is not a secret (public callback URL) — set directly as `googleOAuth.redirectUri` in `config/production.ts` (`https://pulserehab.app/api/v1/auth/google/callback`) instead of Secrets Manager, avoiding an unnecessary secret + IAM grant for non-sensitive config.
- Updated `ec2-redeploy.sh` to fetch the two new secrets and pass them as container env vars.
- Updated `docs/DEPLOYMENT.md` secrets table to match.

**Why this approach over alternatives:** Keeping `GOOGLE_REDIRECT_URI` out of Secrets Manager follows the existing pattern in this repo of only storing values that are actually sensitive (see `redirectUri` already being plain env-var-driven pre-migration) — matches user's explicit call mid-session.

**How to apply:** Not yet verified — nothing deployed or tested end-to-end. Still needed: (1) verify `https://pulserehab.app/api/v1/auth/google/callback` is added to the Authorized redirect URIs list on the Google Cloud Console OAuth client (AWS-side CLI has no access to that); (2) merge the PR, deploy, and actually run the login flow against prod to confirm it works — the analysis pinpointing the missing secrets is solid, but that alone doesn't prove the fix works. Old/previous OAuth client secret left untouched (not disabled) since it may still be in use by a preview server the user doesn't have access to — confirm before rotating.

**Closed 15/09/2026 — user confirmed Google OAuth login verified working in prod.** Deployed and tested end-to-end. No longer tracked in `TODO.md`.

**Follow-up 13/09/2026 — found `/api/v1/` above was itself wrong, fixed to `/api/v2/`.** `SERVER_API_VERSION=v2` is set in `ec2-redeploy.sh`'s `RUN_ARGS`, and `config/custom-environment-variables.ts` maps it into `serverConfig.apiVersion`, which `declare_routes/index.ts` uses to mount every route including `authRoute` — so prod's real Google callback path is `/api/v2/auth/google/callback`, not `/api/v1/...`. The v1 path in this entry 404s; user caught it live while reviewing a newly-created OAuth client's redirect URIs. Fixed `GOOGLE_REDIRECT_URI` in `ec2-redeploy.sh` to `/api/v2/auth/google/callback`. This was part of a separate GCP-project-consolidation migration (new OAuth client created in `gen-lang-client-0497058436`, both v1 and v2 callback paths registered on it defensively) — not a regression from this decision, just a stale value in it never previously verified end-to-end.

---

## 13/09/2026 — Docker base image EOL + Node 24 bump; root-caused intermittent prod latency to a leftover ECS agent

**Problem 1 — Docker builds failing.** `Dockerfile`'s `node:20-bullseye-slim` base started failing `apt-get install -y openssl curl` with a 404 on `libcurl4` from `deb.debian.org/debian-security` — Debian 11 (bullseye) security packages have aged out of the live mirror rotation (real EOL breakage, not a fluke — reproduced identically on retry).

**Decision 1:** Switched both Dockerfile stages to `node:24-bookworm-slim` (Debian 12, actively maintained; Node 24 chosen over staying on 20 since `geoip-lite`'s `engines.node >=24` requirement was already producing `EBADENGINE` warnings, and CI's `actions/setup-node` was already being silently forced onto Node 24 by GitHub regardless of the pinned `node-version: 20`). Added `engines.node >=24.0.0` to `package.json` to pin this going forward, bumped `ci.yml`'s `node-version` to 24 to match.

**Problem 2 — this surfaced a second, unrelated bug:** `npm ci --omit=dev` (used in the Dockerfile's `deps-prod` stage) omits `husky` (a devDependency) but the `prepare` lifecycle script still tries to run it, failing the whole runner image build with `husky: not found` — there's no `.git` in that image for husky to hook into anyway.

**Decision 2:** Changed `package.json`'s `prepare` script to `"husky || true"` — tolerates the missing binary in prod-only installs, still runs normally in dev where husky is present.

**Problem 3 — deploy still failed after the above, differently:** the built image was fine and migrations ran cleanly, but the candidate container failed its own health check. Its actual logs showed it responding `200` to `/api/status` — just slowly (6.4s then 3s) — while CPU stayed near 0% and memory was low, ruling out resource contention (confirmed via CloudWatch: `CPUCreditBalance` flat at 288, `CPUUtilization` never exceeded 10%). Worse, the *real* production container (`pulse-app`, 11 days uptime, previously healthy) flipped to `unhealthy` shortly after, while still serving fine.

Ran a repeatable SSM-driven curl loop against the box (`/diagnose` discipline) and found a second container present: `ecs-agent` (image `amazon/amazon-ecs-agent:latest`), crash-looping via a systemd unit (`ecs`, `enabled`). Its own logs showed `AccessDeniedException` on `ecs:RegisterContainerInstance` (the `pulse-ec2-role` was never granted that permission) — it never successfully registers, just retries and exits, and each cycle runs its "ENI Watcher" that touches network device/routing state. Confirmed via `aws ec2 describe-images` that the instance's AMI is `al2023-ami-ecs-neuron-hvm-...` — an **ECS-optimized AMI**, picked (almost certainly by accident, since this project never uses ECS anywhere — plain EC2 + Docker via SSM the whole time, confirmed `pulse-app` ran fine for all 11 days regardless) at original instance provisioning. 30 consecutive local curls right after the agent's process happened to exit: 0/30 slow. 50 consecutive curls after `systemctl disable --now ecs`: 0/50 slow (max 26ms) — confirms the causal link.

**Decision 3:** `systemctl disable --now ecs` on the instance, removed the `ecs-agent` container. Verified fix: prod flipped back to `healthy` immediately; 50/50 follow-up requests fast.

**Why this approach over alternatives:** Granting the missing `ecs:RegisterContainerInstance` IAM permission was considered and rejected — that would make the agent actually succeed and register this instance into a real ECS cluster (named `default`), pulling it under ECS's scheduling alongside the manually-managed `pulse-app` container. This project's architecture is deliberately plain EC2 + Docker; adopting ECS is a legitimate future option but a much bigger, deliberate decision, not something to back into by patching a permissions error.

**How to apply:** `systemctl disable --now ecs` does not survive a full instance replacement (new instance from the same ECS-optimized AMI would reintroduce this) — when the ASG work from the 13/08/2026 entry happens, either launch from a plain (non-ECS) AL2023 AMI, or bake `systemctl disable ecs` into the instance's user-data/launch template so it can't resurface silently again.

---

## 16/09/2026 — GCP project consolidation completed; old projects deleted

**Problem:** Project was spread across 3 GCP projects (`healease` — original OAuth client, `gen-lang-client-0064017105`/pulse-dev, `gen-lang-client-0497058436`) with only the last having an active billing account. OAuth client and Gemini API key lived on `healease`, inherited from a prior migration, creating a dependency on a project with no billing safety net.

**Decision:** Consolidated everything onto `gen-lang-client-0497058436` (display name "Pulse", project number `583038005639`) — new OAuth consent screen + Web client created there (published to Production), new Gemini "free-tier" API key created there, both wired into AWS Secrets Manager (`pulse/app/GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_FREE_AI_API_KEY`). Good/active client ID: `583038005639-piausj2fm3n1mqe3s0peg5p1gnute76i.apps.googleusercontent.com`. `GOOGLE_AI_API_KEY` (paid-tier fallback) was confirmed already living in the same target project — never needed migrating despite an older `LastChangedDate` (08/2026), verified by matching its Secrets Manager value against `gcloud services api-keys get-key-string` output across all 4 remaining accessible projects (only 1 match, in `gen-lang-client-0497058436`).

**Verification before deletion (all confirmed 16/09/2026):** no traffic on old client IDs (both replaced during the 07-13/09 OAuth-login fix chain), no stale-secret risk (same fix chain replaced secrets everywhere), all environments (prod EC2, Render staging) already on new client, zero `redirect_uri_mismatch`/`invalid_client`/`unauthorized_client` in prod container logs since the 13/09 fix (checked via SSM `docker logs pulse-app --since 2026-09-13T12:00:00`), `GOOGLE_AI_API_KEY` confirmed already in the correct project.

**Decision:** Deleted `healease` and `gen-lang-client-0064017105` via `gcloud projects delete` — both confirmed via `gcloud projects undelete <id>` availability for the standard 30-day GCP recovery window, not treated as instantly irreversible.

**Why this approach over alternatives:** No reason to keep either project once verification passed — an orphaned project with a live OAuth client/API key is pure attack surface and consolidation-defeats-the-purpose risk if anyone later re-enables it by accident.

**How to apply:** Only remaining GCP project for this app is `gen-lang-client-0497058436`. Full original audit/migration plan lives in `docs/GCP-PROJECT-MIGRATION.md`. 30-day undelete window closes ~16/10/2026 — after that, deletion is final.

---

## 26/09/2026 — Keep production on RDS; do not move the prod DB to Neon to save ~$15/mo

**Problem:** RDS is the largest single line (~$14.78 for 1–25 Sep: db.t3.micro $12.37, 20 GB gp2 $2.24, backups $0.17), which prompted asking why prod isn't on Neon (still used for local dev and Render staging). The repo had no recorded rationale for RDS over Neon.

**Decision (user):** keep prod on RDS. `pulse-db` is not publicly accessible (verified: `PubliclyAccessible=False`), so only instances inside the VPC reach it; moving prod to Neon would put production data behind an internet-facing endpoint and split the stack across two providers, which the user judges a weak point in the architecture and in interviews.

**Why this approach over alternatives:** Neon would save at most ~$15/mo but requires a prod data migration, TLS-over-internet (or peering) access, and losing RDS automated backups; the instance is already the smallest standard class, and the only other lever is `db.t4g.micro` ($0.019/hr vs $0.021/hr, ~$1.50/mo, not worth a restart). Neon pricing/limits were not re-verified this session.

**How to apply:** do not propose moving prod off RDS as a cost saving; treat RDS as fixed baseline (~$15-18/mo). Cost levers live elsewhere (second EC2 + its public IPv4, Secrets Manager secret count). Original reason for choosing RDS at migration time was not recorded; the reasons above are the user's current rationale.

---

## 26/09/2026 — Cost impact of ASG + Elastic IP (calculated, ~$0/mo change)

**Problem:** user asked how the bill changes with the planned ASG (`min=1/desired=1/max=2`) plus a fixed Elastic IP (or Route53).

**Calculation (eu-central-1, list prices from the Pricing API; instance facts from the CLI on 26/09/2026):** `pulse-server` = t3.micro $0.012/hr (~$8.76/mo) + one auto-assigned public IPv4 $0.005/hr (~$3.65/mo) + 30 GB gp3 at $0.0952/GB-mo (~$2.86/mo) = ~$15.27/mo. With ASG + EIP at steady state: same instance, same volume, the EIP replaces the auto-assigned IPv4 at the identical $0.005/hr → ~$15.27/mo, delta ~$0. No Elastic IPs exist on the account today. ASG control plane is free. `max=2` only costs during a replacement overlap: ~10 min of a second t3.micro + volume ≈ under $0.01 per event. Re-associating the EIP from the new instance's user-data with its instance role (`aws ec2 associate-address`) needs no Lambda and costs $0.

**Alternatives priced:** Route53 adds $0.50/mo per hosted zone + $0.40/million queries — extra cost and redundant with Cloudflare, so still rejected. An ALB is not in the plan (rejected earlier as premature) and would be the first real cost jump; not priced here.

**How to apply:** projected monthly bill stays ~$58.78 after the ASG/EIP work; do not describe the EIP as a $3.60/mo addition. Applying the same setup to the client instance is likewise cost-neutral. Verified against AWS docs 26/09/2026 (fetched, not recalled): (1) EC2 Auto Scaling pricing page — "no additional fees beyond the service fees for EC2, CloudWatch (for scaling policies), and the other AWS resources that you use", so groups, lifecycle hooks and health checks are free; (2) VPC pricing page — public IPv4 is $0.005/hr for in-use and idle alike, same for Elastic and auto-assigned addresses, no free allowance; (3) EC2 Elastic IP docs — associating an EIP with an instance that already has a public IPv4 releases that address back to Amazon's pool, so the instance ends up with one billed address, and an EIP can be disassociated and re-associated to another resource. Only remaining cost nuance: a replacement instance launched with an auto-assigned IP briefly holds two addresses (~$0.005/hr each) until the EIP is attached, well under a cent; launching with no auto-assigned IP avoids it. Not checked: the IAM permissions (`ec2:AssociateAddress`, `ec2:DescribeAddresses`) and `--allow-reassociation` flag the boot script will need — implementation detail, not cost.

---

## 26/09/2026 — Corrected topology: the IP-stability plan must cover the client's public IP and the server's private IP (revised plan, pending user go-ahead)

**Problem:** the 02/09 and 26/09 entries treated the server's public IP as the ASG/restart problem and chose an Elastic IP on `pulse-server`. Actual topology (`docs/DEPLOYMENT.md`, client `deploy.yml`, verified via CLI 26/09/2026): Cloudflare (proxied) → **client** `pulse-client-app` public IP `63.186.185.244` (auto-assigned, no EIP) → `/api` rewrite to the server's **private** IP `172.31.25.240:80`, baked into the client build as `NEXT_PUBLIC_SERVER_URL`. The server's public IP `18.199.102.66` is used only for outbound internet access. This also explains why the earlier resize didn't break the site: the server's private IP survives stop/start.

**Real risks:** (1) client stop/start or replacement changes its public IP and the site is down until the Cloudflare origin is edited; (2) an ASG replacement of the server gets a new private IP and the client keeps proxying to the dead one until rebuilt; (3) `deploy.yml` hard-codes the server instance ID for SSM, so an ASG replacement is never deployed to.

**Revised plan (not yet implemented):** Client — attach an Elastic IP (cost-neutral, replaces its auto IP), point Cloudflare's origin at it once. Server — pre-create a dedicated network interface with a fixed private IP in the server's subnet (free), attach it from the launch template's boot script, and rebuild the client once with that IP; ASG restricted to that subnet/AZ; retarget `deploy.yml` SSM commands by tag instead of instance ID; add `ec2:AttachNetworkInterface`/`DescribeNetworkInterfaces` to the instance role. Alternative considered: private Route53 hosted zone ($0.50/mo) so the client uses a hostname — more moving parts; public EIP on the server rejected (loses the private path, adds inter-instance data-transfer charges). Cost of the plan stays ~$0/mo apart from a small AMI snapshot.

**Supersedes:** the premise of Decision 3 in the 02/09/2026 follow-up (EIP on the server). Per the supersession rule the old text moves to `archive/` once the user approves this plan; until then it stays with this entry as the correction of record.

---

## 28/09/2026 — H4: Cloudflare Tunnel instead of Origin CA cert + reverse proxy (user-approved)

**Problem:** security audit H4. Cloudflare SSL mode is Flexible, so Cloudflare→origin is plain HTTP. Verified live 28/09/2026: `http://52.58.214.220/` returns 200 from the internet, nothing listens on 443, and the client SG (`sg-02ad243011d768866`) allows 80 and 443 from `0.0.0.0/0`. So anyone can also skip Cloudflare entirely.

**Decision:** run `cloudflared` (pinned `cloudflare/cloudflared:2026.9.3`, `--network host`) on the client box. It opens an outbound-only, encrypted tunnel to Cloudflare, and the tunnel's public hostname `pulserehab.app` points to `http://localhost:80`. The app container binds to `127.0.0.1:80`, and the SG drops all public 80/443 ingress. `ec2-redeploy.sh` (client) starts the tunnel after a healthy deploy, reading the token from Secrets Manager `pulse/client/CLOUDFLARE_TUNNEL_TOKEN`. Doing so requires a `GetSecretValue` policy on `pulse-client-ec2-role`.

**Why over Origin CA + Caddy/nginx on 443 with Full (strict):** that option still needs a public 443, plus a hand-maintained allow-list of Cloudflare IP ranges to stop direct-origin access, plus a cert and key to store and renew. The tunnel closes the origin entirely and has no cert to manage. Both are free.

**How to apply:** rollout order matters. If the loopback-bound deploy goes out before the tunnel is live, the site goes down. The order is: create the tunnel, store the token and IAM → start `cloudflared` once via SSM → swap DNS (delete the apex A record, add the tunnel public hostname) → merge the client PR → remove SG 80/443 → set SSL mode to Full (strict) and Always Use HTTPS. The EIP stays attached for now (outbound, SSH) but is no longer on the request path.

## 30/09/2026 — Routine runs on Sonnet 4.6, not 5 or 5.5

**Decision:** The scheduled routine is set up on Sonnet 4.6 (not Sonnet 5 or 5.5) to save tokens, because it runs on the old tokenizer.

**Why over alternatives:** Token saving on the old tokenizer.

**Source:** Bar, typed in a Pulse server session on 2026-09-30: "ive set it up on sonnet 4.6 (not 5 or 5.5) to save tokens since it run on the old tokeniser"

## 21/10/2026 — Use the separate AWS cost tool, not the AWS MCP

**Decision:** To check actual AWS cost use the separate cost explorer tool (split out from the MCP), not the AWS MCP.

**Source:** Bar, typed in a Pulse server session on 2026-10-21: "Use the tool, not the MCP. You separated from the MCP to check actual cost" and "No I remember we had the MCP and we split the cost explorer format

## 27/10/2026 — Watcher fixer merges release PR on green checks

**Decision:** The fixer routine now merges the development to main release PR itself when every check is green, and pushes to the owner whenever a Deploy run waits for approval. The owner only approves the deploy. held-for-review stays as the review gate until the owner replaces it with rules.

**Why over alternatives:** Watchers only reached development and never main, so fixes never shipped until an interactive session merged the PR. The old rule had the owner's session merge the PR, but nothing prompted it. Merging is safe because held and needs-human fixes are not on development.

**Rejected:** Keeping the merge with the owner's interactive session: nothing triggers it, so fixes stalled on development.

**Source:** User, pulse-server session 2026-10-27

## 28/10/2026 — Fixer holds on Client-Impact and times out unreviewed releases

**Decision:** The fixer routine also holds any fix whose Client-Impact is not none, refining the existing client-breaking hold rule. A held release that the owner never reviews times out. Branch policy for aws-production is main only. The scope of the always-held changes is delegated to an Opus agent and is not yet decided.

**Source:** user, auto-recorded: "The user answered: 'Q1: Which changes must always be held for your review (never auto-ship)?'='Send an Opus agent to go and give up its own thoughts On what should be held and what is okay to ship ', "

## 28/10/2026 — Risky releases held by a needs-review label at the PR phase

**Decision:** For #81, a release that matches the hold rules is held at the PR phase, before ship, with a `needs-review` label. Ship refuses anything carrying it until the owner clears it. No release is held at the deploy approval step, so none can slip through by accident and none can time out.

**Why over alternatives:** Owner, on #81: 'better: hold needs-review shipping on the pr phase before ship, so no ship slip through by accident and also no timed-out ones'. Replaces the earlier answer to Q3 (held release times out).

**Rejected:** Hold at the aws-production approval with a wait (30 days) or a timeout: a held release can slip through at the click, or expire and be dropped.

**Source:** user, auto-recorded: "recorded by the session"

## 28/10/2026 — Held needs-review PRs carry a what-changed summary

**Decision:** A PR held with `needs-review` under the #81 ship rules gets a summary of what changed and what is new (changed areas, the hold rule that matched, new behaviour, client impact) so the owner can review it quickly.

**Why over alternatives:** Owner, on #81: 'So the PR gets a summary of what changed and what new, so I can easily review it.' Holding at the PR phase only helps if the review is cheap.

**Source:** user, auto-recorded: "recorded by the session"

## 28/10/2026 — Instance metadata hop limit 2 so the container reads the instance role

**Decision:** The pulse-server launch template (default v7) and the running instance use IMDS hop limit 2 with tokens still required (IMDSv2 only). The app container needs the instance role credentials to write error logs to CloudWatch (#83). This reverses the hop limit 1 set in v5 on 16/10/2026.

**Why over alternatives:** With hop limit 1 a container cannot reach the metadata service, so the winston CloudWatch transport gets no credentials. Owner approved the change in the session ('Just get it', then ran the commands by hand after the tool permission check blocked them). The role stays scoped: secrets read for the app plus write to /pulse/server-errors only.

**Rejected:** Static write-only IAM keys in Secrets Manager (long-lived key to rotate, new secret in the deploy path); a host-side shipper tailing docker logs (new moving part on the instance).

**Source:** user, auto-recorded: "recorded by the session"

## 15/11/2026 — Client moves onto the server EC2 box, not S3

**Decision:** The Next.js client container will run on the same EC2 box as the server, behind path routing, and the separate client EC2 instance goes away. The client is not moved to S3 + CloudFront and is not rewritten in another framework.

**Why over alternatives:** The client is Next.js `output: 'standalone'` and needs Node at runtime (per-request CSP nonce in `src/proxy.ts`, cookie locale via `cookies()`, `/api` rewrites), so S3 needs a client refactor. The actual waste is the second box and its public IPv4; one shared box removes that with no client code change.

**Rejected:** S3 + CloudFront static export now (client refactor, delays the chat work, about no extra saving once the box is sized for chat); keeping the separate client EC2 (keeps paying for the second box and IPv4).

**Source:** Bar, AskUserQuestion answer in the aws-arch session, 2026-11-15

## 15/11/2026 — FastAPI chat service: assistant first, design per inter-service report

**Decision:** The FastAPI chat service starts as an AI assistant only, built so user-to-user chat can later be added as a feature of the same service. Its communication with the Node server follows `~/Claude/personal/teach/python-fastapi/report-interservice-python-nodejs.md`: Node owns auth, the main DB and the browser WebSocket; FastAPI owns chat logic, LLM calls and async jobs; REST/OpenAPI for sync calls, BullMQ over Redis for async, Redis Pub/Sub for real-time fan-out, M2M key plus `X-User-ID` for auth.

**Why over alternatives:** User-to-user chat is a future possibility, not current scope. The report is the user's chosen source for the service-communication design; it does not cover AWS or deployment.

**Source:** Bar, AskUserQuestion answers in the aws-arch session, 2026-11-15

## 17/11/2026 — Stay on t3.small, no ARM (t4g.small) move

**Decision:** The single app box stays on x86 t3.small. The planned step 2 move to t4g.small (ARM) is dropped. Switching later stays possible, since nothing in the layout blocks it.

**Why over alternatives:** It saves $4.22 a month (about $51 a year), which does not justify three build pipelines (server, client, chat), an arm64 machine image, and production being the only ARM environment (dev PC and Render staging are x86). ARM support was checked from documentation only, never run.

**Rejected:** t4g.small as a second step after the client move. t3.medium and t4g.medium were also rejected earlier as overkill.

**Source:** Bar, comments on the AWS architecture artifact, 17 Nov 2026

## 17/11/2026 — Move RDS to db.t4g.micro (confirmed)

**Decision:** The RDS instance class changes from db.t3.micro to db.t4g.micro. Confirmed as part of the plan. The change itself is not run yet: it needs a maintenance window the user picks and a snapshot first.

**Why over alternatives:** Saves about $1.76 a month with tax ($0.019 against $0.021 an hour), with no code change. Checked 17 Nov with the AWS CLI: db.t4g.micro is orderable for Postgres 17.10 in eu-central-1. AWS's extension table lists pgvector 0.8.2 on 17.10; still to confirm with CREATE EXTENSION vector on a restored copy. The database being on ARM while the app box stays on x86 is harmless, since the app reaches Postgres over the network.

**Rejected:** Staying on db.t3.micro to avoid a few minutes of database downtime (total would be $57.50).

**Source:** Bar, terminal, 17 Nov 2026

## 17/11/2026 — Job queue is RabbitMQ, not SQS or BullMQ

**Decision:** Background jobs run on a RabbitMQ container on the app box, used by Node only for now (chat consumes no jobs). Hard memory cap (256 MiB estimate, to be measured after the client move), data on a volume, internal network only, one Node user limited to its own queues. Replaces the earlier BullMQ-over-Redis decision and the SQS plan.

**Why over alternatives:** Owner chose it on 17 Nov to gain experience in a broker that job listings often name, alongside a sound design. Jobs are rebuildable from Postgres, so losing the box's volume costs a delay, not data.

**Rejected:** SQS (managed, no memory, but no broker experience); BullMQ on Redis (needs a second non-evicting Redis, weak Python client); Redis Streams (retries to be written by hand).

**Source:** Artifact comment thread 687af3ff, 17 Nov 2026: "RabbitMQ it is, so I also gain experience along the way."

## 18/11/2026 — Check-in AI moves onto RabbitMQ with a Postgres outbox

**Decision:** Check-in AI feedback moves from the Postgres job table with its polling worker onto RabbitMQ. Each job keeps a pending row in Postgres as the record, RabbitMQ is the delivery channel, and a sweeper republishes rows still pending after a few minutes. Consumers are idempotent. The broker stays a single node on the app box. Not built yet: this is a plan decision.

**Why over alternatives:** It is the highest-volume job and the one the load test stresses, so it gives real production experience with a broker (a goal of the owner) with the sweeper as the safety net, as the Postgres worker has today.

**Rejected:** Leaving check-in AI on the Postgres table (works today but gives no broker experience); a local RabbitMQ only (nothing verifiable for a CV); multiple broker nodes (more machines and memory than the plan has).

**Source:** Artifact comment thread 50b01dab, 18 Nov 2026: "Good. Record it in depth in a doc for the exp too"

## 18/11/2026 — Apply the review fixes to the plan, except 8 and 9

**Decision:** The plan takes the Opus review fixes as designed: compose boot with last-good image tags from Parameter Store, tunnel routing that works on both boxes, client rebuilt with SERVER_URL=http://server:8080, cloudflared on the edge network with a default-deny metadata block, a deploy lock, no Redis path for chat context, row-level security and iterative scans for vector search, tighter chat database roles, monitoring and backup retention with a restore test, explicit CPU credit mode, load test on a clone, and a 15-minute database change window. Finding 8 (RabbitMQ memory cap) stays a check after th

**Why over alternatives:** The owner asked to fix every finding that does not conflict with their decisions, kept 8 as needs verification after the load test, and said the chat model is not chosen yet so 9 cannot name a provider.

**Rejected:** Separate tables for private and shared vectors (conflicts with the single-store decision); shrinking the RabbitMQ cap or the box now (needs a measurement); naming OpenAI in the data-terms check (the chat model is not chosen).

**Source:** Terminal, 18 Nov 2026: "About #9, we still to decide the model for chat since it needs a separate eval. Mark 8 as needs verification after load test"

## 18/11/2026 — Chat transport is WebSocket on Node, not SSE

**Decision:** The browser connects to the Node server over a WebSocket for chat. Node calls the chat service over HTTP with streaming, a separate internal link. Requirements on chat day: Origin and session check on each connection, size and rate limits per user, reconnect and resume built in because every server deploy cuts the connection.

**Why over alternatives:** User-to-user chat is planned and needs a two-way connection, so building SSE for the assistant first would mean building twice. A check of the job-targeting repo found WebSocket in 5 job requirements (all nice-to-have) and SSE in none, so market demand is only a weak extra reason.

**Rejected:** SSE plus POST for the assistant (simpler and safer now, but needs a second transport for user-to-user chat); FastAPI holding the browser WebSocket (Node already owns users and auth).

**Source:** Terminal, 18 Nov 2026: "אז וובסוקט הוחלט"

## 18/11/2026 — RabbitMQ on the app box now; chat uses a provider key

**Decision:** RabbitMQ runs on the app box for now and a separate machine is decided only after the load test. The chat service uses its own model provider API key and holds no AWS credentials, so Bedrock stays Node-only for embeddings; the provider is chosen after the model evaluation. The fallback if memory exceeds 80% at the deploy peak is decided after the load test.

**Why over alternatives:** Keeps cost at zero extra for now and keeps the wall around chat (no AWS credentials). The real memory reading decides whether the broker needs its own box.

**Rejected:** Own t4g.micro for RabbitMQ now (about $7.01 a month, more to maintain); a Bedrock identity for chat (weakens the isolation); fixing a memory fallback before the test.

**Source:** Terminal questions, 18 Nov 2026

## 18/11/2026 — No separate disk for RabbitMQ, the sweeper rebuilds the queue

**Decision:** RabbitMQ keeps its data on the instance root disk with no separate EBS volume. If the box is replaced, the queue is lost and the pending rows in Postgres plus the sweeper republish unfinished jobs. A separate volume stays an option if a job ever cannot be rebuilt from Postgres.

**Why over alternatives:** Loss of the queue costs a delay, not data, so a separate volume adds an attach-at-boot step tied to one availability zone and one more thing that can fail at boot, for a small cost ($0.0952 per GB-month) that is not the deciding factor.

**Rejected:** Separate EBS kept after termination, attached at boot.

**Source:** Terminal, 18 Nov 2026: "Sweeper it is"

## 18/11/2026 — Queue consumer concurrency starts at 2, tuned after load test

**Decision:** The RabbitMQ consumers for check-in AI start with 2 jobs at once, the same as the polling worker today, set through config. The final number is chosen after the load test from real memory, provider rate-limit errors and queue depth.

**Why over alternatives:** No real measurement exists yet for memory under a burst or for the provider's 429 limits, so a number chosen now would be a guess.

**Rejected:** Fixing 4 or 10 now (unmeasured risk to memory, provider limits and database connections).

**Source:** Terminal, 18 Nov 2026: "Decide after the load test"

## 18/11/2026 — Cloudflare stays the front door, CloudFront not added

**Decision:** Cloudflare stays the CDN and front door through the existing tunnel, and CloudFront is not added. The client stays on the same box as the server (S3 was rejected on 15 Nov). The ARM move (t4g.small) and a larger t3.medium were dropped from the plan.

**Why over alternatives:** Keeping Cloudflare avoids a second CDN and cost, and the box has room for everything on a t3.small.

**Rejected:** CloudFront in front of the box; S3 for the client; ARM t4g.small; t3.medium.

**Source:** Artifact comments, 16 to 17 Nov 2026

## 18/11/2026 — Redis is a firm part of the plan, with cache rules

**Decision:** Redis runs as one more container on the internal network with a hard memory cap of 100 MiB and least-recently-used eviction. Uses, in order: rate-limit counters, chosen database reads (cache-aside), and live fan-out (Pub/Sub) when a second Node instance or user-to-user chat exists. Chat context does not go through Redis. Rules: every key expires, the cache is never the only copy, no health or check-in content in cached values, password set and no published port. Background jobs do not use Redis.

**Why over alternatives:** Redis is chosen mainly for hands-on production experience, with efficiency second. Each use is placed where it does real work and covers a different Redis pattern.

**Rejected:** Redis for chat user context (removed 18 Nov); BullMQ or Redis Streams for jobs (RabbitMQ chosen).

**Source:** Artifact comments, 15 to 18 Nov 2026

## 18/11/2026 — Database class change at 23:00 local time on migration day

**Decision:** The RDS change from db.t3.micro to db.t4g.micro runs at 11 p.m. local time (UTC+3, 20:00 UTC) on migration day, after a snapshot, before the client box is deleted. Plan for about 15 minutes of downtime, check pending modifications first, and freeze deploys during the window. Not run yet.

**Why over alternatives:** It is the owner's next maintenance window, and doing it before the only irreversible step keeps the database healthy before anything is deleted.

**Source:** Artifact comments, 18 Nov 2026: "Local (utc+3)"

## 18/11/2026 — Load test plan: three runs with a fake model, under 80% memory

**Decision:** Memory under load is verified by a load test of 100 to 1,000 requests, with a deploy during the load, run three times: after the setup, after chat day, and after the RAG and pgvector work. Run on a clone of the box in production mode, with many test users and a named tool such as k6. The model is a fake endpoint that copies real response timing and size (a few seconds with spread, streamed in chunks), plus one small run on the free key to confirm the real path. Pass: memory under about 80% at peak, no container killed for memory, no failed requests. Chat's 200 MiB and RabbitMQ's 256 MiB cap st

**Why over alternatives:** The memory reading was taken at near-zero traffic, and a fake model avoids burning the AI budget while matching the load a real model would put on the box.

**Rejected:** Running against the production box; using the free key for the whole test (rate limits); testing only once.

**Source:** Artifact comments, 18 Nov 2026

## 18/11/2026 — AWS Activate credits are a task, not part of the plan

**Decision:** Chasing the AWS Activate credits application is a task tracked in the second brain's daily file, not an item in the AWS architecture plan. The plan's cost numbers do not count credits.

**Why over alternatives:** The application's outcome does not change the design, only the bill.

**Source:** Terminal, 18 Nov 2026

## 18/11/2026 — Keep Secrets Manager, no merge; trim two unused entries

**Decision:** AWS Secrets Manager stays as the store, and merging the entries into one was declined. The Google OAuth client ID moves into the app config through the config package, with an environment variable still able to override it for staging. The unused Anthropic entry and the free Google AI entry are removed from Secrets Manager and from the deploy script. One entry is added for the service-to-service credential between Node and chat. These are plan decisions only: nothing has been changed in AWS.

**Why over alternatives:** The client ID is public by design, an explicit list of entries on the role keeps permissions narrow, and each entry costs $0.40 a month, so unused ones go.

**Rejected:** Merging the entries into one (declined by the owner on 17 Nov).

**Source:** Artifact comments, 16 to 17 Nov 2026

## 18/11/2026 — Old client box is deleted only after the new client runs successfully

**Decision:** The old client EC2 instance, its Elastic IP, volume and security group are not deleted until the new client is built and running successfully on the app box and has served all the traffic. Deletion stays the last migration step and waits for the owner's approval.

**Why over alternatives:** Deletion cannot be undone, and until the new client has carried all the traffic the old box is the way back.

**Source:** Terminal, 18 Nov 2026: "מחיקת הקליינט: לא מוחקים לפני שהקליינט החדש בנוי ורץ בהצלחה"

## 18/11/2026 — Proposed plan values approved; migration day tentatively 18 Nov

**Decision:** The values proposed in the plan are approved: the chat repository name pulse--chat, the 10-minute recovery target in the prove-recovery step, the 7-day snapshot of the client box volume before deletion, and the starting alarm thresholds. Migration day is tentatively 18 Nov 2026 (today) and is not scheduled; implementation of the compose boot, rebuilt client image and tunnel routing comes first. No migration step has been run.

**Why over alternatives:** The owner approved the proposed values and named the migration day as probably today, which means the date is a target, not an authorization to run infra changes.

**Source:** Terminal, 18 Nov 2026: "ערכים מוצעים מאושרים"; migration day "כנראה היום"

## 18/11/2026 — Box migration first, Redis and RabbitMQ after; DB window 21:00 UTC

**Decision:** The box migration ships first (boot recovery with compose, the client move, t3.small, the database class change), and Redis and RabbitMQ are added after it, so the first migration box runs cloudflared, the client and the server only. The database class change is at 11 p.m. local time, UTC+2, which is 21:00 UTC (the owner first wrote UTC+3, then chose the machine's UTC+2). The build is split into milestones in docs/AWS-MIGRATION-MILESTONES.md and the database step has a runbook in docs/RDS-CLASS-CHANGE-RUNBOOK.md. Nothing has been applied to AWS.

**Why over alternatives:** Smaller blast radius if step 1 fails, no cost change. The 21:00 UTC window does not overlap the 22:52 to 23:22 UTC automated backup window.

**Rejected:** One combined migration with Redis and RabbitMQ in step 1.

**Source:** Terminal, 18 Nov 2026, answers to the order and time offset questions

## 18/11/2026 — Compose holds only the long-lived containers; server and client keep blue/green scripts

**Decision:** The compose file defines the networks and the long-lived infrastructure containers (cloudflared now, Redis and RabbitMQ later under a broker profile). The server and the client are not in it: each keeps its own blue/green deploy script, with its health gate and rollback, and joins the networks. Boot runs compose first, then the server and client deploy scripts with the last good image tags read from Parameter Store. This refines the earlier plan wording that boot runs compose for everything.

**Why over alternatives:** The existing deploy scripts swap containers with docker run and roll back on a failed health check, which compose does not give. Keeping them avoids rebuilding a tested mechanism during the migration.

**Rejected:** Putting the server and client into the compose file too (would need a new blue/green swap and rollback).

**Source:** Terminal, 18 Nov 2026, answer to the design question

## 19/11/2026 — Real routine test users in production; passwords in .env only

**Decision:** Add a few real (not guest, not mocked) test accounts in production that perform routine actions to simulate real use and find bugs while volume is low. Their passwords are kept in a gitignored .env outside git, not in Secrets Manager.

**Why over alternatives:** Owner does not want extra secrets that cost money in Secrets Manager just for test-user passwords; guest accounts are removed by the retention service so they cannot run continuously.

**Rejected:** Secrets Manager entries for the test passwords (extra cost); guest accounts (deleted by guestRetentionService).

**Source:** Owner, terminal, 19 Nov 2026
