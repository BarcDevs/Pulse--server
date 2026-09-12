# Corrections — Claims & Verification

⚠️ Load only when following a link from [[corrections/index]] for a specific entry, or scanning for
context in this topic — not routinely.

---

## 02/09/2026 — Told the user AWS cost would be "nearly free" without checking combined infra cost

Only reasoned about marginal CI/CD pipeline run cost (SSM calls, image pushes — genuinely near-free), never surfaced that two always-on EC2 instances plus RDS plus a NAT Gateway is a real recurring baseline cost regardless of CI/CD, or that AWS's 750hr/month free-tier EC2 pool is *shared across all instances on the account combined*, not per-instance — running two instances 24/7 blows past it (confirmed: ~1,262 combined hours vs. 750hr cap that month). Real August bill was $63.78. Should have proactively flagged expected monthly baseline cost (EC2+RDS+NAT, roughly $50-65/mo for this stack) at the point the second EC2 instance (client) went live, not waited for a surprise invoice.

**How to apply:** whenever a session adds or confirms a second concurrently-running billable resource (a new EC2 instance, RDS instance, etc.), proactively note the combined free-tier-hour math and expected recurring cost — don't only cost out the specific change being made in isolation.

---

## 07/09/2026 — Marked a bug "Fixed"/resolved before deploying or actually testing the fix

Google OAuth secrets fix (Secrets Manager + IAM + config changes) was logged as done in `TODO.md` and `decisions.md` the same turn it was written, with no deploy and no login flow ever run. User caught it.

**How to apply:** never mark a bug resolved/strike it through until it's been deployed AND actually verified working (run the flow, check the log/output) — root-causing + patching is "fix implemented, pending verification," not "fixed." Use that exact phrasing in TODO/decisions until verification actually happens.
