# Corrections — Dev Workflow

⚠️ Load only when following a link from [[corrections/index]] for a specific entry, or scanning for a lesson in this topic — not routinely.

---

## 27/10/2026 — Check issue labels before advising on unmerged issue branches

**Correct fact:** When asked about unmerged issue branches, check the status on the issue entry first (its labels, e.g. `held-for-review`, `needs-human`) before recommending a merge. The assistant wrongly treated fix/73, fix/76 and fix/90 as ready to merge, while 73 and 90 are held-for-review and 76 is needs-human.

**Source:** user, auto-recorded: "73 and 90 are `held-for-review`, with #76 `needs-human`. next time im asking u about unmerged issue branches, you should check their status on the issue entry first"

## 28/10/2026 — Watcher asks mid-fix design questions in an artifact, not needs-human

**Correct fact:** When the watcher fixer hits a design question mid-fix (e.g. review flags a HIGH risk with a recommended option), it must post the question as an artifact on the issue, like the pre-fix plan questions, and wait for the answer. It must not label the issue needs-human and stop.

**Lesson:** User, on #76: 'if it has a question mid-fix, it should just ask it in an artifact like always. It doesn't matter if it is mid-fix or pre fix.' #76 was locked as needs-human over one simple A/B/C design choice that an artifact question would have resolved.

**Source:** user, auto-recorded: "recorded by the session"

## 28/10/2026 — Commit type chosen mechanically as feat, bumping minor

**Correct fact:** Claude labelled the #83 CloudWatch error-log shipping commit `feat`, which made the post-commit hook bump the version to 1.30.0 (minor) and pushed tag v1.30.0. Observability plumbing with no API or client change is not a feature: pick the commit type by what the change does for consumers and report the reasoning before committing, as GIT_RULES.md requires.

**Lesson:** User asked 'Why did you mark it as a feat to bump minor?' and chose to rewrite to a patch bump. GIT_RULES.md says to think about the commit type and report the reasoning, not label everything feat. The hook bumps only for feat/fix/rfc/refactor/perf (chore bumps nothing), so the type decides the version.

**Source:** user, auto-recorded: "recorded by the session"
