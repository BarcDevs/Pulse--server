# Adding a New AI Pipeline

A "pipeline" is any new place the server sends a prompt to a model: a new insight type, a new generated
card, a new summary, a new feedback message, etc. Every pipeline gets covered by the model audit
(`scripts/eval-ai-models/`, process in `docs/AI-MODEL-AUDIT.md`) in the same change, so the next audit tests
what is actually shipping and model choice is never made on stale scenarios.

**Files to touch:**
- `src/lib/<domain>/...Prompt.ts` — the prompt builder. Export it, so the audit can import it instead of copying it.
- `scripts/eval-ai-models/scenarios.ts` — add 1-3 scenarios for the new pipeline (see below).
- `scripts/eval-ai-models/rules.ts` — add rule checks only if the pipeline has a new output kind (see below).
- `docs/AI-MODEL-AUDIT.md` — add the scenario to the scenario table.
- `docs/API.md`, READMEs — as for any feature (Docs Sync in `CLAUDE.md`).

## Steps

1. **Export the prompt builder.** If the pipeline's prompt is private to its service (as the check-in feedback one
   still is), export it, or the audit has to carry a copy that silently drifts. A copy needs a
   "re-sync when X changes" comment, and is a last resort.
2. **Add scenarios to `buildScenarios()` in `scenarios.ts`.** One scenario = one realistic input through the real
   prompt builder, with a fixed fixture check-in set. Add 1-3 per pipeline:
   - the normal case (typical data, the language prod users use, Hebrew for most pipelines);
   - the case most likely to break the prompt's rules (e.g. numbers in the input that must not be quoted,
     a long gap, empty notes, a streak of 1);
   - a second language only if the pipeline is language-aware.
   Each scenario has a `name` (unique, kebab-case), a `kind`, a `language`, the built `prompt`, and the
   kind-specific fields (`maxSentences`, `observationType`, `feedbackMode`).
3. **Pick the `kind`.** Existing kinds: `insight-text` (plain sentences, sentence limit, no scores),
   `progress-text` (plain text, 2-4 sentences), `observation-json` (strict JSON, field limits, icon),
   `feedback-json` (JSON extracted from text, one sentence per field). If the new output matches one, reuse it.
   If it is a new shape, add a kind: extend `ScenarioKind` in `scenarios.ts`, add a `...Rules` function and a case in
   `checkOutput` in `rules.ts`. Mirror what the pipeline's own parser/validator does (e.g. prod does a strict
   `JSON.parse`, so a fenced reply must fail the rule).
4. **Encode the prompt's own rules as checks.** Every "never / always / maximum" line in the prompt is a rule
   that models can break. Add it to the kind's rules so obedience is measured, not assumed.
   Check any rule that already exists in a production validator by calling that validator, not re-implementing it.
5. **Smoke test one cheap model** before a real audit:
   `npx tsx --env-file=.env scripts/eval-ai-models/eval-ai-models.ts --run-id smoke --reps 1 --only claude-haiku-4-5`
   then `judge-ai-outputs.ts --run-id smoke`. Read `eval-output/audit-smoke/runs.json` and confirm the new
   scenario's outputs look right and its rules pass for a good output and fail for a bad one. Delete `eval-output/audit-smoke`.
6. **Update the scenario table** in `docs/AI-MODEL-AUDIT.md`.
7. **Run the full audit** only when a model decision is actually due, not on every new pipeline.

## Constraints

- A pipeline change (prompt text, insight types, generation config) also needs the audit scenarios and rules to
  match, same change. This is the "AI Eval Sync" rule in `CLAUDE.md`.
- Scenarios use fixed fixtures, not random data: two audits are only comparable if they ask the same questions.
- Do not put real user data in fixtures.
- Generation settings in `vendors.ts` mirror prod (`max tokens` 1000, Google temperature 0.7, no Anthropic
  temperature). If prod's generation config changes, change `vendors.ts` in the same change.
