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

    describe('he locale', () => {
        const en = getMessages('en')
        const he = getMessages('he')

        it('has Hebrew email subjects distinct from English', () => {
            expect(he.emails.resetPassword.subject).toBeTruthy()
            expect(he.emails.resetPassword.subject).not.toBe(en.emails.resetPassword.subject)
            expect(he.emails.confirmEmail.subject).toBeTruthy()
            expect(he.emails.confirmEmail.subject).not.toBe(en.emails.confirmEmail.subject)
        })

        it('has Hebrew insight titles distinct from English', () => {
            expect(he.insights.titles.MOOD_DROP_ALERT).toBeTruthy()
            expect(he.insights.titles.MOOD_DROP_ALERT).not.toBe(en.insights.titles.MOOD_DROP_ALERT)
            expect(he.insights.titles.MOTIVATIONAL).toBeTruthy()
            expect(he.insights.titles.MOTIVATIONAL).not.toBe(en.insights.titles.MOTIVATIONAL)
            expect(he.insights.titles.WEEKLY_SUMMARY).toBeTruthy()
            expect(he.insights.titles.WEEKLY_SUMMARY).not.toBe(en.insights.titles.WEEKLY_SUMMARY)
            expect(he.insights.titles.BAD_DAY_SUPPORT).toBeTruthy()
            expect(he.insights.titles.BAD_DAY_SUPPORT).not.toBe(en.insights.titles.BAD_DAY_SUPPORT)
        })

        it('has Hebrew feedback messages distinct from English', () => {
            const heLow = he.feedback.LOW_MOOD.low
            const enLow = en.feedback.LOW_MOOD.low
            expect(heLow.acknowledge.length).toBeGreaterThan(0)
            expect(heLow.acknowledge[0]).not.toBe(enLow.acknowledge[0])
        })

        it('has Hebrew progress fallback distinct from English', () => {
            expect(he.progress.fallback).toBeTruthy()
            expect(he.progress.fallback).not.toBe(en.progress.fallback)
        })
    })
})
