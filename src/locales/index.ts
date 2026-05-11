import type { AppMessages } from '../types/AppMessages'

import en from './en.json'
import he from './he.json'

const locales: Record<string, AppMessages> = {
    en,
    he
}

export const resolveLanguage = (language?: string | null): string => {
    const lang = language ?? 'he'
    if (locales[lang]) return lang
    const prefix = lang.split('-')[0]
    if (locales[prefix]) return prefix
    return 'he'
}

export const getMessages = (language?: string | null): AppMessages =>
    locales[resolveLanguage(language)]
