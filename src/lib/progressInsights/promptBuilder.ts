import type { Highlights } from './highlightDetector'
import type { PeriodMetrics } from './metricAggregator'

export const buildProgressInsightPrompt = (
    current: PeriodMetrics,
    previous: PeriodMetrics,
    highlights: Highlights
): string => {
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

    const constraintText = `Generate a concise progress summary in 2 to 4 sentences
    that describes the week's overall trend direction and key changes.
    Reference the provided metrics. Do not provide medical advice.
    Do not invent data. Tone should be neutral and supportive.`

    return `${constraintText}\n\n${metricsText}\n\n${improvementsText}\n${regressionsText}`
}
