# Corrections — Repo Conventions (archive)

Superseded or incorrect entries moved here from [[corrections/repo-conventions]]. Not current guidance.

---

## 28/09/2026 - Version-bump tag collision across parallel branches: bump to the next free version

Two `fix` branches were open off the same base (1.4.1); each commit's post-commit hook bumped to 1.4.2. The second one's `git tag v1.4.2` failed (hook exit 128) because the first branch already owned the tag, leaving an untagged commit that duplicated the version. User: "bump to v1.4.3 and assign the correct tag. do it whenever a collision like this happens".

**Lesson:** after any commit where the post-commit hook fails with a tag collision (`git tag` exit 128 / `v<ver>` already exists), without asking: take the next free version above the highest existing `v*` tag, set it in `package.json` + `package-lock.json` (root and `packages[""]`), amend with `SKIP_VERSION_BUMP=1 git commit --amend` updating the `Version-Bump:` footer, then `git tag v<new>`. Only on unpushed commits. Expect a version-line conflict in `package.json`/lock when the second branch merges; resolve it to the higher version.

*Archived 29/09/2026 — shouldn't have been logged as a correction at all: tag collisions are normal/expected in multi-session work, not a mistake. See [[corrections/repo-conventions]].*
