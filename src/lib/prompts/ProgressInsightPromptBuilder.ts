import { GeneratedTextKind } from '../../constants/aiInsight/textLimits'
import type { Highlights } from '../progressInsights/highlightDetector'
import type { PeriodMetrics } from '../progressInsights/metricAggregator'

import { PromptBuilder } from './PromptBuilder'
import { PLAIN_TONE_RULE } from './sharedInstructions'

export type ProgressInsightPromptInput = {
    current: PeriodMetrics
    previous: PeriodMetrics
    highlights: Highlights
}

export class ProgressInsightPromptBuilder extends PromptBuilder<ProgressInsightPromptInput> {
    protected kind(): GeneratedTextKind {
        return GeneratedTextKind.PROGRESS_SUMMARY
    }

    protected role(): string {
        return `Generate a short progress summary
that describes the week's overall trend direction and key changes.
Reference the provided metrics. Do not provide medical advice.
Do not invent data. Tone should be neutral and supportive.`
    }

    protected body({
        current,
        previous,
        highlights
    }: ProgressInsightPromptInput): string {
        const moodDelta = current.averageMood - previous.averageMood
        const painDelta = current.averagePain - previous.averagePain
        const activityDelta =
            current.activityConsistency - previous.activityConsistency

        const improvementsText =
            highlights.improvements.length > 0
                ? `Improvements: ${highlights.improvements.join(', ')}.`
                : ''

        const regressionsText =
            highlights.regressions.length > 0
                ? `Regressions: ${highlights.regressions.join(', ')}.`
                : ''

        const metricsText = `Current week metrics:
    mood ${current.averageMood.toFixed(1)},
    pain ${current.averagePain.toFixed(1)},
    activity consistency ${(current.activityConsistency * 100).toFixed(0)}%.
    Previous week: mood ${previous.averageMood.toFixed(1)},
    pain ${previous.averagePain.toFixed(1)},
    activity consistency ${(previous.activityConsistency * 100).toFixed(0)}%.
    Changes:
    mood ${moodDelta >= 0 ? '+' : ''}${moodDelta.toFixed(1)},
    pain ${painDelta >= 0 ? '+' : ''}${painDelta.toFixed(1)},
    activity ${activityDelta >= 0 ? '+' : ''}${(activityDelta * 100).toFixed(0)}%.`

        return `${metricsText}

${improvementsText}
${regressionsText}

${PLAIN_TONE_RULE}`
    }
}
