import { VALID_ACTIVITY_PREFERENCE_SLUGS } from '../../constants/activityPreferences'
import { localizeActivity } from '../../lib/activityLabels'
import en from '../../locales/en.json'
import he from '../../locales/he.json'

describe('localizeActivity', () => {
    it.each([
        ['walking', 'he-IL', 'הליכה'],
        ['self-care', 'he', 'טיפוח עצמי'],
        ['social time', 'he-IL', 'זמן חברתי'],
        ['outdoors', 'en-US', 'time outdoors'],
        ['household', 'en', 'household chores']
    ])('maps %s to its %s label', (slug, language, expected) => {
        expect(localizeActivity(slug, language)).toBe(expected)
    })

    it('matches a slug regardless of case and surrounding spaces', () => {
        expect(localizeActivity(' Walking ', 'he-IL')).toBe('הליכה')
    })

    it('keeps a custom activity the user typed as it is', () => {
        expect(localizeActivity('pottery class', 'he-IL')).toBe('pottery class')
    })

    it('does not mistake an object property name for a slug', () => {
        expect(localizeActivity('constructor', 'he-IL')).toBe('constructor')
    })

    it('falls back to Hebrew when the language is missing', () => {
        expect(localizeActivity('rest')).toBe('מנוחה')
    })
})

describe('activity label coverage', () => {
    it('has a label in every language for every activity slug the API accepts', () => {
        VALID_ACTIVITY_PREFERENCE_SLUGS.forEach((slug) => {
            expect(en.activities).toHaveProperty([slug])
            expect(he.activities).toHaveProperty([slug])
        })
    })

    it('offers the same slugs in English and Hebrew', () => {
        expect(Object.keys(en.activities).sort())
            .toEqual(Object.keys(he.activities).sort())
    })
})
