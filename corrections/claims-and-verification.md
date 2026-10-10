# Corrections — Claims & Verification

⚠️ Load only when following a link from [[corrections/index]] for a specific entry, or scanning for
context in this topic — not routinely.

---

## 02/09/2026 — Told the user AWS cost would be "nearly free" without checking combined infra cost

Only reasoned about marginal CI/CD pipeline run cost (SSM calls, image pushes — genuinely near-free), never surfaced that two always-on EC2 instances plus RDS plus public IPv4 addresses (originally mislabelled a NAT Gateway, corrected 26/09/2026) is a real recurring baseline cost regardless of CI/CD, or that AWS's 750hr/month free-tier EC2 pool is *shared across all instances on the account combined*, not per-instance — running two instances 24/7 blows past it (confirmed: ~1,262 combined hours vs. 750hr cap that month). Real August bill was $63.78. Should have proactively flagged expected monthly baseline cost (EC2+RDS+public IPv4, roughly $50-65/mo for this stack) at the point the second EC2 instance (client) went live, not waited for a surprise invoice.

**How to apply:** whenever a session adds or confirms a second concurrently-running billable resource (a new EC2 instance, RDS instance, etc.), proactively note the combined free-tier-hour math and expected recurring cost — don't only cost out the specific change being made in isolation.

---

## 07/09/2026 — Marked a bug "Fixed"/resolved before deploying or actually testing the fix

Google OAuth secrets fix (Secrets Manager + IAM + config changes) was logged as done in `TODO.md` and `decisions.md` the same turn it was written, with no deploy and no login flow ever run. User caught it.

**How to apply:** never mark a bug resolved/strike it through until it's been deployed AND actually verified working (run the flow, check the log/output) — root-causing + patching is "fix implemented, pending verification," not "fixed." Use that exact phrasing in TODO/decisions until verification actually happens.

---

## 24/09/2026 — Told the user to restore a form field to a past value without asking what it represented

Comparing a resubmitted AWS Activate form against the earlier one, I saw "annual marketing spend" had gone from `< $250,000` to empty and told the user to set it back, assuming the earlier value was intentional. User corrected: they spend nothing on marketing and the earlier value was the mistake.

**How to apply:** when a value differs from a previous version of a form or config, flag the difference and ask which is correct — don't assume the older value is the right one. Never guess a factual answer about the user's own business (spend, revenue, headcount).

---

## 26/09/2026 — Called the VPC charge a "NAT Gateway" without checking usage types

The $7.74 August VPC line (and later the September one) was repeated across sessions as "VPC/NAT Gateway" and even offered as a saving to investigate ("is the NAT Gateway needed?"). Cost Explorer usage types show it is 100% `PublicIPv4:InUseAddress` (2 addresses × $0.005/hr) and `describe-nat-gateways` returns none.

**How to apply:** name a cost line only after grouping it by USAGE_TYPE (or checking the resource exists); never label a service's charge from what that stack usually contains. Also, two public IPv4 addresses cost ~$7/mo — the client and server instances each carry one.

---

## 26/09/2026 — Planned "Elastic IP on the server" without reading how traffic actually reaches it

Across several turns I framed the server's changing public IP as the ASG blocker, called the reason the site survived the resize an unconfirmed "Cloudflare mechanism", and priced an EIP on `pulse-server`. `docs/DEPLOYMENT.md` line 13 already documented the answer: Cloudflare points at the **client** instance's public IP, and the client proxies `/api` to the server over its **private** IP, which is baked into the client build (`NEXT_PUBLIC_SERVER_URL=http://172.31.25.240:80` in `pulse--client/.github/workflows/deploy.yml`). The server's public IP is used by nothing, so an EIP there fixes nothing; the real risks are the client's public IP (site down if the client restarts) and the server's private IP (client breaks if an ASG replaces the server).

**How to apply:** before designing HA/IP-stability changes, read the deployment doc's topology and grep the callers (client workflow/config) for the address in question. Don't call a mechanism "unconfirmed" while the repo's own docs state it.

---

## 10/10/2026 — Credited the monitor agent to the owner and dated it today without checking

Asked to resolve the "Monitor agent for production errors" TODO, I wrote "resolved 10/10/2026, built by the owner" in `TODO.md` from the user's words "i already built it", without checking who built it or when. The user corrected it: it was not built by them and not today; it was built by the `aws-monitor` session. `git log -- scripts/monitor` shows the scripts first added 29/09/2026 (e3e764c) and last changed 09/10/2026.

**How to apply:** before recording who built something or when, read the history (`git log` dates and `Claude-Session` trailers) or ask. "I built it" from the user can mean work done by their agent sessions, and a record that names an author or date is a claim that needs a source.
