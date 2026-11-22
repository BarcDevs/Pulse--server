# Corrections — Claude Behavior

⚠️ Load only when following a link from [[corrections/index]] for a specific entry, or scanning for a lesson in this topic — not routinely.

---

## 18/11/2026 — Don't present my own design as the user's decision

**Correct fact:** When listing which review findings conflict with the user's decisions, I said finding #4 (chat reading user context from Redis) conflicted with their decision. The user never decided Redis for chat: they only talked about prompt (token) caching and per-user context sent to chat. The "Shared user context for chat" Redis row was my own design.

**Lesson:** Before saying something conflicts with a decision, check that the user actually made that decision in their own words, not a design I proposed. Otherwise the user is blamed for a choice they never made and decisions get overstated.

**Source:** Terminal, 18 Nov 2026: "לא אמרתי redis לצאט. דיברתי רק על token cache והקשרים של היוזר"

## 18/11/2026 — OPEN means open for the user, not a check Claude carries out

**Correct fact:** In the plan page, the OPEN tag and the Open questions box list only what needs the user's decision or answer. Checks and tasks that Claude carries out are tagged "to check", and a decision that was made is removed from the open list.

**Lesson:** The user said an item that is open for Claude is not open for them, and that decided items should leave the open list.

**Source:** Terminal and artifact comments, 17 to 18 Nov 2026
