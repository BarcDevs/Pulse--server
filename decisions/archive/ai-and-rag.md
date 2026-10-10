# Decisions — AI Providers & RAG (archive)

Superseded entries moved here from [[decisions/ai-and-rag]]. Not current guidance.

---

## 12/08/2026 — No manual AI provider switch needed before Anthropic price change

**Problem:** Anthropic token pricing increases after 2026-08-31. Considered manually switching the primary provider to Google before that date to avoid the higher rate.

**Decision:** Not needed. The app runs on a pre-purchased, fixed Anthropic token allotment with no auto-reload — those tokens are a sunk cost already paid at the old rate, not billed per-call going forward, and aren't used for anything else. The existing per-call fallback order (`fallbackOrder: 'anthropic,google-pro,openai'`, `config/production.ts`) already switches to Google automatically once the Anthropic allotment is exhausted or a call fails — no date-based manual switch adds anything.

**Why this approach over alternatives:** A scheduled manual switch on 31.8 was the original plan, but it only makes sense if the tokens have an expiry date or ongoing per-call billing risk (auto-reload). Neither applies here, so the existing reactive fallback is strictly sufficient — a proactive scheduled switch would just stop using already-paid-for tokens early.

**How to apply:** No action needed. Revisit only if the Anthropic allotment gets auto-reload enabled (then per-call cost becomes ongoing and a proactive switch may be worth it) or if the tokens turn out to have an expiry.

*Archived 10/10/2026 — superseded: the fallback order it relies on (`anthropic,google-pro,openai`) was replaced by gpt-6.1-sol primary + gemini-3.1-flash-lite fallback and Anthropic left the prod chain. See [[decisions/ai-and-rag]] (10/10/2026, both entries).*
