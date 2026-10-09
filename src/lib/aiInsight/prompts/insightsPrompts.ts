import { brandConfig } from '../../../config/app'
import { getMessages, resolveLanguage } from '../../../locales'
import type { CheckInType } from '../../../types/data/CheckInType'
import type { InsightStats, InsightType } from '../../../types/insight'

import {
    calculateAverageMood,
    extractRecentActivities,
    extractRecentNotes,
    formatMoodTrend,
    formatStreakLine,
    formatWeeklyStatsLines,
    getLatestMood,
    getTopActivities
} from './insightsPromptHelpers'

const languageInstruction = (
    language?: string | null
): string => {
    const lang = resolveLanguage(language)
    const base = `Respond entirely in ${lang}. Write naturally for native speakers of that language - do not translate word-for-word from English; use phrasing that feels native. Never use em dashes, en dashes or typographic quotes; use only plain keyboard punctuation. Write activity names as bare nouns, without a leading definite article.`
    const terminology =
        lang === 'he'
            ? " When referring to check-ins, use the term 'דיווח יומי'. Use the exact term 'מצב הרוח' for mood (never 'המצב רוח')."
            : ''
    return base + terminology
}

const injectBrandName = (prompt: string): string =>
    prompt.replaceAll('{{brandName}}', brandConfig.brandName)

// region Prompt Builders

export const buildPromptForMoodDropAlert = (
    checkIns: CheckInType[],
    language?: string | null,
    moodTrend?: number[]
): string => {
    const recentMoods = formatMoodTrend(moodTrend)
    const activities = extractRecentActivities(checkIns)
    const notes = extractRecentNotes(checkIns)

    return injectBrandName(`
You are a recovery support assistant for {{brandName}}.
Your role is to help users reflect on recovery patterns in a calm, supportive, non-clinical way.
${languageInstruction(language)}

Context:
- The user's mood has decreased across their latest 3 check-ins
- Recent mood trend: ${recentMoods}
- Recent activities mentioned: ${activities || 'not available'}
- Recent notes from the user: ${notes || 'not available'}

Write a short insight for the user.

Requirements:
- 2 to 3 sentences only
- Acknowledge the downward mood pattern gently
- Encourage reflection on what may have changed recently
- Suggest one supportive next step, without sounding alarming
- Do not diagnose, do not use medical language, and do not sound like a crisis warning
- Avoid generic filler like "take it one day at a time" unless clearly relevant
- Make it feel human, calm, and specific to a recovery journey
- Do not show your reasoning, drafts, alternatives, or revisions
- Output ONLY the final message text, with nothing before or after it

Output only the final message text.
`).trim()
}

export const buildPromptForMotivational = (
    checkIns: CheckInType[],
    language?: string | null,
    currentStreak?: number,
    longestStreak?: number
): string => {
    const streakLine = formatStreakLine(currentStreak, longestStreak)
    const latestMood = getLatestMood(checkIns)

    return injectBrandName(`
You are a recovery support assistant for {{brandName}}.
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
- Do not show your reasoning, drafts, alternatives, or revisions
- Output ONLY the final message text, with nothing before or after it

Output only the final message text.
`).trim()
}

export const buildPromptForWeeklySummary = (
    checkIns: CheckInType[],
    language?: string | null,
    currentStreak?: number,
    checkInCount?: number,
    stats?: InsightStats
): string => {
    const avgMood = calculateAverageMood(checkIns)
    const topActivities = getTopActivities(checkIns)
    const notes = extractRecentNotes(checkIns)
    const displayStreak = stats?.currentStreak ?? currentStreak ?? 1
    const streakLabel = `${displayStreak} day${displayStreak > 1 ? 's' : ''}`
    const statsLines = stats
        ? formatWeeklyStatsLines(checkIns, stats)
        : ''

    return injectBrandName(`
You are a recovery support assistant for {{brandName}}.
Your role is to summarize recovery check-in patterns in a supportive and practical way.
${languageInstruction(language)}

Context:
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
- Do not show your reasoning, drafts, alternatives, or revisions
- Output ONLY the final message text, with nothing before or after it

Output only the final message text.
`).trim()
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
        stats?: InsightStats
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
                metadata?.stats?.currentStreak ?? metadata?.currentStreak,
                metadata?.stats?.longestStreak
            )

        case 'WEEKLY_SUMMARY':
            return buildPromptForWeeklySummary(
                checkIns,
                language,
                metadata?.currentStreak,
                metadata?.checkInCount,
                metadata?.stats
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