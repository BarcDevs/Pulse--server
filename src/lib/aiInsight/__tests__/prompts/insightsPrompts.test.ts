import type { CheckInType } from '../../../../types/data/CheckInType'
import {
    buildPromptByType,
    buildPromptForMoodDropAlert,
    buildPromptForMotivational,
    buildPromptForWeeklySummary,
    generateTitle
} from '../../prompts/insightsPrompts'

const mockCheckIn = (): CheckInType => ({
    id: 'id1',
    profileId: 'profile1',
    checkInDate: new Date(),
    moodScore: 5,
    painLevel: 3,
    activities: [],
    createdAt: new Date(),
    updatedAt: null,
    insights: []
})

describe('generateTitle()', () => {
    it('returns English title for MOOD_DROP_ALERT', () => {
        expect(generateTitle('MOOD_DROP_ALERT', 'en'))
            .toBe('Mood Check-In')
    })

    it('returns English title for MOTIVATIONAL', () => {
        expect(generateTitle('MOTIVATIONAL', 'en'))
            .toBe('Keep Going! 💪')
    })

    it('returns English title for WEEKLY_SUMMARY', () => {
        expect(generateTitle('WEEKLY_SUMMARY', 'en'))
            .toBe('Weekly Reflection')
    })

    it('returns English title for BAD_DAY_SUPPORT', () => {
        expect(generateTitle('BAD_DAY_SUPPORT', 'en'))
            .toBe('Supportive Reflection')
    })

    it('defaults to he locale when no language passed', () => {
        expect(generateTitle('MOOD_DROP_ALERT'))
            .toBeTruthy()
    })

    it('returns Hebrew title for MOOD_DROP_ALERT distinct from English', () => {
        const he = generateTitle('MOOD_DROP_ALERT', 'he')
        const en = generateTitle('MOOD_DROP_ALERT', 'en')
        expect(he).toBeTruthy()
        expect(he).not.toBe(en)
    })

    it('returns Hebrew title for MOTIVATIONAL distinct from English', () => {
        const he = generateTitle('MOTIVATIONAL', 'he')
        const en = generateTitle('MOTIVATIONAL', 'en')
        expect(he).toBeTruthy()
        expect(he).not.toBe(en)
    })

    it('returns Hebrew title for WEEKLY_SUMMARY distinct from English', () => {
        const he = generateTitle('WEEKLY_SUMMARY', 'he')
        const en = generateTitle('WEEKLY_SUMMARY', 'en')
        expect(he).toBeTruthy()
        expect(he).not.toBe(en)
    })

    it('returns Hebrew title for BAD_DAY_SUPPORT distinct from English', () => {
        const he = generateTitle('BAD_DAY_SUPPORT', 'he')
        const en = generateTitle('BAD_DAY_SUPPORT', 'en')
        expect(he).toBeTruthy()
        expect(he).not.toBe(en)
    })
})

describe('language instruction injection', () => {
    const checkIns = [mockCheckIn(), mockCheckIn(), mockCheckIn()]

    it('buildPromptForMoodDropAlert includes language instruction for he', () => {
        const prompt = buildPromptForMoodDropAlert(checkIns, 'he')
        expect(prompt).toContain('Respond entirely in he')
    })

    it('buildPromptForMoodDropAlert includes language instruction for en', () => {
        const prompt = buildPromptForMoodDropAlert(checkIns, 'en')
        expect(prompt).toContain('Respond entirely in en')
    })

    it('buildPromptForMoodDropAlert defaults to he when language is null', () => {
        const prompt = buildPromptForMoodDropAlert(checkIns, null)
        expect(prompt).toContain('Respond entirely in he')
    })

    it('buildPromptForMotivational includes language instruction', () => {
        const prompt = buildPromptForMotivational(checkIns, 'en')
        expect(prompt).toContain('Respond entirely in en')
    })

    it('buildPromptForWeeklySummary includes language instruction', () => {
        const prompt = buildPromptForWeeklySummary(checkIns, 'en')
        expect(prompt).toContain('Respond entirely in en')
    })
})

describe('buildPromptByType()', () => {
    const checkIns = [mockCheckIn()]

    it('passes language into MOOD_DROP_ALERT prompt', () => {
        const prompt = buildPromptByType('MOOD_DROP_ALERT', checkIns, 'en')
        expect(prompt).toContain('Respond entirely in en')
    })

    it('passes language into MOTIVATIONAL prompt', () => {
        const prompt = buildPromptByType('MOTIVATIONAL', checkIns, 'en')
        expect(prompt).toContain('Respond entirely in en')
    })

    it('passes language into WEEKLY_SUMMARY prompt', () => {
        const prompt = buildPromptByType('WEEKLY_SUMMARY', checkIns, 'en')
        expect(prompt).toContain('Respond entirely in en')
    })

    it('throws for BAD_DAY_SUPPORT', () => {
        expect(() =>
            buildPromptByType('BAD_DAY_SUPPORT', checkIns, 'en')
        ).toThrow('BAD_DAY_SUPPORT insights are generated directly, not via AI')
    })
})

describe('writing rules in the language instruction', () => {
    const checkIns = [mockCheckIn(), mockCheckIn(), mockCheckIn()]

    it.each([
        ['mood drop', buildPromptForMoodDropAlert(checkIns, 'he')],
        ['motivational', buildPromptForMotivational(checkIns, 'he')],
        ['weekly summary', buildPromptForWeeklySummary(checkIns, 'he')]
    ])('%s prompt in he fixes the mood term and bans dashes', (_name, prompt) => {
        expect(prompt).toContain("Use the exact term 'מצב הרוח' for mood")
        expect(prompt).toContain('Never use em dashes, en dashes or typographic quotes')
        expect(prompt).toContain('without a leading definite article')
    })

    it('en prompt keeps the dash rule but has no Hebrew mood term', () => {
        const prompt = buildPromptForWeeklySummary(checkIns, 'en')
        expect(prompt).toContain('Never use em dashes, en dashes or typographic quotes')
        expect(prompt).not.toContain('מצב הרוח')
    })
})

describe('buildPromptForWeeklySummary() stats', () => {
    const daysAgo = (days: number): Date =>
        new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Newest first, like checkInModel.getCheckIns returns them
    const checkIns: CheckInType[] = [
        { ...mockCheckIn(), checkInDate: daysAgo(0), moodScore: 8, painLevel: 2 },
        { ...mockCheckIn(), checkInDate: daysAgo(1), moodScore: 6, painLevel: 4 }
    ]
    const stats = { currentStreak: 18, longestStreak: 24, totalCheckIns: 25 }

    it('adds best streak, totals, average pain and the newest check-in', () => {
        const prompt = buildPromptForWeeklySummary(checkIns, 'he', 2, 2, stats)
        expect(prompt).toContain('- Current streak: 18 days (best streak: 24 days)')
        expect(prompt).toContain('- Total check-ins so far: 25')
        expect(prompt).toContain('- Average pain this week: 3.0')
        expect(prompt).toContain('- Latest check-in (today): mood 8, pain 2')
    })

    it('uses the stats streak instead of the streak derived from the recent check-ins', () => {
        const prompt = buildPromptForWeeklySummary(checkIns, 'he', 2, 2, stats)
        expect(prompt).not.toContain('Current streak: 2 days')
    })

    it('leaves the prompt unchanged when no stats are given', () => {
        const prompt = buildPromptForWeeklySummary(checkIns, 'he', 3, 2)
        expect(prompt).toContain('- Current streak: 3 days')
        expect(prompt).not.toContain('Total check-ins so far')
        expect(prompt).not.toContain('best streak')
    })

    it('passes stats through buildPromptByType', () => {
        const prompt = buildPromptByType('WEEKLY_SUMMARY', checkIns, 'he', { currentStreak: 2, checkInCount: 2, stats })
        expect(prompt).toContain('(best streak: 24 days)')
    })
})

describe('motivational prompt with stats', () => {
    const daysAgo = (days: number): Date =>
        new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Newest first, like checkInModel.getCheckIns returns them
    const checkIns: CheckInType[] = [
        { ...mockCheckIn(), checkInDate: daysAgo(0), moodScore: 9 },
        { ...mockCheckIn(), checkInDate: daysAgo(3), moodScore: 4 }
    ]

    it('puts current and best streak on one line', () => {
        const prompt = buildPromptForMotivational(checkIns, 'he', 18, 24)
        expect(prompt).toContain('- Current streak: 18 days (best streak: 24 days)')
    })

    it('keeps the old single streak line when no best streak is given', () => {
        const prompt = buildPromptForMotivational(checkIns, 'he', 5)
        expect(prompt).toContain('- Current streak: 5 days')
        expect(prompt).not.toContain('best streak')
    })

    it('uses the mood of the newest check-in, not the last array element', () => {
        const prompt = buildPromptForMotivational(checkIns, 'he', 5)
        expect(prompt).toContain('- Latest mood score: 9')
    })

    it('prefers the stats streak in buildPromptByType', () => {
        const prompt = buildPromptByType('MOTIVATIONAL', checkIns, 'he', {
            currentStreak: 2,
            stats: { currentStreak: 18, longestStreak: 24, totalCheckIns: 25 }
        })
        expect(prompt).toContain('(best streak: 24 days)')
        expect(prompt).not.toContain('Current streak: 2 days')
    })
})

describe('recent activities and notes come from the newest check-ins', () => {
    const daysAgo = (days: number): Date =>
        new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Newest first, like checkInModel.getCheckIns returns them: index 0 is today
    const checkIns: CheckInType[] = Array.from({ length: 7 }, (_, i) => ({
        ...mockCheckIn(),
        checkInDate: daysAgo(i),
        activities: [`activity-${i}`],
        notes: `note-${i}`
    }))

    it('keeps the newest notes and drops the oldest', () => {
        const prompt = buildPromptForWeeklySummary(checkIns, 'en')
        expect(prompt).toContain('note-0')
        expect(prompt).toContain('note-4')
        expect(prompt).not.toContain('note-5')
        expect(prompt).not.toContain('note-6')
    })

    it('keeps the newest activities and drops the oldest', () => {
        const prompt = buildPromptForMoodDropAlert(checkIns, 'en')
        expect(prompt).toContain('activity-0')
        expect(prompt).toContain('activity-5')
        expect(prompt).not.toContain('activity-6')
    })
})
