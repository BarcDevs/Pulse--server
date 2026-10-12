import type { CheckInType } from '../../types/data/CheckInType'
import type { InsightStats } from '../../types/insight'
import {
    calculateAverageMood,
    extractRecentNotes,
    formatWeeklyStatsLines,
    getTopActivities
} from '../aiInsight/prompts/insightsPromptHelpers'

import { PromptBuilder } from './PromptBuilder'
import { NO_SCORES_RULE } from './sharedInstructions'

export type WeeklySummaryPromptInput = {
    checkIns: CheckInType[]
    currentStreak?: number
    checkInCount?: number
    stats?: InsightStats
}

export class WeeklySummaryPromptBuilder extends PromptBuilder<WeeklySummaryPromptInput> {
    protected role(): string {
        return `You are a recovery support assistant for {{brandName}}.
Your role is to summarize recovery check-in patterns in a supportive and practical way.`
    }

    protected body(
        {
            checkIns,
            currentStreak,
            checkInCount,
            stats
        }: WeeklySummaryPromptInput,
        language?: string | null
    ): string {
        const avgMood = calculateAverageMood(checkIns)
        const topActivities = getTopActivities(
            checkIns,
            undefined,
            language
        )
        const notes = extractRecentNotes(checkIns)
        const displayStreak = stats?.currentStreak ?? currentStreak ?? 1
        const streakLabel = `${displayStreak} day${displayStreak > 1 ? 's' : ''}`
        const statsLines = stats
            ? formatWeeklyStatsLines(checkIns, stats)
            : ''

        return `Context:
- Check-ins analyzed: ${checkInCount || checkIns.length}
- Average mood: ${avgMood}
- Current streak: ${streakLabel}${stats?.longestStreak ? ` (best streak: ${stats.longestStreak} days)` : ''}
${statsLines}- Most common activities: ${topActivities || 'not enough activity data'}
- Notes from the user this week: ${notes || 'not available'}

Write a weekly reflection for the user.

Requirements:
- 3 sentences maximum
- Mention at least one real pattern from the data
- Recognize consistency or effort without exaggeration
- Offer one useful reflection, not vague inspiration
- Keep the tone supportive, calm, and non-judgmental
- Do not diagnose or make medical claims
- Avoid generic phrasing that could apply to anyone
${NO_SCORES_RULE}`
    }
}
