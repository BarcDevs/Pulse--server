import {
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync
} from 'fs'
import { join } from 'path'

import type {
    AuditConfig,
    Candidate,
    JudgeConfig,
    JudgeScore,
    JudgeVerdict,
    RunRecord
} from './types'
import { generate } from './vendors'

// Stage 2 of the model audit: blind-judge the outputs from eval-ai-models.ts, then build report.md.
// Process and how to repeat it: docs/AI-MODEL-AUDIT.md.
//
// Usage: npx tsx --env-file=.env scripts/eval-ai-models/judge-ai-outputs.ts --run-id <id>
//   [--report-only]            skip judging, just rebuild report.md from existing verdicts
//   [--api-judge <judgeId>]    force an api-mode run for a judge configured as 'subagent'
// Judges with mode 'api' are called here. Judges with mode 'subagent' read
// judge-input/*.md and write verdicts/<judgeId>.json themselves (see judge-input/INSTRUCTIONS.md).

const OUTPUT_ROOT = 'eval-output'
const JUDGE_MAX_TOKENS = 16000
const PROD_TIMEOUT_MS = 15000
const MAX_SCORE = 10
const PERCENT = 100
const REQUESTS_PER_COST_UNIT = 1000
const TOKENS_PER_MILLION = 1_000_000
const P95 = 0.95
const P50 = 0.5

const readFlag = (name: string): string | undefined => {
    const index = process.argv.indexOf(`--${name}`)
    return index === -1 ? undefined : process.argv[index + 1]
}

const shuffle = <T,>(items: T[]): T[] => {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
}

const mean = (values: number[]): number | null =>
    values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length

const percentile = (values: number[], p: number): number | null => {
    if (values.length === 0) return null
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
}

const isUsable = (r: RunRecord): boolean => !r.error
const isReliable = (r: RunRecord): boolean => isUsable(r) && r.completed && r.ms <= PROD_TIMEOUT_MS

// region Blind judge input

const JUDGE_INSTRUCTIONS = `You are an impartial judge. Below is the prompt that was sent to several AI models,
followed by each model's outputs (labeled model-1, model-2, ... ; up to 3 samples each). Models are
anonymous: do not guess which is which.

The product is Pulse, a recovery/wellness app. Score EACH model from 1 to 10 for how good its outputs are
as a user-facing message, considering all its samples:
- tone: calm, warm, supportive, non-clinical, not cheesy or preachy
- specificity: grounded in the data given in the prompt, not generic filler
- language: natural, native-sounding phrasing in the requested language (not translated-sounding)
- fit: respects what the prompt asked for (length, structure, what to mention or avoid)
An output that is cut off mid-sentence, empty, or breaks the requested format should score low.

Respond with ONLY valid JSON, no markdown fences, no text outside the JSON, in exactly this shape:
{ "model-1": { "score": 7, "note": "one short sentence" }, "model-2": { "score": 4, "note": "..." } }
Include every model label that appears.`

const buildJudgeInput = (
    scenario: string,
    prompt: string,
    outputs: Record<string, string[]>
): string => {
    const sections = Object.entries(outputs).map(([alias, texts]) =>
        `## ${alias}\n\n${texts.length === 0 ? '[no usable output]' : texts.map((t, i) => `Sample ${i + 1}:\n${t.trim()}`).join('\n\n')}`)
    return `# Scenario: ${scenario}\n\nPrompt sent to each model:\n\`\`\`\n${prompt}\n\`\`\`\n\n${sections.join('\n\n')}\n`
}

const prepareJudgeInput = (
    outDir: string,
    runs: RunRecord[],
    config: AuditConfig,
    scenarios: Array<{ name: string, prompt: string }>
): Record<string, string> => {
    const mappingPath = join(outDir, 'mapping.json')
    if (existsSync(mappingPath)) {
        return JSON.parse(readFileSync(mappingPath, 'utf-8')) as Record<string, string>
    }

    // Models with no usable output at all (e.g. unsupported endpoint) are not shown to judges.
    const judgeable = config.candidates
        .map(c => c.id)
        .filter(id => runs.some(r => r.model === id && isUsable(r)))
    const mapping: Record<string, string> = {}
    shuffle(judgeable).forEach((id, index) => {
        mapping[`model-${index + 1}`] = id
    })

    const inputDir = join(outDir, 'judge-input')
    mkdirSync(inputDir, { recursive: true })
    for (const scenario of scenarios) {
        const outputs: Record<string, string[]> = {}
        for (const [alias, id] of Object.entries(mapping)) {
            outputs[alias] = runs
                .filter(r => r.model === id && r.scenario === scenario.name && isUsable(r) && r.text.trim().length > 0)
                .sort((a, b) => a.rep - b.rep)
                .map(r => r.text)
        }
        writeFileSync(join(inputDir, `${scenario.name}.md`), buildJudgeInput(
            scenario.name,
            scenario.prompt,
            outputs
        ))
    }
    writeFileSync(
        join(inputDir, 'INSTRUCTIONS.md'),
        `${JUDGE_INSTRUCTIONS}\n\nOne input file per scenario in this folder (${scenarios.map(s => `${s.name}.md`).join(', ')}).\n`
        + 'Write ONE file verdicts/<judgeId>.json (next to this folder) shaped as { "<scenario>": { "model-1": { "score": n, "note": "..." } } }.\n'
    )
    writeFileSync(mappingPath, JSON.stringify(
        mapping,
        null,
        4
    ))
    return mapping
}

// endregion

// region Judging

const parseScores = (raw: string): Record<string, JudgeScore> => {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
    return JSON.parse(cleaned) as Record<string, JudgeScore>
}

const runApiJudge = async (
    judge: JudgeConfig,
    outDir: string,
    scenarioNames: string[]
): Promise<void> => {
    const verdict: JudgeVerdict = {}
    for (const name of scenarioNames) {
        const input = readFileSync(join(
            outDir,
            'judge-input',
            `${name}.md`
        ), 'utf-8')
        const result = await generate(
            judge.vendor,
            judge.id,
            `${input}\n\n${JUDGE_INSTRUCTIONS}`,
            JUDGE_MAX_TOKENS
        )
        try {
            if (result.error) throw new Error(result.error)
            verdict[name] = parseScores(result.text)
            console.info(`${judge.id} judged ${name} (${result.ms}ms)`)
        } catch (error) {
            console.error(`${judge.id} failed on ${name}: ${error instanceof Error ? error.message : 'unknown'} (finish=${result.finish})`)
        }
    }
    mkdirSync(join(outDir, 'verdicts'), { recursive: true })
    writeFileSync(join(
        outDir,
        'verdicts',
        `${judge.id}.json`
    ), JSON.stringify(
        verdict,
        null,
        2
    ))
}

const loadVerdicts = (outDir: string, judges: JudgeConfig[]): Record<string, JudgeVerdict> => {
    const verdicts: Record<string, JudgeVerdict> = {}
    for (const judge of judges) {
        const path = join(
            outDir,
            'verdicts',
            `${judge.id}.json`
        )
        if (existsSync(path)) verdicts[judge.id] = JSON.parse(readFileSync(path, 'utf-8')) as JudgeVerdict
    }
    return verdicts
}

// endregion

// region Report

type ModelStats = {
    candidate: Candidate
    calls: number
    errors: number
    cutoffs: number
    slow: number
    reliablePct: number
    obediencePct: number | null
    p50: number | null
    p95: number | null
    maxMs: number | null
    avgOut: number | null
    avgReasoning: number | null
    costPer1k: number | null
    judgeByJudge: Record<string, number | null>
    judgeMean: number | null
    crossVendorMean: number | null
    composite: number | null
    failingRules: string
    obedienceByScenario: Record<string, number | null>
}

const pct = (value: number | null): string => value === null ? 'n/a' : `${(value * PERCENT).toFixed(0)}%`
const num = (value: number | null, digits = 0): string => value === null ? 'n/a' : value.toFixed(digits)
const money = (value: number | null): string => value === null ? 'n/a' : `$${value.toFixed(value < 0.1 ? 4 : 3)}`

const scenarioObedience = (runs: RunRecord[]): number | null => {
    const checks = runs.filter(isUsable).flatMap(r => r.rules)
    return checks.length === 0 ? null : checks.filter(c => c.pass).length / checks.length
}

const computeStats = (
    candidate: Candidate,
    runs: RunRecord[],
    scenarioNames: string[],
    mapping: Record<string, string>,
    verdicts: Record<string, JudgeVerdict>,
    judges: JudgeConfig[]
): ModelStats => {
    const mine = runs.filter(r => r.model === candidate.id)
    const ok = mine.filter(isUsable)
    const costs = ok.map(r => candidate.inPerM === null || candidate.outPerM === null
        ? null
        : ((r.inputTokens * candidate.inPerM) + (r.outputTokens * candidate.outPerM)) / TOKENS_PER_MILLION)
    const aliasOf = Object.entries(mapping).find(([, id]) => id === candidate.id)?.[0]

    const judgeByJudge: Record<string, number | null> = {}
    for (const [judgeId, verdict] of Object.entries(verdicts)) {
        // A judge never scores its own model: self-preference would inflate it.
        if (judgeId === candidate.id || !aliasOf) {
            judgeByJudge[judgeId] = null
            continue
        }
        judgeByJudge[judgeId] = mean(scenarioNames
            .map(s => verdict[s]?.[aliasOf]?.score)
            .filter((s): s is number => typeof s === 'number'))
    }

    const failures: Record<string, number> = {}
    ok.flatMap(r => r.rules).filter(c => !c.pass).forEach((c) => {
        failures[c.rule] = (failures[c.rule] ?? 0) + 1
    })

    const obedienceByScenario: Record<string, number | null> = {}
    scenarioNames.forEach((s) => {
        obedienceByScenario[s] = scenarioObedience(mine.filter(r => r.scenario === s))
    })

    return {
        candidate,
        calls: mine.length,
        errors: mine.filter(r => !isUsable(r)).length,
        cutoffs: ok.filter(r => !r.completed).length,
        slow: ok.filter(r => r.ms > PROD_TIMEOUT_MS).length,
        reliablePct: mine.length === 0 ? 0 : mine.filter(isReliable).length / mine.length,
        obediencePct: scenarioObedience(mine),
        p50: percentile(ok.map(r => r.ms), P50),
        p95: percentile(ok.map(r => r.ms), P95),
        maxMs: ok.length === 0 ? null : Math.max(...ok.map(r => r.ms)),
        avgOut: mean(ok.map(r => r.outputTokens)),
        avgReasoning: mean(ok.map(r => r.reasoningTokens)),
        costPer1k: costs.some(c => c === null) || costs.length === 0 ? null : (mean(costs as number[]) as number) * REQUESTS_PER_COST_UNIT,
        judgeByJudge,
        judgeMean: mean(Object.values(judgeByJudge).filter((v): v is number => v !== null)),
        // Judges from other vendors only: a judge can favour its own vendor's style, not just its own model.
        crossVendorMean: mean(judges
            .filter(j => j.vendor !== candidate.vendor)
            .map(j => judgeByJudge[j.id])
            .filter((v): v is number => typeof v === 'number')),
        composite: null,
        failingRules: Object.entries(failures).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([rule, n]) => `${rule} x${n}`).join(', ') || 'none',
        obedienceByScenario
    }
}

const applyComposite = (stats: ModelStats[], weights: AuditConfig['weights']): void => {
    const eligible = stats.filter(s => s.calls > 0 && s.errors < s.calls)
    const costs = eligible.map(s => s.costPer1k).filter((v): v is number => v !== null && v > 0)
    const latencies = eligible.map(s => s.p50).filter((v): v is number => v !== null && v > 0)
    const minCost = costs.length ? Math.min(...costs) : null
    const minLatency = latencies.length ? Math.min(...latencies) : null

    for (const s of eligible) {
        if (s.judgeMean === null || s.obediencePct === null || s.costPer1k === null || s.p50 === null || minCost === null || minLatency === null) continue
        s.composite = (
            weights.quality * (s.judgeMean / MAX_SCORE)
            + weights.obedience * s.obediencePct
            + weights.reliability * s.reliablePct
            + weights.cost * (minCost / s.costPer1k)
            + weights.latency * (minLatency / s.p50)
        ) * PERCENT
    }
}

const buildReport = (
    runId: string,
    meta: {
        date: string
        reps: number
        promptsGitSha: string
    },
    config: AuditConfig,
    stats: ModelStats[],
    scenarioNames: string[],
    judges: JudgeConfig[],
    verdicts: Record<string, JudgeVerdict>
): string => {
    const ranked = [...stats].sort((a, b) => (b.composite ?? -1) - (a.composite ?? -1))
    const judgeCols = judges.map(j => j.id)
    const lines: string[] = [
        `# Model audit ${runId}`,
        '',
        `Run ${meta.date}. ${meta.reps} reps x ${scenarioNames.length} scenarios per model. Prompts at git ${meta.promptsGitSha}. Generation settings mirror prod (max tokens 1000; prod timeout 15 s counted as unreliable).`,
        `Prices checked ${config.pricingCheckedOn}. Judges present: ${Object.keys(verdicts).join(', ') || 'none'}${Object.keys(verdicts).length < judges.length ? ` (missing: ${judges.filter(j => !verdicts[j.id]).map(j => j.id).join(', ')})` : ''}.`,
        `Composite weights: ${Object.entries(config.weights).map(([k, v]) => `${k} ${v}`).join(', ')}. A judge never scores its own model.`,
        '',
        '## Ranking',
        '',
        `| # | Model | Composite | Judge mean | Cross-vendor mean | ${judgeCols.join(' | ')} | Rule pass | Reliable | Cutoffs | Errors | >15s | p50 ms | p95 ms | Slowest ms | Out tok | Reasoning tok | $ in / out per 1M tok | $/1k req |`,
        `|---|---|---|---|---|${judgeCols.map(() => '---').join('|')}|---|---|---|---|---|---|---|---|---|---|---|---|`
    ]
    ranked.forEach((s, i) => {
        lines.push(`| ${i + 1} | ${s.candidate.id} | ${num(s.composite, 1)} | ${num(s.judgeMean, 2)} | ${num(s.crossVendorMean, 2)} | ${judgeCols.map(j => num(s.judgeByJudge[j] ?? null, 2)).join(' | ')} | ${pct(s.obediencePct)} | ${pct(s.reliablePct)} | ${s.cutoffs} | ${s.errors} | ${s.slow} | ${num(s.p50)} | ${num(s.p95)} | ${num(s.maxMs)} | ${num(s.avgOut)} | ${num(s.avgReasoning)} | ${num(s.candidate.inPerM, 2)} / ${num(s.candidate.outPerM, 2)} | ${money(s.costPer1k)} |`)
    })
    lines.push(
        '',
        '## Rule pass by scenario',
        '',
        `| Model | ${scenarioNames.join(' | ')} | Most-failed rules |`,
        `|---|${scenarioNames.map(() => '---').join('|')}|---|`
    )
    ranked.forEach((s) => {
        lines.push(`| ${s.candidate.id} | ${scenarioNames.map(n => pct(s.obedienceByScenario[n])).join(' | ')} | ${s.failingRules} |`)
    })
    lines.push(
        '',
        '## Notes',
        '',
        '- Models with all calls failing are listed with Errors = calls and excluded from the composite.',
        '- "Reliable" = call succeeded, finished normally (not cut off) and under 15 s.',
        '- Rule pass is computed over successful calls only; see rules.ts for the checks per scenario kind.'
    )
    return lines.join('\n')
}

// endregion

const run = async (): Promise<void> => {
    const runId = readFlag('run-id')
    if (!runId) throw new Error('--run-id is required')
    const outDir = join(OUTPUT_ROOT, `audit-${runId}`)
    const config = JSON.parse(readFileSync(join(__dirname, 'candidates.json'), 'utf-8')) as AuditConfig
    const runs = JSON.parse(readFileSync(join(outDir, 'runs.json'), 'utf-8')) as RunRecord[]
    const meta = JSON.parse(readFileSync(join(outDir, 'meta.json'), 'utf-8')) as {
        date: string
        reps: number
        promptsGitSha: string
        scenarios: Array<{ name: string, prompt: string }>
    }
    const scenarioNames = meta.scenarios.map(s => s.name)

    const mapping = prepareJudgeInput(
        outDir,
        runs,
        config,
        meta.scenarios
    )

    if (!process.argv.includes('--report-only')) {
        const forced = readFlag('api-judge')
        for (const judge of config.judges) {
            const viaApi = judge.mode === 'api' || judge.id === forced
            if (!viaApi) {
                console.info(`${judge.id}: subagent judge, expects ${join(
                    outDir,
                    'verdicts',
                    `${judge.id}.json`
                )}`)
                continue
            }
            if (existsSync(join(
                outDir,
                'verdicts',
                `${judge.id}.json`
            ))) {
                console.info(`${judge.id}: verdict already present, skipping`)
                continue
            }
            await runApiJudge(judge, outDir, scenarioNames)
        }
    }

    const verdicts = loadVerdicts(outDir, config.judges)
    const stats = config.candidates
        .filter(c => runs.some(r => r.model === c.id))
        .map(c => computeStats(
            c,
            runs,
            scenarioNames,
            mapping,
            verdicts,
            config.judges
        ))
    applyComposite(stats, config.weights)

    const report = buildReport(
        runId,
        meta,
        config,
        stats,
        scenarioNames,
        config.judges,
        verdicts
    )
    writeFileSync(join(outDir, 'report.md'), report)
    console.info(`Wrote ${join(outDir, 'report.md')}`)
}

run().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
