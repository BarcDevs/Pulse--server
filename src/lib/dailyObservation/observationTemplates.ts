import type { ObservationType } from '../../types/data/DailyObservationType'

type ObservationTemplate = {
    observation: string
    supportiveDescription: string
    icon: string
}

type TemplateMetadata = {
    topActivity?: string
}

const baseTemplates: Record<ObservationType, ObservationTemplate> = {
    activity_consistency: {
        observation: 'Activities have appeared regularly in recent check-ins.',
        supportiveDescription: 'Small routines often become easier to notice over time.',
        icon: 'Activity'
    },
    pain_improvement: {
        observation: 'Recent check-ins suggest lower pain levels than before.',
        supportiveDescription: 'Small changes can become meaningful trends over time.',
        icon: 'TrendingDown'
    },
    better_days_pattern: {
        observation: 'Days with higher mood and lower pain have appeared more frequently.',
        supportiveDescription: 'Better days can become the norm when patterns are noticed early.',
        icon: 'Zap'
    },
    mood_stability: {
        observation: 'Mood entries have remained relatively steady recently.',
        supportiveDescription: 'Patterns often become easier to recognize when viewed over several days.',
        icon: 'Heart'
    },
    streak_consistency: {
        observation: 'Check-ins have remained steady over consecutive days.',
        supportiveDescription: 'Consistency can become clearer when viewed over time.',
        icon: 'Flame'
    },
    checkin_consistency: {
        observation: 'You have continued checking in consistently.',
        supportiveDescription: 'Regular check-ins help reveal patterns that might otherwise be easy to miss.',
        icon: 'CalendarCheck'
    }
}

export const getObservationTemplate = (
    type: ObservationType,
    metadata?: TemplateMetadata
): ObservationTemplate => {
    const base = baseTemplates[type]

    if (type === 'activity_consistency' && metadata?.topActivity) {
        return {
            ...base,
            observation: `${metadata.topActivity} has become a recurring part of your recent routine.`
        }
    }

    return base
}
