# TODO

## CRITICAL

- **Single EC2 instance, no Auto Scaling Group — no automatic recovery if the instance dies.**
  Deploy currently targets a fixed EC2 instance ID via SSM Run Command
  (`scripts/deploy/ec2-redeploy.sh`, `docs/DEPLOYMENT.md`). If that instance fails outright
  (not just the container — the VM itself), there's no automated replacement; recovery
  depends on someone noticing and fixing it manually, which could take hours.
  Fix: move to an Auto Scaling Group with `min=1/desired=1/max=2` — steady-state cost stays
  the same as today (1 instance), the `max=2` only gives headroom for a brief overlap during
  instance replacement, it doesn't double the baseline bill. Requires updating the deploy
  script to target the ASG instead of a fixed instance ID, and handling the IP change on
  instance replacement (Elastic IP re-association, or a health-check-based DNS update in
  Cloudflare) since the current setup assumes a static IP. See `decisions/decisions.md`
  (2026-08-13 entry) for the full reasoning.
  Confirmed 2026-09-02: manually stop/resize/start of the pulse-server EC2 instance (no ASG
  involved) changed its public IP (35.157.40.177 → 18.199.102.66) with no Elastic IP attached,
  yet `pulserehab.app` resolved and served correctly right after — DNS is Cloudflare-proxied,
  and origin already reflected the new IP. Cause of that (fast Cloudflare propagation vs. some
  existing boot-time origin-update mechanism) is unconfirmed — verify before relying on it for
  an ASG replacement event, since that's a more disruptive IP change than this manual resize.
  RDS has its own separate HA mechanism (Multi-AZ), not ASG — out of scope for this item.
  Decided 2026-09-02: fix for the IP-change problem is an Elastic IP (~$3.60/mo,
  Feb 2024 flat $0.005/hr public-IPv4 rate), re-associated to whichever instance is
  current via an ASG lifecycle hook — not Route53, which is redundant since Cloudflare
  already handles DNS/proxy. Skip adding the EIP until ASG is actually implemented;
  no cost/benefit to adding it while still on a single manually-managed instance.

## FEATURES

- **RAG-based semantic scoring for `/forum/recommendations`.**
  `computeSemanticSimilarity` (`src/lib/recommendations/scoring.ts:50-61`) is misnamed —
  it's Jaccard token overlap, not real semantic matching, so it fails on paraphrases
  (e.g. "can't sleep" vs. "insomnia" tag). Swap for embedding cosine similarity: embed
  post title+body on create (backfill via batch/cron), embed `keyIssueTags` per request,
  replace Jaccard in `scorePost`. pgvector confirmed viable on current RDS instance;
  embedding model and vector DB approach already picked. See `decisions/decisions.md`
  (2026-08-11 and 2026-08-12 entries) for full reasoning, scope, and model choice.

## BUGS

- **Google OAuth login broken since the AWS deploy — fix implemented, NOT yet verified.**
  Root cause: `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` never migrated to Secrets
  Manager, so prod container had no Google OAuth env vars. Secrets created, IAM
  updated, `ec2-redeploy.sh` + `config/production.ts` patched, PR not yet merged/
  deployed. Still needed before calling this resolved:
  1. Confirm `https://pulserehab.app/api/v1/auth/google/callback` is in the
     Authorized redirect URIs list on the Google Cloud Console OAuth client
     (not CLI-reachable).
  2. Merge PR, let it deploy, then actually run the login flow against prod
     and confirm it succeeds end-to-end.

* create a monitor agent for production to catch any unexpected errors and fix them, 
  then create a PR and notify dev, while also recording it in a doc, and checking - 
  if it is a reoccurring issue, the fix should already be recorded then no need to invent a new one