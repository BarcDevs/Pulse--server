import type { LocaleMessages } from '../types/feedback'

import en from './en.json'

// Map of supported locales
const locales: Record<string, LocaleMessages> = {
    en
}

export const getLocaleMessages = (
    language: string
): LocaleMessages => {
    // Try exact match first
    if (locales[language]) {
        return locales[language]
    }

    // Try language prefix (e.g., 'en-US' -> 'en')
    const languagePrefix = language.split('-')[0]
    if (locales[languagePrefix]) {
        return locales[languagePrefix]
    }

    // Fallback to English
    return locales.en
}

export const isLocaleSupported = (language: string): boolean => {
    return Boolean(locales[language]
        || locales[language.split('-')[0]])
}

export const getSupportedLocales = (): string[] =>
    Object.keys(locales)
