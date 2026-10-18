import {
    GeneratedTextKind,
    TEXT_LIMIT_TOLERANCE,
    TEXT_LIMITS,
    type TextLanguage
} from '../../../../constants/aiInsight/textLimits'
import { validateGeneratedText } from '../../validation/generatedTextValidator'

const KINDS = Object.values(GeneratedTextKind)
const LANGUAGES: TextLanguage[] = ['he', 'en']
const CASES = KINDS.flatMap(kind => LANGUAGES.map(language => [kind, language] as const))

const wordsText = (count: number): string => Array.from({ length: count }, () => 'ab').join(' ')

describe('validateGeneratedText', () => {
    describe.each(CASES)('%s (%s)', (kind, language) => {
        const limits = TEXT_LIMITS[kind][language]
        const minWords = limits.minWords ?? 1

        it('passes text at the word limit', () => {
            expect(validateGeneratedText(kind, language, wordsText(limits.maxWords)).isValid).toBe(true)
        })

        it('passes text over the word limit within the tolerance', () => {
            const text = wordsText(limits.maxWords + TEXT_LIMIT_TOLERANCE.words)
            expect(validateGeneratedText(kind, language, text).isValid).toBe(true)
        })

        it('rejects text over the word limit beyond the tolerance', () => {
            const text = wordsText(limits.maxWords + TEXT_LIMIT_TOLERANCE.words + 1)
            const result = validateGeneratedText(kind, language, text)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain(kind)
            expect(result.reason).toContain('words')
        })

        it('passes one long word at the char limit plus tolerance', () => {
            const text = 'a'.repeat(limits.maxChars + TEXT_LIMIT_TOLERANCE.chars)
            expect(validateGeneratedText(kind, language, `${'ab '.repeat(Math.max(minWords - 1, 0))}${text}`).isValid).toBe(true)
        })

        it('rejects text over the char limit beyond the tolerance', () => {
            const text = 'a'.repeat(limits.maxChars + TEXT_LIMIT_TOLERANCE.chars + 1)
            const result = validateGeneratedText(kind, language, text)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('chars')
        })

        it('rejects more sentences than allowed', () => {
            const text = Array.from({ length: limits.maxSentences + 1 }, () => 'Ab cd.').join(' ')
            const result = validateGeneratedText(kind, language, text)
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('sentences')
        })

        it('passes exactly the allowed sentence count', () => {
            const text = Array.from({ length: limits.maxSentences }, () => 'Ab cd.').join(' ')
            expect(validateGeneratedText(kind, language, text).isValid).toBe(true)
        })
    })

    it('does not count decimals as sentence ends', () => {
        const result = validateGeneratedText(
            GeneratedTextKind.PROGRESS_SUMMARY,
            'en',
            'Mood rose to 6.9 from 6.1. Pain eased to 3.0.'
        )
        expect(result.isValid).toBe(true)
    })

    it('uses the Hebrew limits for he-IL and unknown languages', () => {
        const limits = TEXT_LIMITS[GeneratedTextKind.MOTIVATIONAL].he
        const text = wordsText(limits.maxWords + TEXT_LIMIT_TOLERANCE.words + 1)
        expect(validateGeneratedText(GeneratedTextKind.MOTIVATIONAL, 'he-IL', text).isValid).toBe(false)
        expect(validateGeneratedText(GeneratedTextKind.MOTIVATIONAL, null, text).isValid).toBe(false)
        expect(validateGeneratedText(GeneratedTextKind.MOTIVATIONAL, 'en-US', text).isValid).toBe(true)
    })

    it('enforces a minimum word count when the kind has one', () => {
        const withMin = KINDS.flatMap(kind => LANGUAGES.map(language => ({ kind, language, minWords: TEXT_LIMITS[kind][language].minWords })))
            .filter(entry => entry.minWords !== undefined)
        withMin.forEach(({ kind, language, minWords }) => {
            expect(validateGeneratedText(kind, language, wordsText((minWords as number) - 1)).isValid).toBe(false)
        })
    })
})
