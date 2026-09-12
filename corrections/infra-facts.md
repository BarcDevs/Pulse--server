# Corrections — Infra Facts

⚠️ Load only when following a link from [[corrections/index]] for a specific entry, or scanning for
context in this topic — not routinely.

---

## 10/08/2026 — DB is RDS, not Neon

Neon was fully replaced during the AWS migration — don't reference it as current infra.

---

## 10/08/2026 — CI/CD pushes images to ECR, not S3

S3 was only ever the *planned* client hosting; it never shipped that way.

---

## 10/08/2026 — Client is deployed on its own EC2+Docker instance, not S3+CloudFront

`docs/DEPLOYMENT.md` still describes the old S3+CloudFront plan for the client — it's stale. Actual: client EC2 is the public front door (`pulserehab.app`), proxies `/api/:path*` to the server EC2 over private VPC. Both client and server use the same ECR + SSM blue/green deploy pattern. Source of truth for current client infra: `pulse--client/CLAUDE.md` and `pulse--client/README.md`, not `pulse--server/docs/DEPLOYMENT.md`.

---

## 10/08/2026 — Domain DNS is Cloudflare, not Route53

`pulserehab.app` is registered/managed in Cloudflare (proxied, SSL mode Flexible) pointing at EC2 public IP — no R53 involved.
