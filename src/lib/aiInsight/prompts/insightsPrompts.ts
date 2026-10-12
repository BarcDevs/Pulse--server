import { getMessages } from '../../../locales'
import type { CheckInType } from '../../../types/data/CheckInType'
import type { InsightStats, InsightType } from '../../../types/insight'
import { MoodDropPromptBuilder } from '../../prompts/MoodDropPromptBuilder'
import { MotivationalPromptBuilder } from '../../prompts/MotivationalPromptBuilder'
import { WeeklySummaryPromptBuilder } from '../../prompts/WeeklySummaryPromptBuilder'

// region Title & Dispatcher

export const generateTitle = (
    insightType: InsightType,
    language?: string | null
): string =>
    getMessages(language)
        .insights.titles[insightType]

export const buildPromptByType = (
    insightType: InsightType,
    checkIns: CheckInType[],
    language?: string | null,
    metadata?: {
        currentStreak?: number
        moodTrend?: number[]
        checkInCount?: number
        stats?: InsightStats
    }
): string => {
    switch (insightType) {
        case 'MOOD_DROP_ALERT':
            return new MoodDropPromptBuilder().build(
                { checkIns, moodTrend: metadata?.moodTrend },
                language
            )

        case 'MOTIVATIONAL':
            return new MotivationalPromptBuilder().build(
                {
                    checkIns,
                    currentStreak:
                        metadata?.stats?.currentStreak ?? metadata?.currentStreak,
                    longestStreak: metadata?.stats?.longestStreak
                },
                language
            )

        case 'WEEKLY_SUMMARY':
            return new WeeklySummaryPromptBuilder().build(
                {
                    checkIns,
                    currentStreak: metadata?.currentStreak,
                    checkInCount: metadata?.checkInCount,
                    stats: metadata?.stats
                },
                language
            )

        case 'BAD_DAY_SUPPORT':
            throw new Error(
                'BAD_DAY_SUPPORT insights are generated directly, not via AI'
            )

        default:
            throw new Error(`Unknown insight type: ${insightType}`)
    }
}

// endregion
