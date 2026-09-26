# ASG + fixed IP migration

Goal: server instance auto-replaces on failure without breaking the site. Cost ~$0/mo
(see `decisions/deployment-and-infra.md`, 26/09/2026 entries).

## Topology (why the plan looks like this)

- Cloudflare → client instance public IP (`63.186.185.244`, auto-assigned, no EIP).
- Client proxies `/api` → server **private** IP, baked into the client build.
- Server private IP is stable across stop/start but changes if an ASG replaces the instance.
- `deploy.yml` hard-codes the server instance id.

## Plan

| # | Step | Touches prod? | Status |
|---|---|---|---|
| 1 | Create ENI `172.31.16.100` in `subnet-0efbb5ecf1bd12185` (eu-central-1a), SG `sg-0c263224f1d77df26` | no | **done** — `eni-0a923c09357bb745b` |
| 2 | IAM: `pulse-eni-attach` inline policy on `pulse-ec2-role` (Describe/Attach/DetachNetworkInterface) | no | **done** — `pulse-eni-attach` on `pulse-ec2-role`, ENI-scoped attach/detach + describe |
| 3 | Write `ec2-redeploy.sh` (LF endings) to `/opt/pulse/redeploy.sh` on the server via SSM (md5 + `bash -n` verified), then `create-image --no-reboot` | no | **done** — `ami-000672e5d9f671209` (`pulse-server-base-20260926c`) |
| 4 | Launch template: AMI from 3, `scripts/deploy/asg-boot.sh` as user data (ENI id substituted), same SG/role/type/IMDSv2 | no | **done** — `lt-02283631f77464afa` (`pulse-server-lt`, default v3 = LF-fixed AMI + `asg-boot.sh` as user data), t3.micro, key `pulse-ec2-key`, profile `pulse-ec2-instance-profile`. |
| 5 | `deploy.yml` targets `Key=tag:Name,Values=pulse-server` and resolves the instance id from the command invocation. `pulse-server-gh-deploy-role` policy `pulse-server-deploy`: `SSMDeployCommand` split into `SSMDeployDocument` (the `AWS-RunShellScript` document) + `SSMDeployTaggedInstances` (`instance/*`, condition `aws:ResourceTag/Name = pulse-server`, strict `StringEquals`) | no | **done** — workflow edit uncommitted; not exercised until the next deploy |
| 6 | Client: EIP on `i-0d9e9912236e3851c`; Cloudflare origin → EIP (wrangler) | brief | needs quiet window |
| 7 | Client rebuild with server IP `172.31.16.100` | yes | needs quiet window |
| 8 | Create ASG min=max=1, single subnet, launch template from 4; retire the standalone instance | yes | needs quiet window |

## Notes

- ENI is a secondary interface (device index 1); AL2023 `amazon-ec2-net-utils` sets up policy routing.
- `ec2-redeploy.sh` is baked into the AMI at `/opt/pulse/redeploy.sh`. Re-bake the AMI and add a launch-template version whenever it changes.
- `asg-boot.sh` waits for the ENI to free up (old instance terminating), force-detaches after 5 min.
- Boot redeploy uses `runner-latest`/`migrate-latest`; deploy script already tolerates that tag.
- Current server AMI is the ECS/neuron AMI (see 13/09/2026 decision) — the new AMI bakes docker + script only.
- `docs/DEPLOYMENT.md` is stale (`t3.small`, old IP); refresh after step 8.

- Deploy role scope now depends on the `Name=pulse-server` tag: anyone who can tag an instance that way can receive deploy commands. The client instance is `pulse-client-app`, so it stays out of scope. Previous scope was the single instance ARN `i-0df518d8572bfcfd6`.
- If two instances carry the tag at once (ASG overlap), `send-command` hits both; the workflow only follows the first.

## Incident log

- **26/09/2026 — CRLF in baked script.** First two AMIs (`ami-03bf5266…`, `ami-01734610…`) contained `/opt/pulse/redeploy.sh` with CRLF line endings, because the Windows working copy of `ec2-redeploy.sh` was CRLF and was base64'd as-is. `bash -n` failed on the server (`syntax error near unexpected token '{'`), so an ASG boot from those AMIs would have failed. Caught before any instance launched from them. Fixed by re-writing the file with CRs stripped, re-baking (`c`), template v3, deleting the bad AMIs/snapshots/versions, and adding `*.sh text eol=lf` to `.gitattributes`. CI deploys were never affected (Linux checkout).
- **Lesson:** verify a baked artifact on the box (`bash -n`, md5 vs the LF copy) before baking it into an AMI.
- **Step 6 blocker:** wrangler's OAuth token has `zone (read)` only and no DNS-record command, so the Cloudflare origin edit can't be done through wrangler as first assumed.
