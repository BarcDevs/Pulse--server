# Decisions — AI Providers & RAG

⚠️ Load only when following a link from [[decisions/index]] for a specific entry, or scanning for
context in this topic — not routinely.

---

## 11/08/2026 — RAG: not needed app-wide, one legit fit identified for later

**Problem:** User asked whether the planned AI chat agent, check-in AI feedback, or various feature ideas (monthly comparison, chat memory, community post search) should use RAG. Investigated each: check-in history/goals/user profile are small structured per-user data (few rows) — direct DB query + prompt context is correct, RAG adds infra (vector store, embeddings, chunking) for a retrieval problem that doesn't exist at this scale.

**Found while investigating `/forum/recommendations`:** `computeSemanticSimilarity` in `src/lib/recommendations/scoring.ts` is misnamed — it's Jaccard token overlap (bag-of-words) on `keyIssueTags` vs. post title/body tokens, not real semantic/embedding similarity. This scores posts against a user's check-in-derived issue tags and genuinely fails on paraphrases (e.g. "can't sleep" vs. "insomnia" tag) since it requires literal token overlap.

**Decision:** Don't build a new feature to "use RAG." Instead, when picked up later, swap the Jaccard scoring in `computeSemanticSimilarity` (`src/lib/recommendations/scoring.ts:50-61`) for real embedding cosine similarity. This is a genuine RAG fit because the corpus (all forum posts) is large/growing and semantic retrieval solves a real, demonstrable failure mode already present in shipped code — not a manufactured use case.

**Why this approach over alternatives:** Considered community "similar posts" as a standalone feature, monthly check-in comparison, and persistent chat memory — all rejected as forced RAG (small/structured data, direct query suffices). This one is the only case where the existing code already claims to do semantic matching and doesn't.

**How to apply:** Scope when picked up — embed post title+body once per post (on create, or batch/cron for backfill), embed `keyIssueTags` per recommendation request, cosine similarity replacing Jaccard in `scorePost`. No chunking needed at current post volume. Check post volume and whether pgvector is available on the RDS instance (see `docs/DEPLOYMENT.md`) before choosing pgvector column vs. in-memory cached embeddings.

---

## 12/08/2026 — No manual AI provider switch needed before Anthropic price change

**Problem:** Anthropic token pricing increases after 2026-08-31. Considered manually switching the primary provider to Google before that date to avoid the higher rate.

**Decision:** Not needed. The app runs on a pre-purchased, fixed Anthropic token allotment with no auto-reload — those tokens are a sunk cost already paid at the old rate, not billed per-call going forward, and aren't used for anything else. The existing per-call fallback order (`fallbackOrder: 'anthropic,google-pro,openai'`, `config/production.ts`) already switches to Google automatically once the Anthropic allotment is exhausted or a call fails — no date-based manual switch adds anything.

**Why this approach over alternatives:** A scheduled manual switch on 31.8 was the original plan, but it only makes sense if the tokens have an expiry date or ongoing per-call billing risk (auto-reload). Neither applies here, so the existing reactive fallback is strictly sufficient — a proactive scheduled switch would just stop using already-paid-for tokens early.

**How to apply:** No action needed. Revisit only if the Anthropic allotment gets auto-reload enabled (then per-call cost becomes ongoing and a proactive switch may be worth it) or if the tokens turn out to have an expiry.

---

## 12/08/2026 — Post title/body length cap; pgvector confirmed viable; embedding model/vector DB picked for RAG plan

**Problem:** Three loose ends surfaced while prepping the RAG-for-recommendations plan (see 11/08/2026 entry above) for an architecture interview: (1) `newPostSchema`/`updatePostSchema` had no `.max()` on `title`/`body` — an unbounded string is both an abuse vector (huge paste) and, once embedding is added, a real risk of exceeding the embedding model's input token limit; (2) hadn't confirmed pgvector actually works on the current RDS instance (Postgres 17.10, `db.t3.micro`) before committing to the plan; (3) hadn't picked a concrete embedding model or a future vector-DB-at-scale option, which reads badly in an interview as "haven't decided."

**Decision:**
1. Added `POST_LIMITS` (`src/constants/forum/postLimits.ts`): `MAX_TITLE_LENGTH: 200`, `MAX_BODY_LENGTH: 10000` — applied via `.max()` in both `newPostSchema` and `updatePostSchema`. Chosen to sit far above any real forum post but comfortably under the ~8191-token input limit of the embedding model below (10000 chars ≈ 2500 tokens).
2. Confirmed pgvector is supported on RDS PostgreSQL 17.10 out of the box (AWS extended support down to 12.19+/13.15+/14.12+/15.7+/16.3+ as of the pgvector 0.7.0 update, May 2024) — no `shared_preload_libraries` or parameter-group change needed, just `CREATE EXTENSION IF NOT EXISTS vector;`. No extra AWS charge beyond normal RDS compute/storage; `db.t3.micro` is adequate at current post volume but a known constraint (burstable CPU, 1GB RAM) if the corpus grows to hundreds of thousands of vectors.
3. Picked `text-embedding-3-small` (OpenAI) as the embedding model — `OPENAI_API_KEY` already provisioned in Secrets Manager, cheap (~$0.02/M tokens), 1536 dimensions, sufficient quality for the current corpus size; `text-embedding-3-large` would be over-spec for the scale.
4. Picked Qdrant as the future dedicated vector DB if/when scale outgrows pgvector on `db.t3.micro` — open-source (self-host or managed), strong ANN-benchmark results, and supports combined filter+vector queries natively, which matters here because `scorePost` (`src/lib/recommendations/scoring.ts`) is already multi-signal (semantic + condition + stage + engagement + recency), not pure semantic search.

**Why this approach over alternatives:** `text-embedding-3-large` and Pinecone were the main alternatives considered — both rejected as over-spec/over-cost for current post volume, not because they're wrong in principle. Qdrant over Pinecone/Weaviate specifically because native filter+vector queries avoid adding a second scoring pass in application code.

**How to apply:** Length caps are live now (independent of RAG timing). The model/vector-DB choices are the plan to execute when the RAG work is actually picked up — no code for embeddings exists yet, only the scoring bug and this plan (see 11/08/2026 entry).
