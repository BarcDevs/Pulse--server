import type { CheckInType } from '../../../types/data/CheckInType'
import {
    decideInsightType,
    InvalidInsightInputError,
} from '../insightDecision.service'

const createMockCheckIn = (overrides?: Partial<CheckInType>): CheckInType => ({
    id: 'mock-id',
    userId: 'mock-user-id',
    checkInDate: new Date(),
    moodScore: 5,
    painLevel: 3,
    activities: [],
    createdAt: new Date(),
    updatedAt: null,
    insights: [],
    ...overrides,
})

describe('decideInsightType', () => {
    describe('Priority 1: Mood Drop Alert', () => {
        it('should return mood_drop_alert when latest 3 moods strictly decrease', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('MOOD_DROP_ALERT')
            expect(result.reason).toContain('Mood decreased')
        })

        it('should include moodTrend in metadata for mood_drop_alert', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.metadata?.moodTrend).toEqual([7, 6, 5])
            expect(result.metadata?.checkInCount).toBe(3)
        })

        it('should NOT trigger mood_drop_alert on [7,7,6]', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 6,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).not.toBe('MOOD_DROP_ALERT')
        })

        it('should NOT trigger mood_drop_alert on [7,6,6]', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 6,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).not.toBe('MOOD_DROP_ALERT')
        })

        it('mood_drop_alert should take priority over streak-based decisions', () => {
            // Input: streak = 1 (single check-in on most recent day)
            // AND mood dropping across recent check-ins
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-05'),
                    moodScore: 9,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-06'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-07'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('MOOD_DROP_ALERT')
        })

        it('should detect mood drop even with only 3 valid mood entries in larger dataset', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-07'),
                    moodScore: undefined as any,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('MOOD_DROP_ALERT')
        })

        it('should NOT trigger mood_drop_alert with fewer than 3 valid mood scores', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: undefined as any,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).not.toBe('MOOD_DROP_ALERT')
        })
    })

    describe('Priority 2: Motivational (Low Streak)', () => {
        it('should return motivational when streak < 2 and mood not dropping', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('MOTIVATIONAL')
            expect(result.reason).toContain('not yet established')
        })

        it('should return motivational when streak = 0 (empty array would throw)', () => {
            // Note: empty array throws; this tests streak calculation with valid data
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('MOTIVATIONAL')
            expect(result.metadata?.currentStreak).toBe(1)
        })

        it('should return motivational when streak = 1', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('MOTIVATIONAL')
        })

        it('should include currentStreak in metadata for motivational', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.metadata?.currentStreak).toBeDefined()
            expect(result.metadata?.checkInCount).toBe(1)
        })

        it('should return motivational for streak = 1 even with many check-ins', () => {
            // User has 5 check-ins but streak = 1 (last check-in isolated)
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-05'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-06'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-07'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('MOTIVATIONAL')
            expect(result.metadata?.currentStreak).toBe(1)
            expect(result.metadata?.checkInCount).toBe(5)
        })
    })

    describe('Priority 3: Weekly Summary (Sufficient Data)', () => {
        it('should return weekly_summary when >= 5 check-ins and streak >= 2', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-06'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-07'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('WEEKLY_SUMMARY')
            expect(result.reason).toContain('enough recent check-in data')
        })

        it('should NOT return weekly_summary when < 5 check-ins', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-07'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).not.toBe('WEEKLY_SUMMARY')
        })

        it('should NOT return weekly_summary when streak < 2', () => {
            // 10+ check-ins but streak = 1 (last check-in isolated)
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-01'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-02'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-03'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-04'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-05'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-06'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).not.toBe('WEEKLY_SUMMARY')
        })

        it('should include currentStreak in metadata for weekly_summary', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-06'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-07'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.metadata?.currentStreak).toBeDefined()
            expect(result.metadata?.checkInCount).toBe(5)
        })

        it('should return weekly_summary for exactly 5 check-ins', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-06'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-07'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('WEEKLY_SUMMARY')
        })

        it('should return weekly_summary for > 5 check-ins', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-05'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-06'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-07'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('WEEKLY_SUMMARY')
        })
    })

    describe('Fallback Logic', () => {
        it('should fall back to motivational when data insufficient for weekly_summary', () => {
            // 4 check-ins (< 5), so not enough for summary
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-07'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('MOTIVATIONAL')
            expect(result.reason).toContain('Not enough data yet')
        })

        it('should fall back to motivational when streak >= 2 but < 5 check-ins', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-11'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('MOTIVATIONAL')
        })

        it('should never return weekly_summary as blind default', () => {
            // Only returns weekly_summary if BOTH conditions met:
            // 1. >= 5 check-ins
            // 2. streak >= 2
            const lowDataCheckIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(lowDataCheckIns)
            expect(result.type).not.toBe('WEEKLY_SUMMARY')
        })
    })

    describe('Sorting & Defensive Behavior', () => {
        it('should handle unsorted input correctly', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 6,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('MOOD_DROP_ALERT')
        })

        it('should produce same result regardless of input order', () => {
            const orderedCheckIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]

            const unorderedCheckIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 6,
                }),
            ]

            const result1 = decideInsightType(orderedCheckIns)
            const result2 = decideInsightType(unorderedCheckIns)

            expect(result1.type).toBe(result2.type)
            expect(result1.reason).toBe(result2.reason)
            expect(result1.metadata).toEqual(result2.metadata)
        })

        it('should sort defensively before applying rules', () => {
            // Reverse chronological input
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 7,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('MOOD_DROP_ALERT')
            expect(result.metadata?.moodTrend).toEqual([7, 6, 5])
        })
    })

    describe('Metadata Structure', () => {
        it('should include checkInCount in all results', () => {
            const singleCheckIn = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(singleCheckIn)
            expect(result.metadata?.checkInCount).toBe(1)
        })

        it('should include currentStreak for motivational and weekly_summary', () => {
            const motivationalCheckIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const motivationalResult = decideInsightType(motivationalCheckIns)
            expect(motivationalResult.metadata?.currentStreak).toBeDefined()

            const summaryCheckIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-06'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-07'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const summaryResult = decideInsightType(summaryCheckIns)
            expect(summaryResult.metadata?.currentStreak).toBeDefined()
        })

        it('should include moodTrend for mood_drop_alert', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.metadata?.moodTrend).toBeDefined()
            expect(Array.isArray(result.metadata?.moodTrend)).toBe(true)
        })

        it('should NOT include moodTrend for non-mood_drop_alert results', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.metadata?.moodTrend).toBeUndefined()
        })
    })

    describe('Error Handling (Invalid Input)', () => {
        it('should throw InvalidInsightInputError for empty array', () => {
            expect(() => {
                decideInsightType([])
            }).toThrow(InvalidInsightInputError)
        })

        it('should throw InvalidInsightInputError when all check-ins have invalid checkInDate', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('invalid'),
                }),
                createMockCheckIn({
                    checkInDate: null as any,
                }),
            ]
            expect(() => {
                decideInsightType(checkIns)
            }).toThrow(InvalidInsightInputError)
        })

        it('should throw InvalidInsightInputError with descriptive message for empty array', () => {
            expect(() => {
                decideInsightType([])
            }).toThrow(/cannot be empty/)
        })

        it('should throw InvalidInsightInputError with descriptive message for no valid check-ins', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('invalid'),
                }),
            ]
            expect(() => {
                decideInsightType(checkIns)
            }).toThrow(/No valid check-ins/)
        })

        it('should gracefully handle check-ins with missing moodScore', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: undefined as any,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result).toBeDefined()
            expect(result.type).toBe('MOTIVATIONAL')
        })

        it('should handle mixed valid and invalid check-in dates', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('invalid'),
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result).toBeDefined()
            expect(result.metadata?.checkInCount).toBe(1)
        })
    })

    describe('Edge Cases', () => {
        it('should handle single valid check-in gracefully', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('MOTIVATIONAL')
            expect(result.metadata?.currentStreak).toBe(1)
        })

        it('should handle year transitions correctly', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2025-12-30'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2025-12-31'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-01-01'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBeDefined()
            expect(result.metadata?.currentStreak).toBe(3)
        })

        it('should handle duplicate dates by de-duplicating for streak', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.metadata?.currentStreak).toBe(2)
        })

        it('should handle decimal/fractional mood scores', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 7.5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 6.25,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5.1,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('MOOD_DROP_ALERT')
        })

        it('should handle zero and negative mood scores', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 2,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 1,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 0,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('MOOD_DROP_ALERT')
        })
    })

    describe('Real-world Scenarios', () => {
        it('should handle new user (first check-in)', () => {
            const checkIns = [
                createMockCheckIn({
                    id: 'new-checkin-1',
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                    activities: ['walking'],
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('MOTIVATIONAL')
            expect(result.metadata?.currentStreak).toBe(1)
            expect(result.metadata?.checkInCount).toBe(1)
        })

        it('should handle user building streak', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-11'),
                    moodScore: 5,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('MOTIVATIONAL')
            expect(result.metadata?.currentStreak).toBe(4)
        })

        it('should handle user with established streak and stable mood', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-05'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-06'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-07'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 6,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('WEEKLY_SUMMARY')
        })

        it('should detect concern for user with declining mood', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-05'),
                    moodScore: 8,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-06'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-07'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 4,
                }),
            ]
            const result = decideInsightType(checkIns)
            expect(result.type).toBe('MOOD_DROP_ALERT')
            expect(result.metadata?.moodTrend).toEqual([6, 5, 4])
        })
    })
})
