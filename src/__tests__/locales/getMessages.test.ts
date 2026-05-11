import { getMessages, resolveLanguage } from '../../locales'

describe('resolveLanguage()', () => {
    it('returns "he" for null', () => expect(resolveLanguage(null)).toBe('he'))
    it('returns "he" for undefined', () => expect(resolveLanguage(undefined)).toBe('he'))
    it('returns "en" for "en"', () => expect(resolveLanguage('en')).toBe('en'))
    it('returns "en" for "en-US"', () => expect(resolveLanguage('en-US')).toBe('en'))
    it('returns "he" for "he-IL"', () => expect(resolveLanguage('he-IL')).toBe('he'))
    it('returns "he" for unknown language', () => expect(resolveLanguage('fr')).toBe('he'))
})

describe('getMessages()', () => {
    describe('language resolution', () => {
        it('defaults to he when called with no argument', () => {
            const msgs = getMessages()
            expect(msgs).toBe(getMessages('he'))
        })

        it('defaults to he when called with null', () => {
            expect(getMessages(null)).toBe(getMessages('he'))
        })

        it('defaults to he when called with undefined', () => {
            expect(getMessages(undefined)).toBe(getMessages('he'))
        })

        it('resolves exact locale code', () => {
            expect(getMessages('en')).toBe(getMessages('en'))
        })

        it('resolves locale with region suffix (en-US → en)', () => {
            expect(getMessages('en-US')).toBe(getMessages('en'))
        })

        it('resolves he-IL to he', () => {
            expect(getMessages('he-IL')).toBe(getMessages('he'))
        })

        it('falls back to he for unknown language', () => {
            expect(getMessages('fr')).toBe(getMessages('he'))
        })

        it('falls back to he for unknown region suffix', () => {
            expect(getMessages('fr-FR')).toBe(getMessages('he'))
        })
    })

    describe('en locale structure', () => {
        const msgs = getMessages('en')

        it('has feedback section', () => {
            expect(msgs.feedback).toBeDefined()
            expect(msgs.feedback.LOW_MOOD).toBeDefined()
            expect(msgs.feedback.HIGH_PAIN).toBeDefined()
            expect(msgs.feedback.NEGATIVE_TREND).toBeDefined()
        })

        it('feedback has severity levels with non-empty arrays', () => {
            const lowMoodLow = msgs.feedback.LOW_MOOD.low
            expect(lowMoodLow.acknowledge.length).toBeGreaterThan(0)
            expect(lowMoodLow.normalize.length).toBeGreaterThan(0)
        })

        it('has emails.resetPassword with subject and body', () => {
            expect(msgs.emails.resetPassword.subject).toBeTruthy()
            expect(msgs.emails.resetPassword.body).toContain('{{otp}}')
        })

        it('has emails.confirmEmail with subject and body', () => {
            expect(msgs.emails.confirmEmail.subject).toBeTruthy()
            expect(msgs.emails.confirmEmail.body).toContain('{{otp}}')
        })

        it('has insights.titles for all insight types', () => {
            expect(msgs.insights.titles.MOOD_DROP_ALERT).toBe('Mood Check-In')
            expect(msgs.insights.titles.MOTIVATIONAL).toBe('Keep Going! 💪')
            expect(msgs.insights.titles.WEEKLY_SUMMARY).toBe('Weekly Reflection')
            expect(msgs.insights.titles.BAD_DAY_SUPPORT).toBe('Supportive Reflection')
        })

        it('has insights.fallback for all insight types', () => {
            expect(msgs.insights.fallback.MOOD_DROP_ALERT).toBeTruthy()
            expect(msgs.insights.fallback.MOTIVATIONAL).toBeTruthy()
            expect(msgs.insights.fallback.WEEKLY_SUMMARY).toBeTruthy()
            expect(msgs.insights.fallback.BAD_DAY_SUPPORT).toBeTruthy()
        })

        it('has progress.fallback string', () => {
            expect(msgs.progress.fallback).toBeTruthy()
        })
    })

    // TODO: add when he.json is translated
    describe('he locale', () => {
        test.todo('has Hebrew email subjects distinct from English')
        test.todo('has Hebrew insight titles distinct from English')
        test.todo('has Hebrew feedback messages distinct from English')
        test.todo('has Hebrew progress fallback distinct from English')
    })
})
