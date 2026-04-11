import crypto from 'crypto'

import { getLocaleMessages } from '../../locales'
import type {
    InterventionContext,
    InterventionIntent
} from '../../types/feedback'

type MessageParts = {
    acknowledge: string
    normalize: string
    suggest?: string
}

export const renderFallback = (
    intent: InterventionIntent,
    context: InterventionContext,
    userLanguage: string,
    userId?: string
): MessageParts => {
    const localeMessages = getLocaleMessages(userLanguage)

    const messageSet = localeMessages[intent.primaryReason][intent.severity]

    return pickVariants(
        messageSet,
        userLanguage,
        userId,
        intent.primaryReason
    )
}

const pickVariants = (
    messageSet: {
        acknowledge: string[]
        normalize: string[]
        suggest?: string[]
    },
    userLanguage: string,
    userId?: string,
    primaryReason?: string
): MessageParts => {
    const seed = userId || userLanguage
    const seedWithReason = primaryReason
        ? `${seed}:${primaryReason}`
        : seed
    const dateKey = new Date().toISOString().split('T')[0]
    const hash = crypto
        .createHash('md5')
        .update(seedWithReason + dateKey)
        .digest('hex')
    const hashNum = parseInt(hash.substring(0, 8), 16)

    const acknowledgeIndex = hashNum % messageSet.acknowledge.length
    const acknowledge = messageSet.acknowledge[acknowledgeIndex]

    const normalizeIndex = (hashNum + 1) % messageSet.normalize.length
    const normalize = messageSet.normalize[normalizeIndex]
    const suggest = messageSet.suggest
        ? messageSet.suggest[(hashNum + 2) % messageSet.suggest.length]
        : undefined

    return {
        acknowledge,
        normalize,
        suggest
    }
}