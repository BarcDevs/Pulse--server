# AWS Deployment

Server runs on **EC2 (behind an Auto Scaling Group) + RDS** in `eu-central-1` (Frankfurt),
replacing Render. Client (separate repo) runs on its own EC2+Docker instance.

Full history of the ASG/fixed-IP migration (why, and how each step was done/verified):
`docs/ASG-MIGRATION.md`.

## Live infrastructure

| Resource | Value |
|---|---|
| AWS account | `110015905368` (Bardevs) |
| Server ASG | `pulse-server-asg` (min=max=1, `subnet-0efbb5ecf1bd12185`), launch template `pulse-server-lt` (`lt-02283631f77464afa`), `t3.micro`. Replaces a standalone instance — the ASG re-launches automatically on failure. |
| Server fixed private IP | `172.31.16.100` — a dedicated secondary ENI (`eni-0a923c09357bb745b`) the ASG instance attaches to itself at boot (`scripts/deploy/asg-boot.sh`), so this address survives instance replacement. The client's `/api` proxy is baked to this IP. |
| RDS instance | `pulse-db` — `pulse-db.cpwwgeuy62ph.eu-central-1.rds.amazonaws.com:5432`, Postgres 17.10, `db.t3.micro`, encrypted, deletion-protected, not publicly accessible |
| Domain | `pulserehab.app` (Cloudflare, proxied) → Cloudflare Tunnel → client EC2 (`cloudflared` container, outbound-only; token in `pulse/client/CLOUDFLARE_TUNNEL_TOKEN`). The client SG has no public 80/443 ingress. The client's Elastic IP `52.58.214.220` (`eipalloc-000be881665f41959`) is no longer on the request path. Client is the public front door, proxying `/api/:path*` to the server's fixed private IP over the private VPC. |
| EC2 security group (server) | `sg-0c263224f1d77df26` — SSH (22) restricted to operator's IP only, HTTP (80) from the client SG (`sg-02ad243011d768866`) only |
| RDS security group | `sg-0d6e9cdd1a065d584` — Postgres (5432) restricted to the EC2 security group only, no public CIDR |
| IAM role (EC2, server) | `pulse-ec2-role` / instance profile `pulse-ec2-instance-profile` — `secretsmanager:GetSecretValue` on exactly the secrets below, `AmazonSSMManagedInstanceCore` (for SSM Run Command), ECR pull scoped to `pulse-server-app`, and `pulse-eni-attach` (attach/detach on the fixed ENI only, for the ASG boot script) |
| IAM role (GitHub Actions) | `pulse-server-gh-deploy-role` — assumable only via OIDC by `repo:BarcDevs/HealEase--server:ref:refs/heads/main`; scoped to ECR push on `pulse-server-app` and `ssm:SendCommand` on the `AWS-RunShellScript` document plus any instance tagged `Name=pulse-server` (so the ASG replacing the instance doesn't need a workflow change). No static AWS keys in GitHub. |
| CloudTrail | `pulse-trail`, multi-region, logging to `pulse-cloudtrail-logs-110015905368` (log file validation on) |
| ECR | `pulse-server-app` — image scanning on push, AES256 encryption |

## Secrets (AWS Secrets Manager, eu-central-1)

| Secret name | Contents |
|---|---|
| `pulse/rds/master-credentials` | `{"username": "pulse_admin", "password": "..."}`. Migrations only |
| `pulse/rds/app-credentials` | `{"username": "pulse_app", "password": "..."}`. Least-privilege user the app container connects as (data read/write, no DDL). Created by `scripts/security/create-app-db-user.sh`; until it exists, `ec2-redeploy.sh` falls back to the master user and logs a warning |
| `pulse/app/jwt-secret` | Raw JWT signing secret |
| `pulse/app/ANTHROPIC_API_KEY` | Raw key |
| `pulse/app/GOOGLE_AI_API_KEY` | Raw key |
| `pulse/app/GOOGLE_FREE_AI_API_KEY` | Raw key |
| `pulse/app/OPENAI_API_KEY` | Raw key |
| `pulse/app/GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `pulse/app/GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `pulse/app/RESEND_API_KEY` | Resend API key (sending access), passed as `EMAIL_PASSWORD`; SMTP host/port/user/from live in `config/default.ts` |

`GOOGLE_REDIRECT_URI` is not a secret — passed as a plain (non-Secrets-Manager) env
var in `ec2-redeploy.sh`'s `RUN_ARGS`, built from `API_VERSION` (defaults to
`SERVER_API_VERSION`, currently `v2`) as `https://pulserehab.app/api/$API_VERSION/auth/google/callback`,
not hardcoded in `config/production.ts`. Both AWS prod and the Render staging
instance run `NODE_ENV=production` and share `config/production.ts` — hardcoding
one URL there would break whichever environment didn't match it.

The EC2 instance role can read all of these directly — no keys live in `.env` files
or shell history on the box itself.

## DATABASE_URL format

RDS enforces SSL by default. The connection string must include:

```
postgresql://<user>:<pass>@<rds-endpoint>:5432/pulse?uselibpqcompat=true&sslmode=require
```

Omitting the query params fails with a misleading Prisma error
(`User was denied access on the database`) — the real cause is `pg` rejecting the
plaintext connection, not a permissions problem.

## Redeploy — automated (CI/CD)

`.github/workflows/deploy.yml` runs automatically on every successful `CI` run on
`main`. It:

1. Builds the `runner` and `builder` (migrate) Docker targets and pushes both to ECR
   (`pulse-server-app`, tagged `runner-<sha>` / `migrate-<sha>` and `-latest`).
2. Authenticates to AWS via GitHub's OIDC provider — assumes
   `pulse-server-gh-deploy-role`, scoped to `repo:BarcDevs/HealEase--server:ref:refs/heads/main`
   only, no long-lived AWS keys stored in GitHub.
3. Triggers `scripts/deploy/ec2-redeploy.sh` on the EC2 box via **SSM Run Command**
   (no SSH port exposure, no key material in CI). The script refuses to run any
   migration containing a `DROP`/`RENAME` (destructive changes ship manually under
   a maintenance window — expand/contract only for auto-deploy), then runs
   migrations from the `migrate` image, starts the new `runner` image as a
   candidate on a staging port, gates it on **`/api/ready`** (a real DB query —
   `/api/status` alone returns 200 even with a broken `DATABASE_URL`), and only
   then swaps it into production. If the swapped-in container fails its own
   health check, the previous container is restored automatically.
4. The workflow polls the SSM command status and fails the job (with stderr surfaced)
   if the redeploy or health check fails.
5. A final step curls `https://pulserehab.app/api/status` through Cloudflare as an
   end-to-end check.

So: merge to `main` (through the usual CI-gated `aws-deploy` → `development` → `main`
hops — see `GIT_RULES.md`) and the redeploy happens automatically. Nothing to do by hand.

### Manual redeploy (fallback, e.g. CI/CD itself is broken)

The server sits behind an ASG now, so its instance id and public IP can change on replacement —
look it up first: `aws ec2 describe-instances --filters Name=tag:Name,Values=pulse-server
Name=instance-state-name,Values=running --query 'Reservations[].Instances[].[InstanceId,PublicIpAddress]'`.

1. SSH in: `ssh -i ~/.ssh/pulse-ec2-key.pem ec2-user@<public-ip-from-above>`
2. Pull the latest pushed images and run the redeploy script (already baked into the AMI at
   `/opt/pulse/redeploy.sh` — see `docs/ASG-MIGRATION.md`):
   ```bash
   sudo bash /opt/pulse/redeploy.sh <image-tag>   # or fetch scripts/deploy/ec2-redeploy.sh and run it directly
   ```
   (Needs a tag that was already pushed to ECR — use `latest` if unsure, or build and
   push manually with `docker build --target runner|builder` + `docker push`.)
3. Verify: `curl https://pulserehab.app/api/status` and a real DB-backed route (health
   checks alone don't catch DB/SSL misconfiguration — confirmed the hard way).

## Known build-time gotchas

- **Prisma generator module format** — `prisma-client` (the generator in
  `prisma/schema.prisma`) defaults to ESM/TS-native output that `require()`s sibling
  `.ts` files directly, assuming a bundler or TS-native runtime. Fixed by pinning
  `moduleFormat = "cjs"` on the generator.
- **Explicit `.ts` extensions in generated imports** — even with `moduleFormat = "cjs"`,
  the generated client's `require()` calls use literal `.ts` extensions
  (`require("./internal/class.ts")`), which plain `tsc` (Node10 resolution) doesn't
  rewrite. Fixed with `rewriteRelativeImportExtensions: true` in `tsconfig.json`
  (TS 5.7+), and `prisma/generated` added to tsconfig's `include` so tsc actually
  compiles it into `dist/`.
- **Jest can't resolve those same extensions** — ts-jest applies the same
  `rewriteRelativeImportExtensions` setting during its own transform, so by the time
  Jest's resolver sees the import it's already rewritten to `.js` — but the raw
  generated source tree (used directly by ts-jest, not the compiled `dist/`) has no
  `.js` files, only `.ts`. Fixed with a `moduleNameMapper` in both `jest.config.ts` and
  `jest.integration.config.ts` stripping `.ts`/`.js` from relative import specifiers
  before Jest resolves them.
- **Webpack is gone** — the old `start:prod`/`prod` scripts and full webpack toolchain
  were Render-only leftovers; `tsc` is the only bundler now (see `Dockerfile`'s
  `builder` stage). `prisma` (the CLI) lives in `devDependencies`, not `dependencies` —
  the runner image's `npm ci --omit=dev` drops it, and migrations run from the
  `builder` target instead (full devDependencies), as a one-off step before rolling
  out the runner image.

## Not yet done

- `staging.pulserehab.app` — not yet configured.
- AWS Activate / startup credits — domain and AWS account are both recent, worth
  applying once there's a concrete product description to submit.
