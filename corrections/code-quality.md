# Corrections — Code Quality

⚠️ Load only when following a link from [[corrections/index]] for a specific entry, or scanning for
context in this topic — not routinely.

---

## 10/08/2026 — Use existing time-constants (`*InMs`) instead of hardcoding ms math

Wrote `1000 * 60 * 60 * 24` in `contextBuilder.ts` for day-gap calc — should've checked `src/constants/time.ts` first, which already exports `dayInMs`. Fixed to import and use it.

**Lesson:** always check `constants/time.ts` before hardcoding ms conversions.
