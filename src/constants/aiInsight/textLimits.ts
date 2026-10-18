// A TS enum, not a Prisma one: these kinds never reach the database, so no migration.
// Member names equal InsightType values, so GeneratedTextKind[insightType] maps an insight to its kind.
export enum GeneratedTextKind {
    MOTIVATIONAL = 'MOTIVATIONAL',
    WEEKLY_SUMMARY = 'WEEKLY_SUMMARY',
    MOOD_DROP_ALERT = 'MOOD_DROP_ALERT',
    BAD_DAY_SUPPORT = 'BAD_DAY_SUPPORT',
    PROGRESS_SUMMARY = 'PROGRESS_SUMMARY',
    DAILY_OBSERVATION = 'DAILY_OBSERVATION',
    DAILY_OBSERVATION_DESCRIPTION = 'DAILY_OBSERVATION_DESCRIPTION'
}

export type TextLanguage = 'he' | 'en'

export type TextLimits = {
    minWords?: number
    maxWords: number
    maxChars: number
    maxSentences: number
}

// The prompt states these numbers and the validator enforces them, both read from here.
// English numbers are a first try, to be tuned from the eval-ai-models measurement.
// DAILY_OBSERVATION is the card title (owner: short, 5 words max in Hebrew, English about 30% looser).
// DAILY_OBSERVATION_DESCRIPTION is the gray line under it; its numbers are inferred from the owner's
// 15 to 20 words for the whole card, not given by the owner.
export const TEXT_LIMITS: Record<GeneratedTextKind, Record<TextLanguage, TextLimits>> = {
    [GeneratedTextKind.MOTIVATIONAL]: {
        he: { maxWords: 30, maxChars: 190, maxSentences: 2 },
        en: { maxWords: 40, maxChars: 250, maxSentences: 2 }
    },
    [GeneratedTextKind.WEEKLY_SUMMARY]: {
        he: { maxWords: 35, maxChars: 220, maxSentences: 2 },
        en: { maxWords: 45, maxChars: 280, maxSentences: 2 }
    },
    [GeneratedTextKind.MOOD_DROP_ALERT]: {
        he: { maxWords: 35, maxChars: 220, maxSentences: 2 },
        en: { maxWords: 45, maxChars: 280, maxSentences: 2 }
    },
    [GeneratedTextKind.BAD_DAY_SUPPORT]: {
        he: { maxWords: 35, maxChars: 220, maxSentences: 2 },
        en: { maxWords: 45, maxChars: 280, maxSentences: 2 }
    },
    [GeneratedTextKind.PROGRESS_SUMMARY]: {
        he: { maxWords: 40, maxChars: 250, maxSentences: 2 },
        en: { maxWords: 52, maxChars: 320, maxSentences: 2 }
    },
    [GeneratedTextKind.DAILY_OBSERVATION]: {
        he: { maxWords: 5, maxChars: 33, maxSentences: 1 },
        en: { maxWords: 9, maxChars: 58, maxSentences: 1 }
    },
    [GeneratedTextKind.DAILY_OBSERVATION_DESCRIPTION]: {
        he: { maxWords: 15, maxChars: 98, maxSentences: 1 },
        en: { maxWords: 24, maxChars: 154, maxSentences: 1 }
    }
}

// A model that lands a hair over the stated limit is still fine; the prompt is the strict side.
export const TEXT_LIMIT_TOLERANCE = {
    words: 2,
    chars: 15
}
