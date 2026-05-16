import { getMessages, resolveLanguage } from '../../../locales'
import type { CheckInType } from '../../../types/data/CheckInType'
import type { InsightType } from '../../../types/insight'

import {
    calculateAverageMood,
    extractRecentActivities,
    formatMoodTrend,
    formatStreakLine,
    getLatestMood,
    getTopActivities
} from './insightsPromptHelpers'

const languageInstruction = (
    language?: string | null
): string =>
    `Respond entirely in ${resolveLanguage(language)}. Write naturally for native speakers of that language.`

// region Prompt Builders

export const buildPromptForMoodDropAlert = (
    checkIns: CheckInType[],
    language?: string | null,
    moodTrend?: number[]
): string => {
    const recentMoods = formatMoodTrend(moodTrend)
    const activities = extractRecentActivities(checkIns)

    return `
You are a recovery support assistant for HealEase.
Your role is to help users reflect on recovery patterns in a calm, supportive, non-clinical way.
${languageInstruction(language)}

Context:
- The user's mood has decreased across their latest 3 check-ins
- Recent mood trend: ${recentMoods}
- Recent activities mentioned: ${activities || 'not available'}

Write a short insight for the user.

Requirements:
- 2 to 3 sentences only
- Acknowledge the downward mood pattern gently
- Encourage reflection on what may have changed recently
- Suggest one supportive next step, without sounding alarming
- Do not diagnose, do not use medical language, and do not sound like a crisis warning
- Avoid generic filler like "take it one day at a time" unless clearly relevant
- Make it feel human, calm, and specific to a recovery journey

Output only the final message text.
`.trim()
}

export const buildPromptForMotivational = (
    checkIns: CheckInType[],
    language?: string | null,
    currentStreak?: number
): string => {
    const streakLine = formatStreakLine(currentStreak)
    const latestMood = getLatestMood(checkIns)

    return `
You are a recovery support assistant for HealEase.
Your role is to encourage consistency without sounding cheesy or exaggerated.
${languageInstruction(language)}

Context:
- ${streakLine}
- Latest mood score: ${latestMood}

Write a short motivational insight for the user.

Requirements:
- 2 sentences maximum
- Recognize the effort of checking in
- Reinforce that consistent tracking helps users notice patterns in recovery
- Keep the tone warm, grounded, and respectful
- Avoid hype, clichés, and over-the-top praise
- Do not sound generic

Output only the final message text.
`.trim()
}

export const buildPromptForWeeklySummary = (
    checkIns: CheckInType[],
    language?: string | null,
    currentStreak?: number,
    checkInCount?: number
): string => {
    const avgMood = calculateAverageMood(checkIns)
    const topActivities = getTopActivities(checkIns)
    const displayStreak = currentStreak ?? 1
    const streakLabel = `${displayStreak} day${displayStreak > 1 ? 's' : ''}`

    return `
You are a recovery support assistant for HealEase.
Your role is to summarize recovery check-in patterns in a supportive and practical way.
${languageInstruction(language)}

Context:
- Check-ins analyzed: ${checkInCount || checkIns.length}
- Average mood: ${avgMood}
- Current streak: ${streakLabel}
- Most common activities: ${topActivities || 'not enough activity data'}

Write a weekly reflection for the user.

Requirements:
- 3 sentences maximum
- Mention at least one real pattern from the data
- Recognize consistency or effort without exaggeration
- Offer one useful reflection, not vague inspiration
- Keep the tone supportive, calm, and non-judgmental
- Do not diagnose or make medical claims
- Avoid generic phrasing that could apply to anyone

Output only the final message text.
`.trim()
}

// endregion

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
    }
): string => {
    switch (insightType) {
        case 'MOOD_DROP_ALERT':
            return buildPromptForMoodDropAlert(
                checkIns,
                language,
                metadata?.moodTrend
            )

        case 'MOTIVATIONAL':
            return buildPromptForMotivational(
                checkIns,
                language,
                metadata?.currentStreak
            )

        case 'WEEKLY_SUMMARY':
            return buildPromptForWeeklySummary(
                checkIns,
                language,
                metadata?.currentStreak,
                metadata?.checkInCount
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