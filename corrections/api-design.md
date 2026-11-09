# Corrections — Api Design

⚠️ Load only when following a link from [[corrections/index]] for a specific entry, or scanning for a lesson in this topic — not routinely.

---

## 02/11/2026 — Don't add a new endpoint when an existing flow can be reused

**Correct fact:** When a gap appears (here: no way to get a new confirm-email code after a failed send), first reuse the existing endpoints and flows (confirm-email, forgot-password) and put the choice to the user before building a new route. Do not add a new endpoint just because the gap exists.

**Lesson:** Guest-mode work, 2026-11-02: I built POST /auth/resend-confirm-email (auth, CSRF, rate limited, tests, docs) after the user said to add the resend path. When the user and the client session challenged it, they said the existing confirm-email flow should be used and a new endpoint was not needed; the user called it creating something new for nothing. I had checked the code (confirm-email only verifies; the only sender of the confirm OTP is the guest upgrade) but should have raised reuse of the existing flows (confirm-email, forgot-password) and put that choice to the user before building the route.

**Source:** User, in the server guest mode session, 2026-11-02
