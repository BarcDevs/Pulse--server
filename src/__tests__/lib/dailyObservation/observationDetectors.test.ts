import { detectObservationType } from '../../../lib/dailyObservation/observationDetectors'

type CheckInStats = {
    moodScore: number
    painLevel: number
    activities: string[]
    checkInDate: Date
}

const makeCheckIn = (
    overrides: Partial<CheckInStats> = {},
    daysAgo = 0
): CheckInStats => ({
    moodScore: 5,
    painLevel: 5,
    activities: [],
    checkInDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    ...overrides
})

const consecutiveDays = (count: number): CheckInStats[] =>
    Array.from({ length: count }, (_, i) =>
        makeCheckIn({ moodScore: (i % 5) + 4 }, i)  // moods 4-8, range > 2
    )

describe('detectObservationType', () => {
    it('returns null for empty array', () => {
        expect(detectObservationType([])).toBeNull()
    })

    describe('activity_consistency (priority 1)', () => {
        it('detects when 3 of last 5 have activities', () => {
            const checkIns = [
                makeCheckIn({ activities: ['yoga'] }, 0),
                makeCheckIn({ activities: ['walk'] }, 1),
                makeCheckIn({ activities: ['swim'] }, 2),
                makeCheckIn({ activities: [] }, 3),
                makeCheckIn({ activities: [] }, 4)
            ]
            const result = detectObservationType(checkIns)
            expect(result?.type).toBe('activity_consistency')
            expect(result?.metadata).toMatchObject({
                recentActivityCheckIns: 3,
                evaluatedCheckIns: 5
            })
        })

        it('does not detect when only 2 of last 5 have activities', () => {
            const checkIns = [
                makeCheckIn({ activities: ['yoga'] }, 0),
                makeCheckIn({ activities: ['walk'] }, 1),
                makeCheckIn({ activities: [] }, 2),
                makeCheckIn({ activities: [] }, 3),
                makeCheckIn({ activities: [] }, 4)
            ]
            const result = detectObservationType(checkIns)
            expect(result?.type).not.toBe('activity_consistency')
        })

        it('does not detect when fewer than 5 check-ins available', () => {
            const checkIns = [
                makeCheckIn({ activities: ['yoga'] }, 0),
                makeCheckIn({ activities: ['walk'] }, 1),
                makeCheckIn({ activities: ['swim'] }, 2)
            ]
            const result = detectObservationType(checkIns)
            expect(result?.type).not.toBe('activity_consistency')
        })
    })

    describe('pain_improvement (priority 2)', () => {
        it('detects when recent avg pain < previous avg pain', () => {
            const recent = Array.from({ length: 5 }, (_, i) =>
                makeCheckIn({ painLevel: 3, moodScore: 5, activities: [] }, i)
            )
            const previous = Array.from({ length: 5 }, (_, i) =>
                makeCheckIn({ painLevel: 6, moodScore: 5, activities: [] }, i + 5)
            )
            const result = detectObservationType([...recent, ...previous])
            expect(result?.type).toBe('pain_improvement')
            expect(result?.metadata).toMatchObject({
                recentAveragePain: 3,
                previousAveragePain: 6
            })
        })

        it('does not detect when recent avg pain >= previous avg pain', () => {
            const recent = Array.from({ length: 5 }, (_, i) =>
                makeCheckIn({ painLevel: 6, moodScore: 5, activities: [] }, i)
            )
            const previous = Array.from({ length: 5 }, (_, i) =>
                makeCheckIn({ painLevel: 3, moodScore: 5, activities: [] }, i + 5)
            )
            const result = detectObservationType([...recent, ...previous])
            expect(result?.type).not.toBe('pain_improvement')
        })

        it('does not detect when fewer than 10 check-ins available', () => {
            const checkIns = Array.from({ length: 9 }, (_, i) =>
                makeCheckIn({ painLevel: i < 5 ? 3 : 7, moodScore: 5, activities: [] }, i)
            )
            const result = detectObservationType(checkIns)
            expect(result?.type).not.toBe('pain_improvement')
        })
    })

    describe('better_days_pattern (priority 3)', () => {
        it('detects when 3 of last 5 have mood>=7 and pain<=4', () => {
            const checkIns = [
                makeCheckIn({ moodScore: 8, painLevel: 3, activities: [] }, 0),
                makeCheckIn({ moodScore: 7, painLevel: 4, activities: [] }, 1),
                makeCheckIn({ moodScore: 9, painLevel: 2, activities: [] }, 2),
                makeCheckIn({ moodScore: 4, painLevel: 7, activities: [] }, 3),
                makeCheckIn({ moodScore: 3, painLevel: 8, activities: [] }, 4)
            ]
            const result = detectObservationType(checkIns)
            expect(result?.type).toBe('better_days_pattern')
            expect(result?.metadata).toMatchObject({
                betterDayCount: 3,
                evaluatedCheckIns: 5
            })
        })

        it('does not detect when only 2 of last 5 qualify', () => {
            const checkIns = [
                makeCheckIn({ moodScore: 8, painLevel: 3, activities: [] }, 0),
                makeCheckIn({ moodScore: 7, painLevel: 4, activities: [] }, 1),
                makeCheckIn({ moodScore: 4, painLevel: 7, activities: [] }, 2),
                makeCheckIn({ moodScore: 3, painLevel: 8, activities: [] }, 3),
                makeCheckIn({ moodScore: 2, painLevel: 9, activities: [] }, 4)
            ]
            const result = detectObservationType(checkIns)
            expect(result?.type).not.toBe('better_days_pattern')
        })
    })

    describe('mood_stability (priority 4)', () => {
        it('detects when mood range across last 5 is <= 2', () => {
            const checkIns = [
                makeCheckIn({ moodScore: 6, painLevel: 5, activities: [] }, 0),
                makeCheckIn({ moodScore: 7, painLevel: 5, activities: [] }, 1),
                makeCheckIn({ moodScore: 8, painLevel: 5, activities: [] }, 2),
                makeCheckIn({ moodScore: 6, painLevel: 5, activities: [] }, 3),
                makeCheckIn({ moodScore: 7, painLevel: 5, activities: [] }, 4)
            ]
            const result = detectObservationType(checkIns)
            expect(result?.type).toBe('mood_stability')
            expect(result?.metadata).toMatchObject({ moodRange: 2 })
        })

        it('does not detect when mood range > 2', () => {
            const checkIns = [
                makeCheckIn({ moodScore: 3, painLevel: 5, activities: [] }, 0),
                makeCheckIn({ moodScore: 7, painLevel: 5, activities: [] }, 1),
                makeCheckIn({ moodScore: 8, painLevel: 5, activities: [] }, 2),
                makeCheckIn({ moodScore: 6, painLevel: 5, activities: [] }, 3),
                makeCheckIn({ moodScore: 7, painLevel: 5, activities: [] }, 4)
            ]
            const result = detectObservationType(checkIns)
            expect(result?.type).not.toBe('mood_stability')
        })
    })

    describe('streak_consistency (priority 5)', () => {
        it('detects when streak >= 5', () => {
            const checkIns = consecutiveDays(6)
            const result = detectObservationType(checkIns)
            expect(result?.type).toBe('streak_consistency')
            expect((result?.metadata?.streak as number)).toBeGreaterThanOrEqual(5)
        })

        it('does not detect when streak < 5', () => {
            const checkIns = [
                makeCheckIn({}, 0),
                makeCheckIn({}, 1),
                makeCheckIn({}, 2),
                makeCheckIn({}, 10)
            ]
            const result = detectObservationType(checkIns)
            expect(result?.type).not.toBe('streak_consistency')
        })
    })

    describe('checkin_consistency (priority 6 — fallback)', () => {
        it('detects when 10 or more check-ins exist', () => {
            // Spaced 3 days apart → no streak; mood alternates 3/8 (range 5) → no mood_stability;
            // all pain = 5 → same avg recent vs previous → no pain_improvement; no activities → no activity_consistency;
            // moods too varied for better_days_pattern threshold
            const checkIns = Array.from({ length: 10 }, (_, i) =>
                makeCheckIn({ moodScore: i % 2 === 0 ? 3 : 8, painLevel: 5, activities: [] }, i * 3)
            )
            const result = detectObservationType(checkIns)
            expect(result?.type).toBe('checkin_consistency')
            expect(result?.metadata).toMatchObject({ checkInCount: 10 })
        })

        it('does not detect when fewer than 10 check-ins', () => {
            const checkIns = Array.from({ length: 9 }, (_, i) =>
                makeCheckIn({ moodScore: i % 2 === 0 ? 3 : 8, painLevel: 5, activities: [] }, i * 3)
            )
            const result = detectObservationType(checkIns)
            expect(result).toBeNull()
        })
    })

    describe('priority ordering', () => {
        it('returns activity_consistency over pain_improvement when both match', () => {
            const recent = [
                makeCheckIn({ activities: ['yoga'], painLevel: 3, moodScore: 5 }, 0),
                makeCheckIn({ activities: ['walk'], painLevel: 3, moodScore: 5 }, 1),
                makeCheckIn({ activities: ['swim'], painLevel: 3, moodScore: 5 }, 2),
                makeCheckIn({ activities: [], painLevel: 3, moodScore: 5 }, 3),
                makeCheckIn({ activities: [], painLevel: 3, moodScore: 5 }, 4)
            ]
            const previous = Array.from({ length: 5 }, (_, i) =>
                makeCheckIn({ painLevel: 7, moodScore: 5, activities: [] }, i + 5)
            )
            const result = detectObservationType([...recent, ...previous])
            expect(result?.type).toBe('activity_consistency')
        })

        it('returns pain_improvement over better_days_pattern when both match', () => {
            const recent = [
                makeCheckIn({ moodScore: 8, painLevel: 2, activities: [] }, 0),
                makeCheckIn({ moodScore: 8, painLevel: 2, activities: [] }, 1),
                makeCheckIn({ moodScore: 8, painLevel: 2, activities: [] }, 2),
                makeCheckIn({ moodScore: 8, painLevel: 2, activities: [] }, 3),
                makeCheckIn({ moodScore: 8, painLevel: 2, activities: [] }, 4)
            ]
            const previous = Array.from({ length: 5 }, (_, i) =>
                makeCheckIn({ moodScore: 5, painLevel: 7, activities: [] }, i + 5)
            )
            const result = detectObservationType([...recent, ...previous])
            expect(result?.type).toBe('pain_improvement')
        })
    })
})
