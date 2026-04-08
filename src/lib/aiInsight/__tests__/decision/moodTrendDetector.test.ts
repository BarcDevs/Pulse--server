import type { CheckInType } from '../../../../types/data/CheckInType'
import { isMoodDropping } from '../../decision/moodTrendDetector'

const createMockCheckIn = (overrides?: Partial<CheckInType>): CheckInType => ({
    id: 'mock-id',
    profileId: 'mock-profile-id',
    checkInDate: new Date(),
    moodScore: 5,
    painLevel: 3,
    activities: [],
    createdAt: new Date(),
    updatedAt: null,
    insights: [],
    ...overrides,
})

describe('isMoodDropping', () => {
    describe('Strictly decreasing moods', () => {
        it(
            'should detect strictly decreasing [7,6,5]',
            () => {
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
            expect(isMoodDropping(checkIns, 3)).toBe(true)
        })

        it('should detect strictly decreasing with larger gaps [10,7,3]', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 10,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 3,
                }),
            ]
            expect(isMoodDropping(checkIns, 3)).toBe(true)
        })

        it('should detect strictly decreasing [9,5,1]', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 9,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 1,
                }),
            ]
            expect(isMoodDropping(checkIns, 3)).toBe(true)
        })
    })

    describe('Non-strictly decreasing moods', () => {
        it('should NOT detect [7,7,6] (equal values break chain)', () => {
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
            expect(isMoodDropping(checkIns, 3)).toBe(false)
        })

        it('should NOT detect [7,6,6] (equal at end breaks chain)', () => {
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
            expect(isMoodDropping(checkIns, 3)).toBe(false)
        })

        it('should NOT detect [5,6,7] (increasing, not decreasing)', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 7,
                }),
            ]
            expect(isMoodDropping(checkIns, 3)).toBe(false)
        })

        it('should NOT detect [7,5,6] (non-monotonic)', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 5,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 6,
                }),
            ]
            expect(isMoodDropping(checkIns, 3)).toBe(false)
        })
    })

    describe('Insufficient data', () => {
        it('should return false for empty array', () => {
            expect(isMoodDropping([], 3)).toBe(false)
        })

        it('should return false for single check-in', () => {
            const checkIns = [
                createMockCheckIn({
                    moodScore: 5,
                }),
            ]
            expect(isMoodDropping(checkIns, 3)).toBe(false)
        })

        it('should return false when array length < consecutiveCount', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            expect(isMoodDropping(checkIns, 3)).toBe(false)
        })

        it('should return false when fewer than consecutiveCount valid mood entries exist', () => {
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
                    moodScore: undefined as any,
                }),
            ]
            expect(isMoodDropping(checkIns, 3)).toBe(false)
        })
    })

    describe('Custom consecutiveCount parameter', () => {
        it('should support custom consecutiveCount = 2', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            expect(isMoodDropping(checkIns, 2)).toBe(true)
        })

        it('should support custom consecutiveCount = 5', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-06'),
                    moodScore: 10,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-07'),
                    moodScore: 8,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 4,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 2,
                }),
            ]
            expect(isMoodDropping(checkIns, 5)).toBe(true)
        })

        it('should return false for custom count when insufficient data', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            expect(isMoodDropping(checkIns, 5)).toBe(false)
        })
    })

    describe('Calendar gaps (mood check ignores calendar days)', () => {
        it('should still detect mood drop even with missing calendar days', () => {
            // User checks in on day 1 (mood 7), skips day 2,
            // checks in on day 3 (mood 5)
            // Mood trend still evaluates these 2 records
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            expect(isMoodDropping(checkIns, 2)).toBe(true)
        })

        it('should evaluate latest 3 check-ins regardless of calendar gaps', () => {
            // 3 check-ins over 6 days with gaps
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-05'),
                    moodScore: 8,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 4,
                }),
            ]
            expect(isMoodDropping(checkIns, 3)).toBe(true)
        })
    })

    describe('Unsorted input', () => {
        it('should handle unsorted check-ins defensively', () => {
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
            expect(isMoodDropping(checkIns, 3)).toBe(true)
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

            expect(isMoodDropping(orderedCheckIns, 3)).toBe(
                isMoodDropping(unorderedCheckIns, 3)
            )
        })
    })

    describe('Missing/invalid mood scores', () => {
        it('should filter out check-ins with undefined moodScore', () => {
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
            expect(isMoodDropping(checkIns, 3)).toBe(false)
        })

        it('should filter out check-ins with null moodScore', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: null as any,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            expect(isMoodDropping(checkIns, 3)).toBe(false)
        })

        it('should handle non-numeric moodScore values', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: 7,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 'not a number' as any,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 5,
                }),
            ]
            expect(isMoodDropping(checkIns, 3)).toBe(false)
        })

        it('should still detect trend with only valid mood scores', () => {
            const checkIns = [
                createMockCheckIn({
                    checkInDate: new Date('2026-03-07'),
                    moodScore: 8,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-08'),
                    moodScore: undefined as any,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-09'),
                    moodScore: 6,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-10'),
                    moodScore: 4,
                }),
                createMockCheckIn({
                    checkInDate: new Date('2026-03-11'),
                    moodScore: 2,
                }),
            ]
            expect(isMoodDropping(checkIns, 3)).toBe(true)
        })
    })
})
