# AWS Deployment

Server runs on **EC2 + RDS** in `eu-central-1` (Frankfurt), replacing Render. Client
(separate repo) is not yet deployed — planned as S3 + CloudFront.

## Live infrastructure

| Resource | Value |
|---|---|
| AWS account | `110015905368` (Bardevs) |
| EC2 instance | `i-0df518d8572bfcfd6` — `t3.small`, `35.157.40.177`, Amazon Linux 2023, encrypted 30GB gp3 root volume |
| RDS instance | `pulse-db` — `pulse-db.cpwwgeuy62ph.eu-central-1.rds.amazonaws.com:5432`, Postgres 17.10, `db.t3.micro`, encrypted, deletion-protected, not publicly accessible |
| Domain | `pulserehab.app` (Cloudflare DNS, proxied, SSL mode: Flexible) → client's EC2 public IP. Client is the public front door, proxying `/api/:path*` to this server's EC2 over the private VPC — this server's public IP is not the domain target anymore. |
| EC2 security group | `sg-0c263224f1d77df26` — SSH (22) restricted to operator's IP only, HTTP/HTTPS (80/443) open |
| RDS security group | `sg-0d6e9cdd1a065d584` — Postgres (5432) restricted to the EC2 security group only, no public CIDR |
| IAM role (EC2) | `pulse-ec2-role` / instance profile `pulse-ec2-instance-profile` — `secretsmanager:GetSecretValue` on exactly the secrets below, `AmazonSSMManagedInstanceCore` (for SSM Run Command), and ECR pull scoped to `pulse-server-app` only |
| IAM role (GitHub Actions) | `pulse-server-gh-deploy-role` — assumable only via OIDC by `repo:BarcDevs/HealEase--server:ref:refs/heads/main`; scoped to ECR push on `pulse-server-app` and `ssm:SendCommand`/status reads on the one EC2 instance. No static AWS keys in GitHub. |
| CloudTrail | `pulse-trail`, multi-region, logging to `pulse-cloudtrail-logs-110015905368` (log file validation on) |
| ECR | `pulse-server-app` — image scanning on push, AES256 encryption |

## Secrets (AWS Secrets Manager, eu-central-1)

| Secret name | Contents |
|---|---|
| `pulse/rds/master-credentials` | `{"username": "pulse_admin", "password": "..."}` |
| `pulse/app/jwt-secret` | Raw JWT signing secret |
| `pulse/app/ANTHROPIC_API_KEY` | Raw key |
| `pulse/app/GOOGLE_AI_API_KEY` | Raw key |
| `pulse/app/GOOGLE_FREE_AI_API_KEY` | Raw key |
| `pulse/app/OPENAI_API_KEY` | Raw key |
| `pulse/app/GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `pulse/app/GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

`GOOGLE_REDIRECT_URI` is not a secret — passed as a plain (non-Secrets-Manager) env
var in `ec2-redeploy.sh`'s `RUN_ARGS` (`https://pulserehab.app/api/v1/auth/google/callback`),
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

1. SSH in: `ssh -i ~/.ssh/pulse-ec2-key.pem ec2-user@35.157.40.177`
2. Pull the latest pushed images and run the same script CI uses:
   ```bash
   sudo bash /tmp/redeploy.sh <image-tag>   # or fetch scripts/deploy/ec2-redeploy.sh and run it directly
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
