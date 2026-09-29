# Corrections — Code Quality

⚠️ Load only when following a link from [[corrections/index]] for a specific entry, or scanning for
context in this topic — not routinely.

---

## 10/08/2026 — Use existing time-constants (`*InMs`) instead of hardcoding ms math

Wrote `1000 * 60 * 60 * 24` in `contextBuilder.ts` for day-gap calc — should've checked `src/constants/time.ts` first, which already exports `dayInMs`. Fixed to import and use it.

**Lesson:** always check `constants/time.ts` before hardcoding ms conversions.

---

## 27/09/2026 — Used a Python heredoc to edit a doc file, repeating a logged correction

Ran `python3 - <<EOF` to insert a runbook status line in `docs/ASG-MIGRATION.md`, immediately after having logged the same mistake in the client repo's own corrections log earlier this session.

**Lesson:** the correction has to actually change behavior, not just get filed. Use the Edit tool for text edits, full stop — checking "have I done this before" against the correction I just wrote would have caught it in time.
