import {
    FINAL_TEXT_ONLY_RULE,
    injectBrandName,
    languageInstruction,
    NO_SCORES_RULE
} from '../sharedInstructions'

describe('languageInstruction', () => {
    it('forbids dashes and typographic quotes', () => {
        expect(languageInstruction('en')).toContain('Never use em dashes')
    })

    it('adds the Hebrew terminology rules only for Hebrew', () => {
        expect(languageInstruction('he')).toContain('מצב הרוח')
        expect(languageInstruction('en')).not.toContain('מצב הרוח')
    })
})

describe('shared rules', () => {
    it('tells the model to output only the final text', () => {
        expect(FINAL_TEXT_ONLY_RULE).toContain('Output ONLY the final message text')
    })

    it('forbids quoting scores', () => {
        expect(NO_SCORES_RULE).toContain('Never quote mood or pain scores')
    })

    it('replaces every brand name placeholder', () => {
        const result = injectBrandName('{{brandName}} and {{brandName}}')

        expect(result).not.toContain('{{brandName}}')
    })
})
