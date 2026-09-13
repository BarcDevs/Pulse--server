# Decisions — Deployment & Infra

⚠️ Load only when following a link from [[decisions/index]] for a specific entry, or scanning for
context in this topic — not routinely.

---

## 13/08/2026 — Single EC2 instance has no automated recovery (flagged as CRITICAL TODO)

**Problem:** Surfaced during architecture-interview prep, not from a production incident. Production deploy targets one fixed EC2 instance (`i-0df518d8572bfcfd6`), addressed by instance ID via SSM Run Command in `ec2-redeploy.sh`. The blue/green swap logic protects against a *bad deploy*, but there's no protection if the EC2 instance itself dies (hardware fault, host maintenance, etc.) — no Auto Scaling Group, no automated replacement. Recovery today means someone notices and fixes it by hand.

**Decision:** Move to an Auto Scaling Group with `min=1/max=1/desired=1`. This is not deferred for cost reasons — an ASG at desired=1 costs exactly the same as the standalone EC2 instance today, AWS doesn't charge for the ASG control plane itself. It's deferred because the current deploy pipeline assumes a static instance ID and a static IP, both of which break under ASG-managed replacement.

**Why this approach over alternatives:** A full multi-instance + Application Load Balancer setup was considered and rejected as premature — it solves a scaling problem we don't have yet, on top of the recovery problem we do have. `min=1/max=1` gets automated recovery (the actual gap) without taking on load-balancing complexity that isn't needed at current traffic.

**How to apply:** When picked up — (1) update `ec2-redeploy.sh`/the GitHub Actions workflow to target the ASG rather than a fixed instance ID for SSM Run Command, (2) handle the IP change on instance replacement: either re-associate a fixed Elastic IP to the new instance on launch, or move to a health-check-based DNS update in Cloudflare. Tracked as CRITICAL in `TODO.md`.

**02/09/2026 follow-up — capacity, EC2 rightsizing, and IP-stability approach:**

**Problem:** August AWS invoice came in at $63.78 (unexpected to the user). Root cause traced via Cost Explorer, not guessed: two EC2 instances ran concurrently all month — `pulse-client-app` (t3.micro) and `pulse-server` (t3.small, `i-0df518d8572bfcfd6`) — for a combined ~1,262 running-hours against the account's shared 750hr/month free-tier pool, so ~512 hours billed at full rate ($23.02 of the $28.10 EC2 charge, confirmed by matching per-instance-type cost breakdown: $7.28 micro + $15.73 small). The account's `get-free-tier-usage` API showed no free-tier credit actually applied to EC2 or RDS at all this cycle (only AWS Glue), separate from the general "T3.small is Free-Plan-eligible" marketing claim on AWS's docs, which describes plan eligibility, not a guarantee of zero cost past the shared hour quota. Remaining EC2 cost is EBS volume storage, not compute hours. RDS ($19.94) and VPC/NAT Gateway ($7.74, never free-tier eligible) are separately billed baseline costs, unrelated to CI/CD pipeline runs (those cost fractions of a cent — SSM calls + image pushes).

**Decision 1 — correct the `min=1/max=1` ASG sizing from the 13/08/2026 entry to `min=1/desired=1/max=2`.** `max=2` only provides headroom for a brief overlap during an unhealthy-instance replacement event — steady-state cost stays identical to today's single instance, it does not double the baseline bill. (Original entry is being kept as-is above for history; this note is the correction of record.)

**Decision 2 — downsized `pulse-server` from t3.small to t3.micro** (stop → modify-instance-attribute → start), since the instance currently carries no real traffic besides UptimeRobot's health check. Saves roughly half the instance's compute cost (~$15.73 → ~$7.28/mo at similar hours) and reduces the account's combined free-tier-hour pressure. Verified live afterward: `curl https://pulserehab.app/api/status` returned successfully post-restart. Tradeoff: t3.micro halves available RAM (2GB → 1GB) vs t3.small — acceptable pre-/early-launch, but Prisma connection pool memory should be watched via CloudWatch once real traffic starts, and resized back up if sustained memory pressure appears.

**Decision 3 — confirmed the resize surfaced the ASG IP-change risk is real, and settled the fix: Elastic IP over Route53, deferred until ASG exists.** The manual stop/start changed the instance's public IP (35.157.40.177 → 18.199.102.66) with no Elastic IP attached; the site stayed reachable because DNS is Cloudflare-proxied and the origin record already reflected the new IP by the time of the check — the exact mechanism for that (fast Cloudflare propagation vs. some existing update-on-boot step) was not identified, so it should not be assumed reliable for a future ASG replacement event, which is a more disruptive IP swap than a manual resize.

Evaluated three options for the underlying IP-stability problem:
- **Current state (dynamic IP, relying on Cloudflare to stay in sync):** $0 extra cost, but the actual sync mechanism is unconfirmed — real risk once ASG exists.
- **Elastic IP:** confirmed via AWS Pricing API at the flat post-Feb-2024 rate, $0.005/hr (~$3.60/mo) for any public IPv4, attached or idle — replacing the old "first EIP free" rule. Solves the problem directly: same IP persists across instance replacement via an ASG lifecycle-hook re-association script, Cloudflare's origin record is set once and never needs to change again.
- **Route53:** confirmed via AWS Pricing API at $0.50/mo per hosted zone + $0.40/million queries (trivial at current traffic) — cheap in isolation, but redundant, since Cloudflare already provides the DNS/proxy layer Route53 would add. Route53 only earns its place if paired with health-check-triggered failover routing, which duplicates what an Elastic IP + lifecycle hook already solves more simply. Confirmed via `list-hosted-zones` (empty) and Cost Explorer ($0.00 for August) that Route53 isn't in use and cost nothing this cycle.

**Why this approach over alternatives:** Elastic IP is the direct fix (removes the need for anything to "stay in sync" at all) at negligible cost; Route53 was considered and rejected as redundant given Cloudflare is already the DNS layer in use.

**How to apply:** Add the Elastic IP only when the ASG work from the original 13/08/2026 entry is actually implemented — no cost or benefit to adding it while still on a single manually-managed instance. Tracked alongside the ASG item in `TODO.md`.

**Confirmed via Billing console (Free Tier page), not just the API:** only 3 service offerings show as free-tier-tracked on this account at all — KMS, Glue, SNS, all trivial and unrelated to compute. EC2, RDS, and VPC/NAT don't appear on the Free Tier usage page whatsoever, meaning the August EC2+RDS charges were never partially offset by free tier and never could have been, regardless of instance type or hours run — this account simply isn't enrolled/tracked for free tier on those services, full stop. Rules out any remaining theory that instance-type eligibility (t3.small vs. t3.micro) was the deciding factor.

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
