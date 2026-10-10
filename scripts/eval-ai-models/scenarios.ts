import { resolve } from 'path'
import { pathToFileURL } from 'url'

import { FEEDBACK_DETECTION } from '../../src/constants/feedback/detection'
import type * as InsightsPrompts from '../../src/lib/aiInsight/prompts/insightsPrompts'
import type * as ObservationPrompt from '../../src/lib/dailyObservation/observationPrompt'
import type * as ProgressPromptBuilder from '../../src/lib/progressInsights/promptBuilder'
import type { CheckInType } from '../../src/types/data/CheckInType'
import type { ObservationType } from '../../src/types/data/DailyObservationType'

export type ScenarioKind =
    | 'insight-text'
    | 'observation-json'
    | 'feedback-json'
    | 'progress-text'

export type Scenario = {
    name: string
    kind: ScenarioKind
    language: 'he' | 'en'
    prompt: string
    maxSentences?: number
    observationType?: ObservationType
    feedbackMode?: 'FULL' | 'SOFT'
}

type PromptModules = {
    insights: typeof InsightsPrompts
    observation: typeof ObservationPrompt
    progress: typeof ProgressPromptBuilder
}

const loadFrom = async <T,>(srcRoot: string, relPath: string): Promise<T> =>
    await import(pathToFileURL(resolve(srcRoot, relPath)).href) as T

const loadPromptModules = async (srcRoot: string): Promise<PromptModules> => ({
    insights: await loadFrom(srcRoot, 'src/lib/aiInsight/prompts/insightsPrompts.ts'),
    observation: await loadFrom(srcRoot, 'src/lib/dailyObservation/observationPrompt.ts'),
    progress: await loadFrom(srcRoot, 'src/lib/progressInsights/promptBuilder.ts')
})

const day = (offset: number): Date => new Date(Date.UTC(
    2026,
    9,
    10 - offset
))

const makeCheckIn = (
    offset: number,
    moodScore: number,
    painLevel: number,
    activities: string[],
    notes: string
): CheckInType => ({
    id: `audit-${offset}`,
    profileId: 'audit-profile',
    checkInDate: day(offset),
    moodScore,
    painLevel,
    activities,
    notes,
    createdAt: day(offset),
    insights: []
})

const decliningWeek: CheckInType[] = [
    makeCheckIn(
        0,
        4,
        5,
        [],
        'היה לי יום קשה, בקושי הצלחתי לקום מהמיטה'
    ),
    makeCheckIn(
        1,
        6,
        4,
        ['הליכה'],
        'ישנתי רע אבל יצאתי קצת לאוויר'
    ),
    makeCheckIn(
        2,
        7,
        3,
        ['יוגה', 'קריאה'],
        'יום סביר'
    ),
    makeCheckIn(
        3,
        8,
        3,
        ['הליכה', 'כתיבה'],
        'הרגשתי טוב, נפגשתי עם חברה'
    ),
    makeCheckIn(
        4,
        7,
        3,
        ['יוגה'],
        ''
    )
]

const steadyWeek: CheckInType[] = [
    makeCheckIn(
        0,
        7,
        3,
        ['הליכה', 'קריאה'],
        'יום שקט ונעים'
    ),
    makeCheckIn(
        1,
        7,
        2,
        ['יוגה'],
        'ישנתי טוב'
    ),
    makeCheckIn(
        2,
        6,
        3,
        ['הליכה'],
        'קצת עייפות אחר הצהריים'
    ),
    makeCheckIn(
        3,
        8,
        2,
        ['כתיבה', 'הליכה'],
        ''
    ),
    makeCheckIn(
        4,
        7,
        3,
        ['יוגה', 'קריאה'],
        'נהניתי מהבוקר'
    ),
    makeCheckIn(
        5,
        6,
        4,
        ['הליכה'],
        'כאבי גב קלים'
    ),
    makeCheckIn(
        6,
        7,
        3,
        ['יוגה'],
        ''
    )
]

// Copied from src/services/feedback/aiRenderer.ts buildAIPrompt (private there).
// Re-sync when that function changes.
const buildFeedbackPrompt = (
    mode: 'FULL' | 'SOFT',
    severityLabel: string,
    reasonText: string,
    userLanguage: string,
    direction: string,
    duration: number,
    highlightTypes: string[],
    gapDays: number
): string => {
    const structure = mode === 'FULL'
        ? {
            acknowledge: 'string',
            normalize: 'string',
            suggest: 'string'
        }
        : { acknowledge: 'string', normalize: 'string' }
    const structureJson = JSON.stringify(
        structure,
        null,
        2
    )

    return `You are a compassionate health support assistant.
    Generate a supportive message for a user
    experiencing a ${severityLabel} ${reasonText}.

CONSTRAINTS:
- Language: ${userLanguage}
- Tone: supportive, non-clinical (no medical claims), concise, non-judgmental
- Return ONLY valid JSON with this exact structure:
${structureJson}

CONTEXT:
- Trend direction: ${direction}
  over ${duration} day(s)
- Recent patterns: ${highlightTypes.join(', ') || 'stable'}${gapDays >= FEEDBACK_DETECTION.TREND.GAP_DAYS_THRESHOLD
        ? `\n- Note: ${gapDays} day gap since a prior check-in, do not imply a continuous trend`
        : ''}

MESSAGE STRUCTURE:
- acknowledge: Validate their experience (1 sentence)
- normalize: Normalize their struggle as part of recovery (1 sentence)
${mode === 'FULL'
        ? '- suggest: Offer gentle guidance (1 sentence, optional)'
        : ''}

Generate the message now:`
}

export const buildScenarios = async (srcRoot: string): Promise<Scenario[]> => {
    const {
        insights,
        observation,
        progress
    } = await loadPromptModules(srcRoot)

    return [
        {
            name: 'mood-drop-alert',
            kind: 'insight-text',
            language: 'he',
            maxSentences: 3,
            prompt: insights.buildPromptByType(
                'MOOD_DROP_ALERT',
                decliningWeek,
                'he',
                { moodTrend: [8, 7, 4] }
            )
        },
        {
            name: 'motivational',
            kind: 'insight-text',
            language: 'he',
            maxSentences: 2,
            prompt: insights.buildPromptByType(
                'MOTIVATIONAL',
                steadyWeek,
                'he',
                { currentStreak: 7 }
            )
        },
        {
            name: 'weekly-summary',
            kind: 'insight-text',
            language: 'he',
            maxSentences: 3,
            prompt: insights.buildPromptByType(
                'WEEKLY_SUMMARY',
                steadyWeek,
                'he',
                {
                    currentStreak: 7,
                    checkInCount: 7
                }
            )
        },
        {
            name: 'daily-observation',
            kind: 'observation-json',
            language: 'he',
            observationType: 'activity_consistency',
            prompt: observation.buildObservationPrompt({
                type: 'activity_consistency',
                topActivity: 'הליכה',
                language: 'he'
            })
        },
        {
            name: 'progress-summary',
            kind: 'progress-text',
            language: 'en',
            prompt: progress.buildProgressInsightPrompt(
                {
                    averageMood: 6.9,
                    averagePain: 3.0,
                    activityConsistency: 0.71
                },
                {
                    averageMood: 6.1,
                    averagePain: 3.6,
                    activityConsistency: 0.43
                },
                { improvements: ['mood', 'activity consistency'], regressions: [] }
            )
        },
        {
            name: 'checkin-feedback',
            kind: 'feedback-json',
            language: 'he',
            feedbackMode: 'FULL',
            prompt: buildFeedbackPrompt(
                'FULL',
                'moderate',
                'negative trend',
                'Hebrew',
                'down',
                3,
                ['drop'],
                0
            )
        }
    ]
}
