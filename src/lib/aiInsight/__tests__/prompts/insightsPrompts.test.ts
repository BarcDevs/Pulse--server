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

    // TODO: add when he.json is translated
    test.todo('returns Hebrew title for MOOD_DROP_ALERT distinct from English')
    test.todo('returns Hebrew title for MOTIVATIONAL distinct from English')
    test.todo('returns Hebrew title for WEEKLY_SUMMARY distinct from English')
    test.todo('returns Hebrew title for BAD_DAY_SUPPORT distinct from English')
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
