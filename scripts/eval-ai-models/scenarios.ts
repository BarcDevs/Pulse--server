import { resolve } from 'path'
import { pathToFileURL } from 'url'

import type { GeneratedTextKind } from '../../src/constants/aiInsight/textLimits'
import type * as InsightsPrompts from '../../src/lib/aiInsight/prompts/insightsPrompts'
import type * as FeedbackPrompt from '../../src/lib/prompts/FeedbackPromptBuilder'
import type * as ObservationPrompt from '../../src/lib/prompts/ObservationPromptBuilder'
import type * as ProgressPromptBuilder from '../../src/lib/prompts/ProgressInsightPromptBuilder'
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
    textKind?: GeneratedTextKind
    observationType?: ObservationType
    feedbackMode?: 'FULL' | 'SOFT'
}

type PromptModules = {
    insights: typeof InsightsPrompts
    feedback: typeof FeedbackPrompt
    observation: typeof ObservationPrompt
    progress: typeof ProgressPromptBuilder
}

const loadFrom = async <T,>(srcRoot: string, relPath: string): Promise<T> =>
    await import(pathToFileURL(resolve(srcRoot, relPath)).href) as T

const loadPromptModules = async (srcRoot: string): Promise<PromptModules> => ({
    insights: await loadFrom(srcRoot, 'src/lib/aiInsight/prompts/insightsPrompts.ts'),
    feedback: await loadFrom(srcRoot, 'src/lib/prompts/FeedbackPromptBuilder.ts'),
    observation: await loadFrom(srcRoot, 'src/lib/prompts/ObservationPromptBuilder.ts'),
    progress: await loadFrom(srcRoot, 'src/lib/prompts/ProgressInsightPromptBuilder.ts')
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

export const buildScenarios = async (srcRoot: string): Promise<Scenario[]> => {
    const {
        feedback,
        insights,
        observation,
        progress
    } = await loadPromptModules(srcRoot)

    const languages = ['he', 'en'] as const
    const textScenarios = languages.flatMap((language): Scenario[] => [
        {
            name: `mood-drop-alert-${language}`,
            kind: 'insight-text',
            language,
            textKind: 'MOOD_DROP_ALERT' as GeneratedTextKind,
            prompt: insights.buildPromptByType(
                'MOOD_DROP_ALERT',
                decliningWeek,
                language,
                { moodTrend: [8, 7, 4] }
            )
        },
        {
            name: `motivational-${language}`,
            kind: 'insight-text',
            language,
            textKind: 'MOTIVATIONAL' as GeneratedTextKind,
            prompt: insights.buildPromptByType(
                'MOTIVATIONAL',
                steadyWeek,
                language,
                { currentStreak: 7 }
            )
        },
        {
            name: `weekly-summary-${language}`,
            kind: 'insight-text',
            language,
            textKind: 'WEEKLY_SUMMARY' as GeneratedTextKind,
            prompt: insights.buildPromptByType(
                'WEEKLY_SUMMARY',
                steadyWeek,
                language,
                {
                    currentStreak: 7,
                    checkInCount: 7
                }
            )
        },
        {
            name: `daily-observation-${language}`,
            kind: 'observation-json',
            language,
            textKind: 'DAILY_OBSERVATION' as GeneratedTextKind,
            observationType: 'activity_consistency',
            prompt: new observation.ObservationPromptBuilder().build(
                { type: 'activity_consistency', topActivity: 'הליכה' },
                language
            )
        },
        {
            name: `progress-summary-${language}`,
            kind: 'progress-text',
            language,
            textKind: 'PROGRESS_SUMMARY' as GeneratedTextKind,
            prompt: new progress.ProgressInsightPromptBuilder().build(
                {
                    current: {
                        averageMood: 6.9,
                        averagePain: 3.0,
                        activityConsistency: 0.71
                    },
                    previous: {
                        averageMood: 6.1,
                        averagePain: 3.6,
                        activityConsistency: 0.43
                    },
                    highlights: {
                        improvements: ['mood', 'activity consistency'],
                        regressions: []
                    }
                },
                language
            )
        }
    ])

    return [
        ...textScenarios,
        {
            name: 'checkin-feedback',
            kind: 'feedback-json',
            language: 'he',
            feedbackMode: 'FULL',
            prompt: new feedback.FeedbackPromptBuilder().build(
                {
                    intent: {
                        primaryReason: 'NEGATIVE_TREND',
                        severity: 'medium',
                        mode: 'FULL',
                        trendDuration: 3
                    },
                    context: {
                        recentCheckIns: [],
                        trend: { direction: 'down', duration: 3, gapDays: 0 },
                        highlights: [{ type: 'drop', value: 3 }]
                    }
                },
                'he'
            )
        }
    ]
}
