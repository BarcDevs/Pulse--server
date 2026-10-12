import type { CheckInType } from '../../types/data/CheckInType'
import {
    formatStreakLine,
    getLatestMood
} from '../aiInsight/prompts/insightsPromptHelpers'

import { PromptBuilder } from './PromptBuilder'
import { NO_SCORES_RULE } from './sharedInstructions'

export type MotivationalPromptInput = {
    checkIns: CheckInType[]
    currentStreak?: number
    longestStreak?: number
}

export class MotivationalPromptBuilder extends PromptBuilder<MotivationalPromptInput> {
    protected role(): string {
        return `You are a recovery support assistant for {{brandName}}.
Your role is to encourage consistency without sounding cheesy or exaggerated.`
    }

    protected body({
        checkIns,
        currentStreak,
        longestStreak
    }: MotivationalPromptInput): string {
        const streakLine = formatStreakLine(currentStreak, longestStreak)
        const latestMood = getLatestMood(checkIns)

        return `Context:
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
${NO_SCORES_RULE}`
    }
}
