import type { LocaleMessages } from '../types/feedback'

import en from './en.json'

const locales: Record<string, LocaleMessages> = {
    en
}

export const getLocaleMessages = (
    language: string
): LocaleMessages => {
    if (locales[language]) {
        return locales[language]
    }

    const languagePrefix = language.split('-')[0]
    if (locales[languagePrefix]) {
        return locales[languagePrefix]
    }

    return locales.en
}

export const isLocaleSupported = (language: string): boolean => {
    return Boolean(locales[language]
        || locales[language.split('-')[0]])
}

export const getSupportedLocales = (): string[] =>
    Object.keys(locales)
