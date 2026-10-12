import { FEEDBACK_DETECTION } from '../../constants/feedback/detection'
import type {
    InterventionContext,
    InterventionIntent
} from '../../types/feedback'

import { PromptBuilder } from './PromptBuilder'

export type FeedbackPromptInput = {
    intent: InterventionIntent
    context: InterventionContext
}

const SEVERITY_LABELS = {
    low: 'mild',
    medium: 'moderate',
    high: 'significant'
}

export class FeedbackPromptBuilder extends PromptBuilder<FeedbackPromptInput> {
    protected role({ intent }: FeedbackPromptInput): string {
        const severityLabel = SEVERITY_LABELS[intent.severity]
        const reasonText = intent.primaryReason
            .replace(/_/g, ' ')
            .toLowerCase()

        return `You are a compassionate health support assistant.
Generate a supportive message for a user experiencing a ${severityLabel} ${reasonText}.`
    }

    // The body asks for JSON only, so the plain-text output rule does not apply
    protected outputRules(): string {
        return ''
    }

    protected body({ intent, context }: FeedbackPromptInput): string {
        const structure = intent.mode === 'FULL'
            ? {
                acknowledge: 'string',
                normalize: 'string',
                suggest: 'string'
            }
            : {
                acknowledge: 'string',
                normalize: 'string'
            }
        const structureJson = JSON.stringify(
            structure,
            null,
            2
        )
        const gapNote = context.trend.gapDays
            >= FEEDBACK_DETECTION.TREND.GAP_DAYS_THRESHOLD
            ? `\n- Note: ${context.trend.gapDays} day gap since a prior check-in, do not imply a continuous trend`
            : ''
        const patterns = context.highlights
            .map(h => h.type)
            .join(', ')
            || 'stable'

        return `CONSTRAINTS:
- Tone: supportive, non-clinical (no medical claims), concise, non-judgmental
- Return ONLY valid JSON with this exact structure:
${structureJson}

CONTEXT:
- Trend direction: ${context.trend.direction}
  over ${context.trend.duration} day(s)
- Recent patterns: ${patterns}${gapNote}

MESSAGE STRUCTURE:
- acknowledge: Validate their experience (1 sentence)
- normalize: Normalize their struggle as part of recovery (1 sentence)
${intent.mode === 'FULL'
        ? '- suggest: Offer gentle guidance (1 sentence, optional)'
        : ''}

Generate the message now:`
    }
}
