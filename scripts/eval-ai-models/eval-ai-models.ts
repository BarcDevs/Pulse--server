import { execSync } from 'child_process'
import {
    mkdirSync,
    readFileSync,
    writeFileSync
} from 'fs'
import { join, resolve } from 'path'

import { checkOutput } from './rules'
import { buildScenarios } from './scenarios'
import type { AuditConfig, RunRecord } from './types'
import { generate } from './vendors'

// Stage 1 of the model audit: run every candidate model on every scenario and record output,
// latency, tokens, finish reason and programmatic rule results. Stage 2 is judge-ai-outputs.ts.
// Process and how to repeat it: docs/AI-MODEL-AUDIT.md.
//
// Usage: npx tsx --env-file=.env scripts/eval-ai-models/eval-ai-models.ts
//   [--run-id <id>] [--src-root <dir>] [--reps <n>] [--only <modelId,modelId>] [--rescore] [--merge <runId,runId>]
// --src-root points at the checkout whose prompts are being audited (default: this repo).

const PER_VENDOR_CONCURRENCY = 3
const DEFAULT_REPS = 3
const OUTPUT_ROOT = 'eval-output'

const readFlag = (name: string): string | undefined => {
    const index = process.argv.indexOf(`--${name}`)
    return index === -1 ? undefined : process.argv[index + 1]
}

const runPool = async (tasks: Array<() => Promise<void>>, limit: number): Promise<void> => {
    let next = 0
    const worker = async (): Promise<void> => {
        while (next < tasks.length) {
            const index = next
            next += 1
            await tasks[index]()
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
}

const gitSha = (dir: string): string => {
    try {
        return execSync('git rev-parse --short HEAD', { cwd: dir }).toString().trim()
    } catch {
        return 'unknown'
    }
}

// Recompute rule results from the stored outputs after fixing rules.ts: no API calls, no cost.
const rescore = async (
    runId: string,
    srcRoot: string
): Promise<void> => {
    const runsPath = join(
        OUTPUT_ROOT,
        `audit-${runId}`,
        'runs.json'
    )
    const records = JSON.parse(readFileSync(runsPath, 'utf-8')) as RunRecord[]
    const scenarios = await buildScenarios(srcRoot)
    for (const record of records) {
        const scenario = scenarios.find(s => s.name === record.scenario)
        if (!scenario || record.error) continue
        record.rules = checkOutput(
            scenario,
            record.text
        )
    }
    writeFileSync(
        runsPath,
        JSON.stringify(
            records,
            null,
            2
        )
    )
    console.info(`Rescored ${records.length} runs in ${runsPath}`)
}

// Combine the outputs of earlier runs (same prompts) into one run, so a late candidate can be judged
// side by side with a shortlist: judge scores are relative to the models shown together.
const mergeRuns = (runIds: string[], newRunId: string): void => {
    const dirOf = (id: string): string => join(
        OUTPUT_ROOT,
        `audit-${id}`
    )
    const metas = runIds.map(id => JSON.parse(readFileSync(
        join(
            dirOf(id),
            'meta.json'
        ),
        'utf-8'
    )) as {
        promptsGitSha: string
        scenarios: Array<{ prompt: string }>
        candidates: AuditConfig['candidates']
    } & Record<string, unknown>)
    const samePrompts = metas.every(m => JSON.stringify(m.scenarios.map(sc => sc.prompt)) === JSON.stringify(metas[0].scenarios.map(sc => sc.prompt)))
    if (!samePrompts) throw new Error('Runs have different prompts, refusing to merge')
    const records = runIds.flatMap(id => JSON.parse(readFileSync(
        join(
            dirOf(id),
            'runs.json'
        ),
        'utf-8'
    )) as RunRecord[])
    mkdirSync(
        dirOf(newRunId),
        { recursive: true }
    )
    writeFileSync(
        join(
            dirOf(newRunId),
            'runs.json'
        ),
        JSON.stringify(
            records,
            null,
            2
        )
    )
    writeFileSync(
        join(
            dirOf(newRunId),
            'meta.json'
        ),
        JSON.stringify(
            {
                ...metas[0],
                runId: newRunId,
                mergedFrom: runIds,
                candidates: metas.flatMap(m => m.candidates)
            },
            null,
            2
        )
    )
    console.info(`Merged ${runIds.join(', ')} into ${dirOf(newRunId)} (${records.length} runs)`)
}

const run = async (): Promise<void> => {
    const config = JSON.parse(readFileSync(join(__dirname, 'candidates.json'), 'utf-8')) as AuditConfig
    const runId = readFlag('run-id') ?? new Date().toISOString().slice(0, 10)
    const srcRoot = resolve(readFlag('src-root') ?? process.cwd())
    const reps = Number(readFlag('reps') ?? DEFAULT_REPS)
    const only = readFlag('only')?.split(',')
    const candidates = config.candidates.filter(c => !only || only.includes(c.id))

    const mergeFlag = readFlag('merge')
    if (mergeFlag) {
        mergeRuns(
            mergeFlag.split(','),
            runId
        )
        return
    }

    if (process.argv.includes('--rescore')) {
        await rescore(
            runId,
            srcRoot
        )
        return
    }

    const scenarios = await buildScenarios(srcRoot)
    const outDir = join(OUTPUT_ROOT, `audit-${runId}`)
    mkdirSync(outDir, { recursive: true })

    const records: RunRecord[] = []
    const vendors = [...new Set(candidates.map(c => c.vendor))]

    // One pool per vendor so a slow vendor does not hold up the others.
    await Promise.all(vendors.map(async (vendor) => {
        const tasks = candidates
            .filter(c => c.vendor === vendor)
            .flatMap(candidate => scenarios.flatMap(scenario =>
                Array.from({ length: reps }, (_, rep) => async (): Promise<void> => {
                    const result = await generate(
                        vendor,
                        candidate.id,
                        scenario.prompt
                    )
                    const rules = result.error
                        ? [{ rule: 'call-succeeded', pass: false }]
                        : checkOutput(scenario, result.text)
                    records.push({
                        ...result,
                        model: candidate.id,
                        vendor,
                        scenario: scenario.name,
                        rep,
                        rules
                    })
                    console.info(`${candidate.id} / ${scenario.name} #${rep + 1}: ${result.error ?? result.finish} (${result.ms}ms)`)
                })))
        await runPool(tasks, PER_VENDOR_CONCURRENCY)
    }))

    writeFileSync(join(outDir, 'runs.json'), JSON.stringify(
        records,
        null,
        2
    ))
    writeFileSync(join(outDir, 'meta.json'), JSON.stringify(
        {
            runId,
            date: new Date().toISOString(),
            reps,
            srcRoot,
            promptsGitSha: gitSha(srcRoot),
            scenarios: scenarios.map(s => ({
                name: s.name,
                kind: s.kind,
                language: s.language,
                prompt: s.prompt
            })),
            candidates
        },
        null,
        2
    ))

    console.info(`Wrote ${records.length} runs to ${outDir}/runs.json. Next: judge-ai-outputs.ts --run-id ${runId}`)
}

run().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
