import { brandConfig } from '../../config/app'
import { resolveLanguage } from '../../locales'

export const languageInstruction = (
    language?: string | null
): string => {
    const lang = resolveLanguage(language)
    const base = `Respond entirely in ${lang}. Write naturally for native speakers of that language - do not translate word-for-word from English; use phrasing that feels native. Never use em dashes, en dashes or typographic quotes; use only plain keyboard punctuation. Write activity names as bare nouns, without a leading definite article.`
    const terminology =
        lang === 'he'
            ? ` When referring to check-ins, use the term 'דיווח יומי'. Use the exact term 'מצב הרוח' for mood (never 'המצב רוח').`
            : ''
    return base + terminology
}

export const NO_SCORES_RULE = '- Never quote mood or pain scores, averages or any number from the 1 to 10 scales (not "your mood is 8", not "your pain stays around 3"). The numbers in the context are only for you to understand the pattern: describe it in words instead (steadier, lighter, heavier, improving). Streak and day counts may be mentioned'

export const FINAL_TEXT_ONLY_RULE = `- Do not show your reasoning, drafts, alternatives, or revisions
- Output ONLY the final message text, with nothing before or after it`

export const injectBrandName = (prompt: string): string =>
    prompt.replaceAll('{{brandName}}', brandConfig.brandName)
