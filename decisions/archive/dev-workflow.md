# Decisions — Dev Workflow (archive)

Superseded entries moved here from [[decisions/dev-workflow]]. Not current guidance.

---

## 18/10/2026 — The fixer routine also works issues the owner files as `task`s

**Problem:** The issue-based flow only covered errors the watcher found. The owner wanted to file a bug or feature as a GitHub issue from the phone, instead of opening the IDE, and get a plan, then a fix, then only the `development` -> `main` PR to approve.

**Decision:** `prod-error-fixer.md` handles two kinds of issue: watcher issues (`prod-error`) and owner tasks (label `task`, author must be the owner; anyone else's issue is ignored). The same lifecycle applies: plan page, questions parked on the issue, approval by the owner's `approved` label, subagent per fix, full review, ship. For a task the watcher's "small, localized fix" gate is dropped, because the owner's approval of the plan authorises its scope; a migration is allowed but must be named in the plan and PR. A task has no prod-errors record. It must also follow `CLAUDE.md` and `CORE_RULES.md` (read explicitly, they don't auto-load in a routine).

**Why over alternatives:** a separate routine for tasks would duplicate the plan/approval/ship machinery and the safety checks. Keeping the owner-only author check and the approval label as the single authorisation means opening the repo to issues from others later can't start unreviewed work.

**How to apply:** to file work, open an issue, add the `task` label, and wait for the plan comment. Later, if collaborators are added, keep the author check.

_archived 18/10/2026 — superseded the same day: the owner wanted every issue treated the same, with no separate `task` kind or label._
