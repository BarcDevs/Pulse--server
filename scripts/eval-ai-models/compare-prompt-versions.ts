import {
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync
} from 'fs'
import { join, resolve } from 'path'
import { pathToFileURL } from 'url'

import { sanitizeGeneratedText } from '../../src/lib/aiInsight/validation/validationHelpers'
import type { CheckInType } from '../../src/types/data/CheckInType'

import { generate, type Vendor } from './vendors'

// Before/after comparison of two prompt versions over many situations, judged blind by a GPT model.
// One scenario per kind says little, so this runs several situations x reps per kind, language and model,
// pairs rep i of "before" with rep i of "after", and reports mean judge scores with a bootstrap interval.
//
// Usage: npx tsx --env-file=.env scripts/eval-ai-models/compare-prompt-versions.ts --run-id <id>
//   --before-root <dir>   checkout of the old prompts (default eval-output/baseline-src)
//   [--reps <n>] [--judge <modelId>] [--only <text>]  (only items whose key contains <text>) [--phase generate|judge|report|all]
// Outputs to eval-output/compare-<id>/.

const OUTPUT_ROOT = 'eval-output'
const MODELS: Array<{ id: string, vendor: Vendor }> = [
    { id: 'gpt-6.1-sol', vendor: 'openai' },
    { id: 'gemini-3.1-flash-lite', vendor: 'google' }
]
const DEFAULT_JUDGE = 'gpt-5.6-terra'
const DEFAULT_REPS = 3
const CONCURRENCY = 4
const BOOTSTRAP_ROUNDS = 2000
const CRITERIA = ['warmth_naturalness', 'specificity', 'usefulness', 'low_energy_fit'] as const

type Language = 'he' | 'en'
type Version = 'before' | 'after'
type Kind = 'MOOD_DROP_ALERT' | 'MOTIVATIONAL' | 'WEEKLY_SUMMARY' | 'PROGRESS_SUMMARY' | 'DAILY_OBSERVATION'

type Row = {
    mood: number
    pain: number
    he: { acts: string[], note: string }
    en: { acts: string[], note: string }
}

type Situation = {
    id: string
    rows: Row[]
}

type Item = {
    key: string
    kind: Kind
    language: Language
    situation: string
    observationType?: string
    prompt: Record<Version, string>
    description: string
}

type Generation = {
    key: string
    model: string
    rep: number
    version: Version
    text: string
    error?: string
}

type Judgment = {
    key: string
    model: string
    rep: number
    before?: number
    after?: number
    error?: string
}

type PromptModules = {
    insights: { buildPromptByType: (type: string, checkIns: CheckInType[], language: string, metadata?: object) => string }
    observation: { ObservationPromptBuilder: new () => { build: (input: object, language: string) => string } }
    progress: { ProgressInsightPromptBuilder: new () => { build: (input: object, language: string) => string } }
}

const row = (
    mood: number,
    pain: number,
    heActs: string[],
    heNote: string,
    enActs: string[],
    enNote: string
): Row => ({
    mood,
    pain,
    he: { acts: heActs, note: heNote },
    en: { acts: enActs, note: enNote }
})

// Newest first, like getCheckIns. One line per check-in, so the call-breaking rule is off for the table.
/* eslint-disable custom-rules/enforce-function-call-breaking */
const SITUATIONS: Situation[] = [
    {
        id: 'declining',
        rows: [
            row(4, 5, [], 'היה לי יום קשה, בקושי קמתי מהמיטה', [], 'Hard day, barely got out of bed'),
            row(6, 4, ['הליכה'], 'קצת עייפות', ['walking'], 'a bit tired'),
            row(7, 3, ['יוגה'], 'ישנתי לא טוב', ['yoga'], 'slept badly'),
            row(8, 3, ['הליכה', 'קריאה'], 'יום נעים', ['walking', 'reading'], 'pleasant day'),
            row(8, 2, ['יוגה'], 'נפגשתי עם חברה', ['yoga'], 'met a friend'),
            row(7, 3, ['הליכה'], '', ['walking'], ''),
            row(8, 2, ['קריאה'], 'הרגשתי טוב', ['reading'], 'felt good')
        ]
    },
    {
        id: 'steady',
        rows: [
            row(7, 3, ['הליכה', 'קריאה'], 'יום שקט ונעים', ['walking', 'reading'], 'quiet, pleasant day'),
            row(7, 2, ['יוגה'], 'ישנתי טוב', ['yoga'], 'slept well'),
            row(6, 3, ['הליכה'], 'קצת עייפות אחר הצהריים', ['walking'], 'a bit tired in the afternoon'),
            row(8, 2, ['כתיבה', 'הליכה'], '', ['writing', 'walking'], ''),
            row(7, 3, ['יוגה', 'קריאה'], 'נהניתי מהבוקר', ['yoga', 'reading'], 'enjoyed the morning'),
            row(6, 4, ['הליכה'], 'כאבי גב קלים', ['walking'], 'mild back pain'),
            row(7, 3, ['יוגה'], '', ['yoga'], '')
        ]
    },
    {
        id: 'recovering',
        rows: [
            row(7, 2, ['הליכה', 'שחייה'], 'הצלחתי לשחות היום', ['walking', 'swimming'], 'managed to swim today'),
            row(6, 3, ['הליכה'], 'יותר אנרגיה', ['walking'], 'more energy'),
            row(5, 4, ['יוגה'], '', ['yoga'], ''),
            row(5, 5, [], 'יום איטי', [], 'slow day'),
            row(4, 6, [], 'כואב, נשארתי בבית', [], 'in pain, stayed home'),
            row(3, 7, [], 'לילה קשה', [], 'rough night'),
            row(3, 7, [], '', [], '')
        ]
    },
    {
        id: 'noisy',
        rows: [
            row(7, 3, ['הליכה'], 'יום סביר', ['walking'], 'an okay day'),
            row(3, 6, [], 'הכל הרגיש כבד', [], 'everything felt heavy'),
            row(6, 4, ['יוגה'], '', ['yoga'], ''),
            row(4, 5, ['קריאה'], 'לחוץ בעבודה', ['reading'], 'stressed at work'),
            row(7, 3, ['הליכה', 'יוגה'], 'שיחה טובה עם אחי', ['walking', 'yoga'], 'good talk with my brother'),
            row(5, 4, [], '', [], ''),
            row(6, 4, ['הליכה'], '', ['walking'], '')
        ]
    },
    {
        id: 'plateau-low',
        rows: [
            row(4, 6, ['הליכה'], 'עוד יום אותו דבר', ['walking'], 'same as yesterday'),
            row(4, 6, [], '', [], ''),
            row(5, 6, ['פיזיותרפיה'], 'פיזיותרפיה עזרה קצת', ['physiotherapy'], 'physio helped a little'),
            row(4, 7, [], 'קשה להתרכז', [], 'hard to concentrate'),
            row(4, 6, ['הליכה'], '', ['walking'], ''),
            row(5, 6, [], '', [], ''),
            row(4, 7, [], 'עייף', [], 'tired')
        ]
    },
    {
        id: 'sparse',
        rows: [
            row(6, 4, ['הליכה'], '', ['walking'], ''),
            row(5, 5, [], '', [], ''),
            row(6, 4, ['יוגה'], 'ניסיתי יוגה קלה', ['yoga'], 'tried gentle yoga')
        ]
    }
]

/* eslint-enable custom-rules/enforce-function-call-breaking */

const OBSERVATION_TYPES = [
    'activity_consistency',
    'pain_improvement',
    'better_days_pattern',
    'mood_stability',
    'streak_consistency',
    'checkin_consistency'
]

const readFlag = (name: string): string | undefined => {
    const index = process.argv.indexOf(`--${name}`)
    return index === -1 ? undefined : process.argv[index + 1]
}

const loadFrom = async <T,>(root: string, relPath: string): Promise<T> =>
    await import(pathToFileURL(resolve(root, relPath)).href) as T

const loadModules = async (root: string): Promise<PromptModules> => ({
    insights: await loadFrom(root, 'src/lib/aiInsight/prompts/insightsPrompts.ts'),
    observation: await loadFrom(root, 'src/lib/prompts/ObservationPromptBuilder.ts'),
    progress: await loadFrom(root, 'src/lib/prompts/ProgressInsightPromptBuilder.ts')
})

const toCheckIns = (situation: Situation, language: Language): CheckInType[] =>
    situation.rows.map((r, offset) => {
        const date = new Date(Date.UTC(2026, 9, 10 - offset))
        return {
            id: `cmp-${situation.id}-${offset}`,
            profileId: 'cmp-profile',
            checkInDate: date,
            moodScore: r.mood,
            painLevel: r.pain,
            activities: r[language].acts,
            notes: r[language].note,
            createdAt: date,
            insights: []
        }
    })

const average = (values: number[]): number =>
    values.reduce((a, b) => a + b, 0) / values.length

const metricsFor = (rows: Row[]): { averageMood: number, averagePain: number, activityConsistency: number } => ({
    averageMood: average(rows.map(r => r.mood)),
    averagePain: average(rows.map(r => r.pain)),
    activityConsistency: rows.filter(r => r.he.acts.length > 0).length / rows.length
})

const describeSituation = (situation: Situation, language: Language): string =>
    situation.rows
        .map((r, i) => `${i === 0 ? 'latest' : `${i} day(s) earlier`}: mood ${r.mood}/10, pain ${r.pain}/10, activities [${r[language].acts.join(', ')}], note "${r[language].note}"`)
        .join('\n')

const buildItems = async (beforeRoot: string): Promise<Item[]> => {
    const before = await loadModules(beforeRoot)
    const after = await loadModules(process.cwd())
    const items: Item[] = []
    const languages: Language[] = ['he', 'en']

    for (const language of languages) {
        const situations = language === 'he' ? SITUATIONS : SITUATIONS.slice(0, 4)
        for (const situation of situations) {
            const checkIns = toCheckIns(situation, language)
            const description = describeSituation(situation, language)
            const moodTrend = situation.rows.slice(0, 3).map(r => r.mood).reverse()
            const metadataByKind = {
                MOOD_DROP_ALERT: { moodTrend },
                MOTIVATIONAL: { currentStreak: situation.rows.length },
                WEEKLY_SUMMARY: { currentStreak: situation.rows.length, checkInCount: situation.rows.length }
            }
            for (const type of ['MOOD_DROP_ALERT', 'MOTIVATIONAL', 'WEEKLY_SUMMARY'] as const) {
                items.push({
                    key: `${type}-${language}-${situation.id}`,
                    kind: type,
                    language,
                    situation: situation.id,
                    description,
                    prompt: {
                        before: before.insights.buildPromptByType(type, checkIns, language, metadataByKind[type]),
                        after: after.insights.buildPromptByType(type, checkIns, language, metadataByKind[type])
                    }
                })
            }
            const current = metricsFor(situation.rows.slice(0, Math.ceil(situation.rows.length / 2)))
            const previous = metricsFor(situation.rows.slice(Math.ceil(situation.rows.length / 2)))
            const progressInput = {
                current,
                previous,
                highlights: { improvements: [], regressions: [] }
            }
            items.push({
                key: `PROGRESS_SUMMARY-${language}-${situation.id}`,
                kind: 'PROGRESS_SUMMARY',
                language,
                situation: situation.id,
                description,
                prompt: {
                    before: new before.progress.ProgressInsightPromptBuilder().build(progressInput, language),
                    after: new after.progress.ProgressInsightPromptBuilder().build(progressInput, language)
                }
            })
        }
        for (const type of OBSERVATION_TYPES) {
            const input = { type, topActivity: language === 'he' ? 'הליכה' : 'walking' }
            items.push({
                key: `DAILY_OBSERVATION-${language}-${type}`,
                kind: 'DAILY_OBSERVATION',
                language,
                situation: type,
                observationType: type,
                description: `Detected pattern: ${type}${type === 'activity_consistency' ? ` (${input.topActivity})` : ''}`,
                prompt: {
                    before: new before.observation.ObservationPromptBuilder().build(input, language),
                    after: new after.observation.ObservationPromptBuilder().build(input, language)
                }
            })
        }
    }
    return items
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

// The observation reply is JSON; the user sees title and description together
const visibleText = (item: Item, text: string): string | null => {
    const clean = sanitizeGeneratedText(text.trim())
    if (item.kind !== 'DAILY_OBSERVATION') return clean
    try {
        const obj = JSON.parse(clean) as { observation?: string, supportiveDescription?: string }
        if (!obj.observation || !obj.supportiveDescription) return null
        return `${obj.observation}\n${obj.supportiveDescription}`
    } catch {
        return null
    }
}

const generateAll = async (items: Item[], reps: number, outDir: string): Promise<Generation[]> => {
    const results: Generation[] = []
    for (const model of MODELS) {
        const tasks = items.flatMap(item => (['before', 'after'] as Version[]).flatMap(version =>
            Array.from({ length: reps }, (_, rep) => async (): Promise<void> => {
                const result = await generate(model.vendor, model.id, item.prompt[version])
                results.push({
                    key: item.key,
                    model: model.id,
                    rep,
                    version,
                    text: result.text,
                    ...(result.error && { error: result.error })
                })
            })))
        await runPool(tasks, CONCURRENCY)
        console.info(`generated ${model.id}`)
    }
    writeFileSync(join(outDir, 'generations.json'), JSON.stringify(results, null, 2))
    return results
}

const PURPOSE: Record<Kind, string> = {
    MOOD_DROP_ALERT: 'a gentle note shown after the user\'s mood dropped over their last three check-ins',
    MOTIVATIONAL: 'a short encouragement shown after a check-in',
    WEEKLY_SUMMARY: 'a weekly reflection shown after a check-in',
    PROGRESS_SUMMARY: 'a short summary of this week compared with last week on the progress screen',
    DAILY_OBSERVATION: 'a daily observation card: a short bold title and a gray supporting line under it'
}

const judgePrompt = (item: Item, first: string, second: string): string => `You are an impartial judge of short user-facing messages in Pulse, a recovery and rehabilitation wellness app. The readers are people recovering from injury or illness, often tired, with little energy to read.

Message purpose: ${PURPOSE[item.kind]}.
Language of the message: ${item.language === 'he' ? 'Hebrew (judge as a native Hebrew speaker; penalize translation-sounding or stiff phrasing and wrong gender forms)' : 'English'}.

The situation the message was written for:
${item.description}

Two candidate messages for the same situation follow. Do not guess where they came from.

### Message 1
${first}

### Message 2
${second}

Score each message from 1 to 10 on:
- warmth_naturalness: warm, human, natural native phrasing
- specificity: grounded in this situation, not generic filler
- usefulness: worth reading; a real reflection or a gentle next step where one fits; nothing unsupported by the data
- low_energy_fit: suits a tired reader (short and plain is good, but not if the point is lost)
Penalize anything cut off, preachy, medically risky, or claiming more than the data shows.

Respond with ONLY valid JSON, no fences: {"message1":{"warmth_naturalness":n,"specificity":n,"usefulness":n,"low_energy_fit":n},"message2":{...},"preferred":"1"|"2"|"tie"}`

type JudgeReply = {
    message1: Record<(typeof CRITERIA)[number], number>
    message2: Record<(typeof CRITERIA)[number], number>
}

const parseJudge = (text: string): JudgeReply | null => {
    const match = text.match(/\{[\s\S]*}/)
    if (!match) return null
    try {
        const parsed = JSON.parse(match[0]) as JudgeReply
        const ok = CRITERIA.every(c => typeof parsed.message1?.[c] === 'number' && typeof parsed.message2?.[c] === 'number')
        return ok ? parsed : null
    } catch {
        return null
    }
}

const overall = (scores: Record<(typeof CRITERIA)[number], number>): number =>
    average(CRITERIA.map(c => scores[c]))

const judgeAll = async (items: Item[], generations: Generation[], judgeId: string, outDir: string): Promise<Judgment[]> => {
    const byKey = new Map(items.map(i => [i.key, i]))
    const judgments: Judgment[] = []
    const tasks: Array<() => Promise<void>> = []
    const lookup = new Map(generations.map(g => [`${g.key}|${g.model}|${g.rep}|${g.version}`, g]))

    for (const model of MODELS) {
        for (const item of byKey.values()) {
            const reps = new Set(generations.filter(g => g.key === item.key && g.model === model.id).map(g => g.rep))
            for (const rep of reps) {
                tasks.push(async (): Promise<void> => {
                    const b = lookup.get(`${item.key}|${model.id}|${rep}|before`)
                    const a = lookup.get(`${item.key}|${model.id}|${rep}|after`)
                    const beforeText = b && !b.error ? visibleText(item, b.text) : null
                    const afterText = a && !a.error ? visibleText(item, a.text) : null
                    if (!beforeText || !afterText) {
                        judgments.push({ key: item.key, model: model.id, rep, error: 'missing or malformed output' })
                        return
                    }
                    const afterFirst = Math.random() < 0.5
                    const result = await generate(
                        'openai',
                        judgeId,
                        judgePrompt(item, afterFirst ? afterText : beforeText, afterFirst ? beforeText : afterText)
                    )
                    const reply = result.error ? null : parseJudge(result.text)
                    if (!reply) {
                        judgments.push({ key: item.key, model: model.id, rep, error: result.error ?? 'unparseable judge reply' })
                        return
                    }
                    const first = overall(reply.message1)
                    const second = overall(reply.message2)
                    judgments.push({
                        key: item.key,
                        model: model.id,
                        rep,
                        after: afterFirst ? first : second,
                        before: afterFirst ? second : first
                    })
                })
            }
        }
    }
    await runPool(tasks, CONCURRENCY)
    writeFileSync(join(outDir, 'judgments.json'), JSON.stringify(judgments, null, 2))
    return judgments
}

const bootstrapInterval = (diffs: number[]): [number, number] => {
    const means = Array.from({ length: BOOTSTRAP_ROUNDS }, () =>
        average(diffs.map(() => diffs[Math.floor(Math.random() * diffs.length)]))).sort((a, b) => a - b)
    return [means[Math.floor(BOOTSTRAP_ROUNDS * 0.025)], means[Math.floor(BOOTSTRAP_ROUNDS * 0.975)]]
}

const report = (items: Item[], generations: Generation[], judgments: Judgment[], outDir: string): void => {
    const itemOf = new Map(items.map(i => [i.key, i]))
    const lines: string[] = ['| Group | n | before | after | diff (95% CI) | after wins / ties / before wins | malformed before / after |', '|---|---|---|---|---|---|---|']
    const groupOf = (j: Judgment): string => {
        const item = itemOf.get(j.key) as Item
        return `${item.kind} ${item.language} ${j.model}`
    }
    const groups = [...new Set(judgments.map(groupOf))].sort()
    const section = (label: string, rows: Judgment[], gens: Generation[]): void => {
        const valid = rows.filter(r => r.before !== undefined && r.after !== undefined) as Required<Pick<Judgment, 'before' | 'after'>>[]
        const diffs = valid.map(r => r.after - r.before)
        const wins = diffs.filter(d => d > 0.25).length
        const losses = diffs.filter(d => d < -0.25).length
        const bad = (v: Version): number => gens.filter(g => g.version === v && (g.error || !visibleText(itemOf.get(g.key) as Item, g.text))).length
        const total = gens.filter(g => g.version === 'before').length
        if (diffs.length === 0) {
            lines.push(`| ${label} | 0 | - | - | - | - | ${bad('before')}/${total} / ${bad('after')}/${total} |`)
            return
        }
        const [low, high] = bootstrapInterval(diffs)
        lines.push(`| ${label} | ${diffs.length} | ${average(valid.map(r => r.before)).toFixed(2)} | ${average(valid.map(r => r.after)).toFixed(2)} | ${average(diffs).toFixed(2)} (${low.toFixed(2)} to ${high.toFixed(2)}) | ${wins} / ${diffs.length - wins - losses} / ${losses} | ${bad('before')}/${total} / ${bad('after')}/${total} |`)
    }
    for (const group of groups) {
        const rows = judgments.filter(j => groupOf(j) === group)
        const [kind, language, model] = group.split(' ')
        const gens = generations.filter(g => {
            const item = itemOf.get(g.key) as Item
            return item.kind === kind && item.language === language && g.model === model
        })
        section(group, rows, gens)
    }
    for (const language of ['he', 'en']) {
        for (const model of MODELS) {
            const rows = judgments.filter(j => (itemOf.get(j.key) as Item).language === language && j.model === model.id)
            const gens = generations.filter(g => (itemOf.get(g.key) as Item).language === language && g.model === model.id)
            section(`**ALL ${language} ${model.id}**`, rows, gens)
        }
    }
    section('**ALL**', judgments, generations)
    writeFileSync(join(outDir, 'report.md'), `${lines.join('\n')}\n`)
    console.info(lines.join('\n'))
}

const run = async (): Promise<void> => {
    const runId = readFlag('run-id') ?? new Date().toISOString().slice(0, 10)
    const phase = readFlag('phase') ?? 'all'
    const reps = Number(readFlag('reps') ?? DEFAULT_REPS)
    const judgeId = readFlag('judge') ?? DEFAULT_JUDGE
    const beforeRoot = readFlag('before-root') ?? join(OUTPUT_ROOT, 'baseline-src')
    const outDir = join(OUTPUT_ROOT, `compare-${runId}`)
    mkdirSync(outDir, { recursive: true })

    const only = readFlag('only')
    const items = (await buildItems(beforeRoot)).filter(item => !only || item.key.includes(only))
    writeFileSync(join(outDir, 'items.json'), JSON.stringify(items, null, 2))

    const read = <T,>(name: string): T => JSON.parse(readFileSync(join(outDir, name), 'utf-8')) as T
    const generations = phase === 'judge' || phase === 'report' ? read<Generation[]>('generations.json') : await generateAll(items, reps, outDir)
    if (phase === 'generate') return
    const judgments = phase === 'report' && existsSync(join(outDir, 'judgments.json'))
        ? read<Judgment[]>('judgments.json')
        : await judgeAll(items, generations, judgeId, outDir)
    report(items, generations, judgments, outDir)
}

run().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
