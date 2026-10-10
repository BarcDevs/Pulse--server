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

## 12/08/2026 — Post title/body length cap; pgvector confirmed viable; embedding model/vector DB picked for RAG plan

**Problem:** Three loose ends surfaced while prepping the RAG-for-recommendations plan (see 11/08/2026 entry above) for an architecture interview: (1) `newPostSchema`/`updatePostSchema` had no `.max()` on `title`/`body` — an unbounded string is both an abuse vector (huge paste) and, once embedding is added, a real risk of exceeding the embedding model's input token limit; (2) hadn't confirmed pgvector actually works on the current RDS instance (Postgres 17.10, `db.t3.micro`) before committing to the plan; (3) hadn't picked a concrete embedding model or a future vector-DB-at-scale option, which reads badly in an interview as "haven't decided."

**Decision:**
1. Added `POST_LIMITS` (`src/constants/forum/postLimits.ts`): `MAX_TITLE_LENGTH: 200`, `MAX_BODY_LENGTH: 10000` — applied via `.max()` in both `newPostSchema` and `updatePostSchema`. Chosen to sit far above any real forum post but comfortably under the ~8191-token input limit of the embedding model below (10000 chars ≈ 2500 tokens).
2. Confirmed pgvector is supported on RDS PostgreSQL 17.10 out of the box (AWS extended support down to 12.19+/13.15+/14.12+/15.7+/16.3+ as of the pgvector 0.7.0 update, May 2024) — no `shared_preload_libraries` or parameter-group change needed, just `CREATE EXTENSION IF NOT EXISTS vector;`. No extra AWS charge beyond normal RDS compute/storage; `db.t3.micro` is adequate at current post volume but a known constraint (burstable CPU, 1GB RAM) if the corpus grows to hundreds of thousands of vectors.
3. Picked `text-embedding-3-small` (OpenAI) as the embedding model — `OPENAI_API_KEY` already provisioned in Secrets Manager, cheap (~$0.02/M tokens), 1536 dimensions, sufficient quality for the current corpus size; `text-embedding-3-large` would be over-spec for the scale.
4. Picked Qdrant as the future dedicated vector DB if/when scale outgrows pgvector on `db.t3.micro` — open-source (self-host or managed), strong ANN-benchmark results, and supports combined filter+vector queries natively, which matters here because `scorePost` (`src/lib/recommendations/scoring.ts`) is already multi-signal (semantic + condition + stage + engagement + recency), not pure semantic search.

**Why this approach over alternatives:** `text-embedding-3-large` and Pinecone were the main alternatives considered — both rejected as over-spec/over-cost for current post volume, not because they're wrong in principle. Qdrant over Pinecone/Weaviate specifically because native filter+vector queries avoid adding a second scoring pass in application code.

**How to apply:** Length caps are live now (independent of RAG timing). The model/vector-DB choices are the plan to execute when the RAG work is actually picked up — no code for embeddings exists yet, only the scoring bug and this plan (see 11/08/2026 entry).

---

## 10/10/2026 — Prod AI chain: gpt-6.1-sol primary, gemini-3.1-flash-lite fallback, Anthropic dropped

**Problem:** The prod chain (`config/production.ts`) was `anthropic` primary with `google-pro` and `openai` fallbacks, set from a first audit with few scenarios and few samples that found GPT far costlier than Sonnet. That audit evaluated OpenAI through the config default `gpt-5.6-sol` ($4/$20 per 1M tokens, a different model), not `gpt-6.1-sol` ($2/$10). A repeatable audit was run on 10/10/2026: 15 models, 6 scenarios covering every AI request type, 3 blind judges, then a playoff of the top models at 8 reps (`docs/AI-MODEL-AUDIT.md`).

**Decision:** Primary `gpt-6.1-sol` (`provider: 'openai'`, `openaiModel` default `gpt-6.1-sol`), one fallback `gemini-3.1-flash-lite` (`fallbackOrder: 'google'`). Anthropic and `google-pro` (`gemini-3.1-pro-preview`, never audited) leave the prod chain; the Anthropic provider stays in code. Evidence, vendor-neutral judge mean (judges from other vendors only, because judges favour their own vendor): gpt-6.1-sol 8.08, claude-sonnet-5-5 7.33, gpt-5.6-terra 6.83, gpt-6-luna 6.42, gemini-3.1-flash-lite 5.08. gpt-6.1-sol: slowest call 10.1 s over 66 calls, no cutoffs, $2.89 per 1k requests. gemini-3.1-flash-lite: slowest call 2.6 s, $0.23 per 1k.

**Why over alternatives:** claude-sonnet-5-5 as the fallback keeps quality but costs 2.1x per request and is about 10 s slower, and a slow fallback matters because the check-in request awaits the AI and the Next.js `/api` proxy cuts at 30 s (TODO.md, CRITICAL). gpt-6-luna is the cheapest but scored below the others on the vendor-neutral judges. Gemini as the single fallback is fast, cheap and a different vendor, so an OpenAI outage cannot take both down.

**How to apply:** This is the model of choice until the next audit; repeat it per `docs/AI-MODEL-AUDIT.md` and put new candidates through the playoff. Anthropic identity federation (`scaling-todo.md`) is deferred until a new audit brings Anthropic back. Before relying on it in prod, check that no `AI_PROVIDER`, `AI_FALLBACK_ORDER` or `OPENAI_MODEL` env override exists on the box and that `pulse/app/OPENAI_API_KEY` and `GOOGLE_AI_API_KEY` hold real keys: the chain silently skips a provider with no key. Only insights use the chain; daily observation, progress summaries and check-in feedback call a single provider.
