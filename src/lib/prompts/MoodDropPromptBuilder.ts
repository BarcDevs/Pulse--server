import { GeneratedTextKind } from '../../constants/aiInsight/textLimits'
import type { CheckInType } from '../../types/data/CheckInType'
import {
    extractRecentActivities,
    extractRecentNotes,
    formatMoodTrend
} from '../aiInsight/prompts/insightsPromptHelpers'

import { PromptBuilder } from './PromptBuilder'
import { NO_SCORES_RULE, PLAIN_TONE_RULE } from './sharedInstructions'

export type MoodDropPromptInput = {
    checkIns: CheckInType[]
    moodTrend?: number[]
}

export class MoodDropPromptBuilder extends PromptBuilder<MoodDropPromptInput> {
    protected kind(): GeneratedTextKind {
        return GeneratedTextKind.MOOD_DROP_ALERT
    }

    protected role(): string {
        return `You are a recovery support assistant for {{brandName}}.
Your role is to help users reflect on recovery patterns in a calm, supportive, non-clinical way.`
    }

    protected body(
        { checkIns, moodTrend }: MoodDropPromptInput,
        language?: string | null
    ): string {
        const recentMoods = formatMoodTrend(moodTrend)
        const activities = extractRecentActivities(
            checkIns,
            undefined,
            language
        )
        const notes = extractRecentNotes(checkIns)

        return `Context:
- The user's mood has decreased across their latest 3 check-ins
- Recent mood trend: ${recentMoods}
- Recent activities mentioned: ${activities || 'not available'}
- Recent notes from the user: ${notes || 'not available'}

Write a short insight for the user.

Requirements:
- Acknowledge the downward mood pattern gently
- Encourage reflection on what may have changed recently
- Suggest one supportive next step, without sounding alarming
- Do not diagnose, do not use medical language, and do not sound like a crisis warning
- Avoid generic filler like "take it one day at a time" unless clearly relevant
- Make it feel human, calm, and specific to a recovery journey
${PLAIN_TONE_RULE}
${NO_SCORES_RULE}`
    }
}
