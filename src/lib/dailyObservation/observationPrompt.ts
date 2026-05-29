import { resolveLanguage } from '../../locales'
import type { ObservationType } from '../../types/data/DailyObservationType'

type PromptContext = {
    type: ObservationType
    metadata?: Record<string, unknown>
    topActivity?: string
    language?: string | null
}

const languageInstruction = (language?: string | null): string => {
    const lang = resolveLanguage(language)
    const base = `Respond entirely in ${lang}. Write naturally for native speakers of that language - do not translate word-for-word from English; use phrasing that feels native.`
    const terminology =
        lang === 'he'
            ? " When referring to check-ins, use the term 'דיווח יומי'."
            : ''
    return base + terminology
}

const formatMetric = (
    type: ObservationType,
    metadata?: Record<string, unknown>,
    topActivity?: string
): string => {
    if (!metadata) return ''

    switch (type) {
        case 'activity_consistency': {
            const recent = metadata.recentActivityCheckIns as number
            const total = metadata.evaluatedCheckIns as number
            const activityLine = topActivity
                ? `Most frequent activity: ${topActivity}`
                : 'No dominant activity identified'
            return `Check-ins with activities: ${recent} of ${total}\n${activityLine}`
        }
        case 'pain_improvement': {
            const recent = metadata.recentAveragePain as number
            const prev = metadata.previousAveragePain as number
            return `Recent average pain: ${recent}\nPrevious average pain: ${prev}`
        }
        case 'better_days_pattern': {
            const count = metadata.betterDayCount as number
            const total = metadata.evaluatedCheckIns as number
            return `Better days (higher mood + lower pain): ${count} of ${total}`
        }
        case 'mood_stability': {
            const range = metadata.moodRange as number
            const total = metadata.evaluatedCheckIns as number
            return `Mood range across last ${total} check-ins: ${range} points`
        }
        case 'streak_consistency': {
            const streak = metadata.streak as number
            return `Current consecutive-day streak: ${streak} days`
        }
        case 'checkin_consistency': {
            const count = metadata.checkInCount as number
            return `Check-ins in the last 30 days: ${count}`
        }
        default:
            return ''
    }
}

export const buildObservationPrompt = ({
    type,
    metadata,
    topActivity,
    language
}: PromptContext): string => {
    const metrics = formatMetric(type, metadata, topActivity)

    return `
You are an observation assistant for HealEase, a health and wellness recovery app.
Your role is to phrase a factual, calm observation about a pattern in the user's recent check-ins.
${languageInstruction(language)}

Observation type: ${type}
${metrics ? `Context:\n${metrics}` : ''}

Write a short observation for the user.

Requirements:
- Return ONLY a valid JSON object on a single line: { "observation": "...", "supportiveDescription": "...", "icon": "..." }
- observation: one sentence, maximum 120 characters, factual and calm, describes the pattern
- supportiveDescription: one sentence, maximum 140 characters, gentle and observational (not motivational)
- icon: one of Activity, CalendarCheck, Flame, Heart, TrendingDown, Zap (pick the most fitting)
- Do NOT include advice, instructions, "should", "try", "consider"
- Do NOT use therapeutic language, diagnostic language, or motivation clichés
- Do NOT include any text outside the JSON object
`.trim()
}
