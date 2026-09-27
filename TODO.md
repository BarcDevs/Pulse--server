# TODO

## FEATURES

- **Localize server error messages for client — last item before launch.**
  Client currently only gets English error strings, no way to show the user's own language.
  Decision (locked in 2026-09-15): error codes, not server-side translation. Server stays
  language-agnostic — client owns the translation table.
  - Add a stable `code` (e.g. `AUTH_INVALID_TOKEN`, `NOT_FOUND_POST`) to `CustomError` and
    every subclass (`AuthError`, `ValidationError`, `NotFoundError`, `ConflictError`),
    threaded through `serializeErrors()`, `ICustomError`, and `ResponseType`.
  - All 4 factories (`AuthFactory`, `ValidationFactory`, `GenericFactory`, `ErrorFactory`)
    need a code per method. ~35 call sites across controllers/services/models — most just
    call factory methods unchanged, but several pass dynamic English text as the `message`
    arg (e.g. `errorFactory.generic.notFound('Post')`, `('Milestone')`, `('Goal')` etc in
    `recoveryGoalService.ts`/`forumService.ts`) which won't map to a fixed code without
    either a distinct code per resource type or a `params`/interpolation approach — decide
    that shape before touching call sites.
  - `errorHandler.ts`'s unhandled-error fallback (`src/middlewares/errorHandler.ts:34-47`)
    also needs a generic code (e.g. `INTERNAL_ERROR`) for consistency.
  - Server keeps returning the English `message` as-is (for logs/Swagger/fallback display);
    `code` is additive, not a breaking change to the response shape.
  - Docs sync required after: server PRD, server README, client README (per this repo's
    Docs Sync rule) — client needs the full code list to build its translation table.

- **RAG-based semantic scoring for `/forum/recommendations`.**
  `computeSemanticSimilarity` (`src/lib/recommendations/scoring.ts:50-61`) is misnamed —
  it's Jaccard token overlap, not real semantic matching, so it fails on paraphrases
  (e.g. "can't sleep" vs. "insomnia" tag). Swap for embedding cosine similarity: embed
  post title+body on create (backfill via batch/cron), embed `keyIssueTags` per request,
  replace Jaccard in `scorePost`. pgvector confirmed viable on current RDS instance;
  embedding model and vector DB approach already picked. See `decisions/decisions.md`
  (2026-08-11 and 2026-08-12 entries) for full reasoning, scope, and model choice.
  Also when implementing: (1) set a minimum-similarity threshold so fewer than 5 posts are
  returned when fewer than 5 are truly relevant, instead of padding with weak matches;
  (2) build a small fixed set of query -> expected-post pairs and compare retrieval quality
  against the current Jaccard scoring, so "RAG is better" is measured, not assumed.

## BUGS

* create a monitor agent for production to catch any unexpected errors and fix them, 
  then create a PR and notify dev, while also recording it in a doc, and checking - 
  if it is a reoccurring issue, the fix should already be recorded then no need to invent a new one