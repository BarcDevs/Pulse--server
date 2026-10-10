# AI Model Audit

How to compare AI models for Pulse's server-side generation and pick `AI_PROVIDER` / the per-vendor model
(`ANTHROPIC_MODEL`, `GOOGLE_*`, `OPENAI_*`) and `AI_MAX_OUTPUT_TOKENS` with evidence. Repeatable: add or drop
candidates in one JSON file, rerun two commands, read one report.

Latest results: bottom of this file. Raw data per run: `eval-output/audit-<run-id>/` (gitignored, local only).

## What it measures

Every candidate model gets every scenario, 3 times (`--reps`), with the exact prompt the server builds and the
same generation settings prod uses (max 1000 output tokens, Google temperature 0.7, no Anthropic temperature,
no retries beyond rate-limit back-off).

| Parameter | How it is measured |
|---|---|
| Feedback quality | Blind LLM judges, 1-10 per model per scenario (tone, specificity, native language, fit) |
| Obedience to rules | Programmatic checks per output (`rules.ts`): length/sentence limits, no score quoting, no dashes or typographic quotes, language, JSON validity, field limits, prod validator |
| Cutoffs | Finish reason is not a normal stop (`max_tokens` / `length` / `MAX_TOKENS`). Hidden "thinking" tokens count against the 1000 budget, which is exactly how prod can truncate |
| Latency | Wall time of the successful call; p50, p95, and how many calls exceed prod's 15 s timeout |
| Cost | Real input/output tokens (reasoning included) x list price, shown as dollars per 1000 requests |
| Reliability | Share of calls that succeeded, finished normally and returned within 15 s |

The composite score weights are in `candidates.json` (`weights`: quality 0.4, obedience 0.25, reliability 0.15,
cost 0.1, latency 0.1). It is a convenience ranking; read the raw columns before deciding, and change the
weights if priorities change.

## Scenarios

One scenario per kind of AI request the server makes. Fixtures live in `scripts/eval-ai-models/scenarios.ts`
(Hebrew, fixed data), prompts come from the real builders.

| Scenario | Pipeline | Output kind |
|---|---|---|
| `mood-drop-alert` | insight `MOOD_DROP_ALERT` | text, max 3 sentences, no scores |
| `motivational` | insight `MOTIVATIONAL` | text, max 2 sentences, no scores |
| `weekly-summary` | insight `WEEKLY_SUMMARY` | text, max 3 sentences, no scores |
| `daily-observation` | daily observation card | strict JSON, observation <=120 chars, description <=140, icon, no numbers |
| `progress-summary` | progress insight summary | text, 2-4 sentences (prompt has no language directive, so replies are English) |
| `checkin-feedback` | check-in feedback message | JSON, one sentence per field |

New pipeline? Follow `workflow/05-adding-ai-pipeline.md`. `checkin-feedback` uses a copy of the private
`buildAIPrompt` in `src/services/feedback/aiRenderer.ts`; re-sync it when that function changes (or export it).

## Files

All in `scripts/eval-ai-models/`:

| File | Role |
|---|---|
| `candidates.json` | Candidate models (vendor, id, list price), judges, composite weights, price-check date |
| `scenarios.ts` | Scenario fixtures, loads the prompt builders from `--src-root` |
| `rules.ts` | Programmatic obedience checks per scenario kind |
| `vendors.ts` | One call per vendor (Anthropic, OpenAI, Google) mirroring prod's request bodies; records tokens, finish reason, latency |
| `eval-ai-models.ts` | Stage 1: generate. Writes `runs.json` + `meta.json` |
| `judge-ai-outputs.ts` | Stage 2: blind judging + `report.md` |

## How to run

All commands from the repo root. Keys come from `.env` (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
`GOOGLE_AI_API_KEY`); never paste them in chat.

1. **Refresh the candidates.** Edit `candidates.json`: add/drop models, update prices (sources in `pricingNote`;
   set `pricingCheckedOn`). List what each key can use:
   - Anthropic: `GET https://api.anthropic.com/v1/models`
   - OpenAI: `GET https://api.openai.com/v1/models`
   - Google: `GET https://generativelanguage.googleapis.com/v1beta/models` and keep only models whose
     `supportedGenerationMethods` includes `generateContent` (Live/TTS/image models do not).
2. **Point at the prompts to audit.** `--src-root` is the checkout whose prompts count (a feature worktree with
   unmerged prompt changes, or `.`).
3. **Generate:**
   `npx tsx --env-file=.env scripts/eval-ai-models/eval-ai-models.ts --run-id <id> --reps 3 --src-root <path>`
   Add `--only id1,id2` to run a subset (new candidates only, or a smoke test).
   If a rule in `rules.ts` was wrong, fix it and rerun the same command with `--rescore` (no API calls): it recomputes the rule results from the stored outputs. Then rerun step 4 with `--report-only`.
4. **Judge (API judges) and build the report:**
   `npx tsx --env-file=.env scripts/eval-ai-models/judge-ai-outputs.ts --run-id <id>`
   This shuffles models into anonymous `model-N` aliases (`mapping.json`, kept out of the judges' view), writes
   `judge-input/<scenario>.md`, calls every judge with `mode: "api"`, then writes `report.md`.
5. **Subagent judge (no API spend).** A judge with `mode: "subagent"` (Sonnet 5.5) is a Claude Code subagent:
   spawn one, tell it to read `eval-output/audit-<id>/judge-input/INSTRUCTIONS.md` and every
   `judge-input/<scenario>.md`, and write `verdicts/<judgeId>.json`. Then rerun step 4 with `--report-only`.
   Use `--api-judge <judgeId>` instead if you want that judge through the API.
6. **Read `report.md`**, record the decision, write the results below.

Rerun cost is small (a few dollars at most for ~15 models x 18 calls plus judging); a rate-limited call is retried
twice with back-off and only the final attempt's latency is counted.

## Judges

Chosen as the strongest current models of each vendor: Sonnet 5.5, GPT 6.1 Sol, Gemini 3.8 Flash. They only see
anonymized outputs for a scenario plus the prompt; they never see programmatic results or the mapping. A judge
never scores its own model (that pair is left out of the average), so a judge's own model is judged by the other two.
LLM judges are noisy and have style biases: treat differences under about 0.5 points as ties.

Self-preference is real and measured here, even with anonymized outputs (models recognise their own style): on
2026-10-10 GPT 6.1 Sol scored itself 9.0-9.5 against 7.2-7.7 from the other judges (+1.4 to +2.2, about +0.7 to +1.8
after allowing for being a more generous judge), and it also rated the other OpenAI models above the other
judges' average (gpt-6-luna 7.83 vs 6.08). Gemini 3.8 Flash showed a smaller bump (+1.1) and Sonnet 5.5 none. So the
deciding quality number is the **cross-vendor mean**: the average of only the judges from other vendors than the
candidate. The raw per-judge scores stay in the table for transparency.

## Playoff and final decision

A broad run decides who is worth a closer look; a playoff decides the winner; a checklist decides whether the winner
can actually ship. Judge scores are relative to the set a judge sees, so scores from different runs are never
compared, only models inside one run.

1. **Broad round.** All candidates, 3 reps x every scenario, three judges (steps in "How to run"). Shortlist the
   models above the first big drop in judge mean (the tier break; on 2026-10-10 the top 4 were 7.3-7.8, the next 6.6).
2. **Playoff.** Rerun only the shortlist with more samples (8 reps), fresh blind aliases, all three judges **through the
   API** (including the Claude judge, so no outside conversation context can reach it). Rank by the **cross-vendor
   mean**. Differences under 0.5 are ties; break ties on cost, then slowest call and p95 against the 15 s prod
   timeout, then rule pass and reliability.
3. **Fallback round.** The fallback should be a different vendor from the primary (a vendor outage must not take
   both down). Generate the fallback candidates alone, then merge them with the playoff outputs so everyone is judged
   together: `eval-ai-models.ts --run-id <new> --merge <playoffRun>,<fallbackRun>` (it refuses to merge runs built from
   different prompts), then `judge-ai-outputs.ts --run-id <new> --api-judge claude-sonnet-5-5`. Weigh quality of the
   fallback against its cost and its slowest call, because a primary timeout plus a slow fallback adds up.
4. **Verify before adopting.** Do all of these, in this order, and write the answers in the Results section:
   - Read every rule failure of the winner (the table's "Most-failed rules" and `runs.json`). A miss is only a miss
     if the prompt actually asks for that behavior; a check applied to a prompt that never asks is a harness bug,
     fix `rules.ts`, `--rescore`, and rebuild the report.
   - Slowest call under the prod timeout (15 s) in every run, zero cutoffs, zero errors.
   - Price matches the vendor's current page, and the model id in `config/default.ts` or the env override is the exact
     id that was audited (a sibling id with a different price or purpose is not the same model).
   - The provider class checks the finish reason (`stop_reason=max_tokens`, `finish_reason=length`, Gemini
     `MAX_TOKENS`) and throws on a cutoff, instead of storing a cut-off reply.
   - Provider keys and billing are set for the primary and the fallback.
5. **Record the decision** in the Results section: primary, fallback, the evidence (cross-vendor means, rule pass,
   cost, slowest call) and the date. It stays the model of choice until the next audit.

## Report columns

`report.md` has one row per model, ordered by composite score. Columns:

| Column | Meaning |
|---|---|
| Composite | Weighted blend of quality, obedience, reliability, cost, latency (weights in `candidates.json`); a convenience ranking only |
| Judge mean | Average of the judges that scored the model (never its own judge), so models can be averaged over different judges |
| Cross-vendor mean | Average of only the judges from other vendors than the model. Use this one to compare quality |
| One column per judge | That judge's mean score (1-10) for the model over all scenarios; `n/a` = the judge is the model itself |
| Rule pass | Share of programmatic rule checks passed (successful calls only) |
| Reliable | Calls that succeeded, finished normally and returned within 15 s |
| Cutoffs / Errors / >15s | Calls cut off by the token limit / failed calls / calls slower than the prod timeout |
| p50 / p95 / Slowest ms | Latency distribution of successful calls; Slowest is the single worst call (the number to compare with the 15 s timeout) |
| Out tok / Reasoning tok | Average output tokens (reasoning included) and the hidden-reasoning part, when the vendor reports it |
| $ in / out per 1M tok | List price used for the cost columns |
| $/1k req | Average real cost of 1000 requests with this audit's prompts |

A second table gives rule pass per scenario and the most-failed rules.

## Caveats

- Latency is measured with up to 3 parallel calls per vendor and varies by time of day. Rerun before deciding
  between two close models.
- Reasoning models (Anthropic 5.5 family, GPT 5.x/6.x, Gemini 3.x) spend part of the 1000-token budget on hidden
  thinking; that is real prod behavior, so cutoffs here predict cutoffs in prod.
- Models served only through a realtime/WebSocket API (`gemini-3.8-live`) cannot be called the way the server
  calls models; they are not candidates until there is a live-chat feature.
- The no-dashes / no-typographic-quotes check runs on every scenario, but only the insight and daily-observation prompts tell the model to avoid them (their `languageInstruction`); the progress-summary and check-in-feedback prompts do not. Misses on those two scenarios are not model faults. Next audit: scope that rule to the kinds whose prompts ask for it (or add the instruction to those prompts, which is the better fix), then `--rescore`.
- The rule checks are heuristics for the prompt's own instructions (e.g. "no score numbers" ignores streak/day
  counts). When a check looks wrong for a specific reply, read `runs.json` before trusting the percentage.

---

## Results

### Run 2026-10-10

15 models x 6 scenarios x 3 reps = 270 calls, prompts from `fix/truncated-anthropic-insight` (git fef02fc, includes the no-scores rule).
Judges: Sonnet 5.5 (Claude Code subagent), GPT 6.1 Sol, Gemini 3.8 Flash. Judge agreement (Spearman rank correlation over the models none of the pair is): 0.86, 0.80, 0.70.
Not run: `gemini-3.8-live` (WebSocket-only, see Caveats). Prices as of 2026-10-10; Gemini 3.8/3.6 Flash prices are a promo rate that doubles on 2027-01-01.

#### Ranking

| # | Model | Composite | Judge mean | claude-sonnet-5-5 | gpt-6.1-sol | gemini-3.8-flash | Rule pass | Reliable | Cutoffs | Errors | >15s | p50 ms | p95 ms | Out tok | Reasoning tok | $/1k req |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | gpt-6-luna | 84.3 | 7.67 | 6.83 | 9.00 | 7.17 | 100% | 100% | 0 | 0 | 0 | 2408 | 6376 | 211 | 135 | $0.143 |
| 2 | gemini-3.1-flash-lite | 80.5 | 6.56 | 5.83 | 6.50 | 7.33 | 100% | 100% | 0 | 0 | 0 | 1060 | 1304 | 93 | 0 | $0.236 |
| 3 | gpt-5.4-mini | 75.4 | 6.11 | 6.00 | 6.50 | 5.83 | 98% | 100% | 0 | 0 | 0 | 927 | 1778 | 87 | 0 | $0.674 |
| 4 | gpt-5.4-nano | 74.1 | 5.00 | 4.67 | 5.00 | 5.33 | 96% | 100% | 0 | 0 | 0 | 1116 | 1405 | 98 | 0 | $0.197 |
| 5 | gpt-5.6-terra | 74.0 | 7.44 | 7.00 | 8.00 | 7.33 | 99% | 100% | 0 | 0 | 0 | 2430 | 3370 | 76 | 0 | $1.661 |
| 6 | gemini-3.5-flash-lite | 72.5 | 4.56 | 4.17 | 5.33 | 4.17 | 100% | 100% | 0 | 0 | 0 | 868 | 1245 | 88 | 0 | $0.337 |
| 7 | claude-sonnet-5-5 | 72.1 | 7.83 | n/a | 7.50 | 8.17 | 100% | 94% | 0 | 0 | 1 | 6500 | 19146 | 524 | 0 | $6.444 |
| 8 | gpt-6.1-sol | 71.3 | 7.33 | 7.50 | n/a | 7.17 | 100% | 100% | 0 | 0 | 0 | 6006 | 8412 | 222 | 135 | $2.968 |
| 9 | claude-haiku-5-5 | 70.0 | 6.61 | 6.50 | 6.33 | 7.00 | 97% | 89% | 2 | 0 | 0 | 4266 | 6392 | 609 | 0 | $0.365 |
| 10 | claude-sonnet-4-6 | 67.2 | 6.50 | 6.00 | 5.67 | 7.83 | 97% | 100% | 0 | 0 | 0 | 5689 | 8110 | 161 | 0 | $3.726 |
| 11 | gpt-5.2 | 66.6 | 5.89 | 5.17 | 6.17 | 6.33 | 96% | 100% | 0 | 0 | 0 | 2509 | 4335 | 100 | 0 | $2.058 |
| 12 | claude-sonnet-5 | 66.6 | 6.39 | 6.00 | 6.00 | 7.17 | 98% | 94% | 0 | 0 | 1 | 4479 | 60065 | 165 | 0 | $2.847 |
| 13 | claude-haiku-4-5 | 57.7 | 4.22 | 3.50 | 4.33 | 4.83 | 87% | 100% | 0 | 0 | 0 | 2806 | 4512 | 164 | 0 | $1.259 |
| 14 | gemini-3.8-flash | 39.9 | 2.92 | 2.50 | 3.33 | n/a | 83% | 39% | 11 | 0 | 0 | 6706 | 8346 | 903 | 844 | $3.675 |
| 15 | gemini-3.6-flash | 28.6 | 1.72 | 1.67 | 1.83 | 1.67 | 70% | 17% | 15 | 0 | 0 | 5752 | 6350 | 977 | 928 | $3.952 |

#### Rule pass by scenario

| Model | mood-drop-alert | motivational | weekly-summary | daily-observation | progress-summary | checkin-feedback | Most-failed rules |
|---|---|---|---|---|---|---|---|
| gpt-6-luna | 100% | 100% | 100% | 100% | 100% | 100% | none |
| gemini-3.1-flash-lite | 100% | 100% | 100% | 100% | 100% | 100% | none |
| gpt-5.4-mini | 100% | 100% | 100% | 90% | 100% | 100% | icon-matches-type x2, language-hebrew x1 |
| gpt-5.4-nano | 100% | 100% | 96% | 97% | 100% | 88% | no-dashes-or-typographic-quotes x4, icon-matches-type x1 |
| gpt-5.6-terra | 100% | 96% | 100% | 100% | 100% | 100% | sentence-limit x1 |
| gemini-3.5-flash-lite | 100% | 100% | 100% | 100% | 100% | 100% | none |
| claude-sonnet-5-5 | 100% | 100% | 100% | 100% | 100% | 100% | none |
| gpt-6.1-sol | 100% | 100% | 100% | 100% | 100% | 100% | none |
| claude-haiku-5-5 | 100% | 100% | 88% | 100% | 100% | 92% | json-only x2, non-empty x1, complete-sentence x1 |
| claude-sonnet-4-6 | 100% | 100% | 100% | 100% | 100% | 83% | json-only x3, no-dashes-or-typographic-quotes x1 |
| gpt-5.2 | 100% | 100% | 100% | 90% | 100% | 88% | icon-matches-type x3, no-dashes-or-typographic-quotes x3 |
| claude-sonnet-5 | 100% | 100% | 100% | 100% | 100% | 88% | json-only x3 |
| claude-haiku-4-5 | 100% | 100% | 100% | 50% | 93% | 88% | json-strict-parse x3, json-fields x3, observation-max-120 x3 |
| gemini-3.8-flash | 88% | 58% | 96% | 67% | 100% | 100% | complete-sentence x7, language-hebrew x2, plain-text x2 |
| gemini-3.6-flash | 92% | 83% | 54% | 43% | 93% | 67% | complete-sentence x9, language-hebrew x5, json-strict-parse x3 |


#### Findings

1. **Quality tiers (judge mean, self-judging excluded).** Top: claude-sonnet-5-5 7.83, gpt-6-luna 7.67, gpt-5.6-terra 7.44, gpt-6.1-sol 7.33. Middle: claude-haiku-5-5 6.61, gemini-3.1-flash-lite 6.56, claude-sonnet-4-6 6.50, claude-sonnet-5 6.39, gpt-5.4-mini 6.11, gpt-5.2 5.89. Low: gpt-5.4-nano 5.00, gemini-3.5-flash-lite 4.56, claude-haiku-4-5 4.22. Broken: gemini-3.8-flash 2.92, gemini-3.6-flash 1.72 (see 3).
2. **Best value: gpt-6-luna.** Quality 7.67, 100% rule pass, 100% reliable, $0.14 per 1k requests, p50 2.4 s (p95 6.4 s, from hidden reasoning, still well under the 15 s timeout). Next on cost-quality: gemini-3.1-flash-lite (6.56, $0.24, 1 s, no reasoning) and gpt-5.6-terra (7.44, $1.66, 2.4 s).
3. **Cutoffs: Gemini 3.8 Flash and 3.6 Flash.** Their hidden thinking uses about 950 of the 1000 token budget, so 11/18 and 15/18 replies stop at roughly 90 characters with `finishReason=MAX_TOKENS`. That matches the prod symptom (a stored insight cut at 79 characters). `GoogleAIProvider` only logs a warning for a non-`STOP` finish, so a cut-off reply is stored, unlike `AnthropicProvider` after commit 4c58c64. If either model is ever used, raise `AI_MAX_OUTPUT_TOKENS` well above 1000 or add a `thinkingConfig`/thinking budget, and guard on the finish reason. Untested here. claude-haiku-5-5 also cut off 2/18 (thinking).
4. **Current Anthropic models.** claude-sonnet-5: judge 6.39, $2.85 per 1k, one call took 60 s (a prod timeout; it also drives the 60 s p95). claude-sonnet-4-6: 6.50, $3.73. Both are mid-pack and 20-26x the price of gpt-6-luna. claude-sonnet-5-5 has the best quality score but costs $6.44 per 1k (2.3x sonnet-5), p50 6.5 s, p95 19 s (1 call over 15 s), and about 520 output tokens per reply because of thinking.
5. **Obedience.** Insight scenarios: the no-scores rule held for 13 of 15 models (zero score quotes in 117 replies); only the two broken Gemini flash models quoted one (3 replies). The em dash / typographic quote rule failed for gpt-5.4-nano (4), gpt-5.2 (3), claude-sonnet-4-6 (1) and claude-haiku-4-5 (1). Daily observation (strict JSON): claude-haiku-4-5 fails the strict parse on 3/3 (prod does `JSON.parse` with no fence stripping, so those would error), gpt-5.2 (3), gpt-5.4-mini (2) and gpt-5.4-nano (1) pick the wrong icon for the pattern. Check-in feedback: claude-sonnet-4-6 and claude-sonnet-5 wrap the JSON in markdown fences (prod extracts `{...}` with a regex, so this is tolerated).
6. **Bug found outside the model choice:** `countSentences` splits on every ".", so a 3-sentence progress summary that quotes "6.9" or "(+0.8)" counts as 7 sentences. `summaryResolver.isValidSummary` uses it with `MAX_SENTENCES = 4`, so nearly every AI progress summary is rejected and replaced by the fallback text, whatever model runs. This audit counts real sentences for that scenario instead and leaves the prod validator out of it. Needs its own fix.

Weigh the shortlist against your priorities: for lowest cost with good quality gpt-6-luna; for cheapest with zero reasoning overhead gemini-3.1-flash-lite; for best quality regardless of cost claude-sonnet-5-5 or gpt-5.6-terra. This audit does not pick the model: the production model is set in config.

#### Limits of this run

- 3 reps per scenario and one fixture each, Hebrew except progress-summary (English because its prompt has no language directive). Differences under about 0.5 judge points are ties.
- Latency was measured with up to 3 parallel calls per vendor at one time of day.
- Anthropic usage does not break out thinking tokens, so "Reasoning tok" shows 0 for Claude models; their thinking is inside "Out tok".
- Cost ignores prompt caching and batch discounts; every call is a standard request.

### Follow-up run: top 4, more samples (top4-2026-10-10)

The four best of the first run (claude-sonnet-5-5, gpt-6-luna, gpt-5.6-terra, gpt-6.1-sol), 8 reps x 6 scenarios each (192 calls), all three judges through the API (Sonnet 5.5 as an API judge, not a subagent). Same prompts, same blind aliasing.

| Model | Sonnet 5.5 judge | GPT 6.1 Sol judge | Gemini 3.8 Flash judge | Mean of judges outside its vendor | Mean of all available judges | Rule pass | $ in / out per 1M tok | $/1k req | p50 / p95 |
|---|---|---|---|---|---|---|---|---|---|
| gpt-6.1-sol | 7.50 | (self) | 7.67 | **7.58** | 7.58 | 99% | 2.00 / 10.00 | $2.89 | 5.5 s / 8.4 s |
| claude-sonnet-5-5 | (self) | 6.67 | 7.67 | **7.17** | 7.17 | 100% | 2.00 / 10.00 | $6.16 | 5.8 s / 9.8 s |
| gpt-5.6-terra | 6.00 | 7.17 | 6.83 | **6.42** | 6.67 | 99% | 2.00 / 12.00 | $1.68 | 2.3 s / 3.3 s |
| gpt-6-luna | 5.83 | 7.83 | 6.33 | **6.08** | 6.67 | 100% | 0.10 / 0.50 | $0.13 | 2.2 s / 5.5 s |

- **A judge never scores its own model, so "all available judges" averages different judges per model and is not directly comparable.** Compare judge by judge, or use the vendor-neutral column (the two judges from other vendors). Composite (cost and latency included) ranks gpt-6-luna first at 86.7, gpt-5.6-terra 76.7, gpt-6.1-sol 74.7, claude-sonnet-5-5 72.3, because luna is 20-50x cheaper.
- **The judges disagree on gpt-6-luna.** The GPT judge rates it best of the three it scored (7.83); the Sonnet and Gemini judges rate it last or second last (5.83, 6.33). The first run's 7.67 for luna does not hold up with 8 reps and a smaller field: judge scores are relative to the set shown, so absolute numbers are not comparable across runs.
- **gpt-6.1-sol is the strongest on both neutral judges** (7.50 and 7.67); claude-sonnet-5-5 is next (6.67 and 7.67). Whether the GPT judge's high luna score is better taste or familiarity with its own vendor's style cannot be settled by this setup; a Hebrew-reading human check of blind samples is the tiebreaker.
- Scenario detail (judge x scenario scores) is in `eval-output/audit-top4-2026-10-10/verdicts/`.

### Fallback round and decision (top5-fallback-2026-10-10)

The playoff outputs above merged with `gemini-3.1-flash-lite` (8 reps, same prompts), then rejudged together by the same three judges, all through the API.

| Model | Cross-vendor mean | Sonnet 5.5 | GPT 6.1 Sol | Gemini 3.8 Flash | Rule pass | $ in / out per 1M | $/1k req | p50 | p95 | Slowest |
|---|---|---|---|---|---|---|---|---|---|---|
| gpt-6.1-sol | **8.08** | 7.83 | (self) | 8.33 | 99% | 2.00 / 10.00 | $2.89 | 5.5 s | 8.4 s | 10.1 s |
| claude-sonnet-5-5 | **7.33** | (self) | 6.83 | 7.83 | 100% | 2.00 / 10.00 | $6.16 | 5.8 s | 9.8 s | 10.3 s |
| gpt-5.6-terra | **6.83** | 6.67 | 7.33 | 7.00 | 99% | 2.00 / 12.00 | $1.68 | 2.3 s | 3.3 s | 4.3 s |
| gpt-6-luna | **6.42** | 6.00 | 8.17 | 6.83 | 100% | 0.10 / 0.50 | $0.13 | 2.2 s | 5.5 s | 7.3 s |
| gemini-3.1-flash-lite | **5.08** | 4.67 | 5.50 | 5.50 | 100% | 0.25 / 1.50 | $0.23 | 1.0 s | 1.5 s | 2.6 s |

(Cross-vendor mean here is the mean of the judges outside the model's vendor: for the OpenAI models Sonnet 5.5 and Gemini; for Sonnet 5.5 GPT and Gemini; for gemini-3.1-flash-lite Sonnet and GPT.)

- **Primary: gpt-6.1-sol.** Best quality on both non-OpenAI judges, 0.75 above claude-sonnet-5-5 (borderline tie, but at under half the cost). Slowest call over both of its runs was 10.1 s (66 calls), no cutoffs, no errors. Its rule misses (99%) were two progress-summary replies with a dash or typographic quote; the progress prompt never asks for that, so it is a harness scope issue, not a model miss (see Caveats).
- **Fallback candidates.** claude-sonnet-5-5 keeps quality (7.33) and is a different vendor, but costs $6.16 per 1k and one call in 48 was cut off. gemini-3.1-flash-lite is a different vendor, $0.23 per 1k, 1 s median and no call over 2.6 s, but its quality is 2.2 points below the primary (5.08, the Gemini judge did not favour its own family: 5.50, same as the GPT judge). A fallback that fires after a 15 s primary timeout should also be fast: the sonnet-5-5 worst case is about 10 s, so primary timeout plus fallback can approach 25 s. The choice (quality vs. speed and cost for the rare fallback path) is the owner's.
- **Before shipping (verified 2026-10-10):**
  - `config/default.ts` defaulted `openaiModel` to `gpt-5.6-sol`, a different (cyber-oriented, $4/$20) model. Fixed on branch `chore/ai-fallback-chain` (default now `gpt-6.1-sol`), together with `config/production.ts`: `provider: 'openai'`, `fallbackOrder: 'google'` (Anthropic and `google-pro` dropped from the prod chain).
  - `OpenAIProvider` does **not** check `finish_reason`: it only reads `choices[0].message.content`. A `length` cutoff with partial text would be stored. Sol had no cutoffs in 66 calls, but the guard `AnthropicProvider` got is missing here and should be added.
  - There is no shared prompt-rules builder: `languageInstruction` (the dash, quote and native-phrasing rules) exists as two separate copies in `insightsPrompts.ts` and `observationPrompt.ts`, and the progress and check-in feedback prompts have none. The progress prompt also has no language directive, so its summaries come back in English whatever the user's language.

**Decision (10/10/2026, owner):** primary `gpt-6.1-sol`, single fallback `gemini-3.1-flash-lite`, Anthropic out of the prod chain until a new audit brings it back (the fallback was chosen over sonnet-5-5 for speed: a slow fallback inside a check-in request that the Next.js proxy cuts at 30 s is the larger risk). Recorded in `decisions/ai-and-rag.md`.
