import { calculateCurrentStreak } from '../streak-calculator'

describe('calculateCurrentStreak', () => {
    describe('Empty and single date', () => {
        it('should return 0 for empty array', () => {
            expect(calculateCurrentStreak([])).toBe(0)
        })

        it('should return 1 for single date', () => {
            const dates = [new Date('2026-03-10')]
            expect(calculateCurrentStreak(dates)).toBe(1)
        })
    })

    describe('Consecutive dates', () => {
        it('should return 3 for 3 consecutive days', () => {
            const dates = [
                new Date('2026-03-08'),
                new Date('2026-03-09'),
                new Date('2026-03-10'),
            ]
            expect(calculateCurrentStreak(dates)).toBe(3)
        })

        it('should return 5 for 5 consecutive days', () => {
            const dates = [
                new Date('2026-03-06'),
                new Date('2026-03-07'),
                new Date('2026-03-08'),
                new Date('2026-03-09'),
                new Date('2026-03-10'),
            ]
            expect(calculateCurrentStreak(dates)).toBe(5)
        })

        it('should count consecutive days from most recent backwards', () => {
            // 2026-03-10, 2026-03-09, 2026-03-08 are consecutive
            const dates = [
                new Date('2026-03-10'),
                new Date('2026-03-09'),
                new Date('2026-03-08'),
            ]
            expect(calculateCurrentStreak(dates)).toBe(3)
        })
    })

    describe('Broken streaks', () => {
        it('should return 1 when gap > 1 day breaks streak', () => {
            // Gap on 2026-03-09
            const dates = [
                new Date('2026-03-10'),
                new Date('2026-03-08'),
            ]
            expect(calculateCurrentStreak(dates)).toBe(1)
        })

        it('should return 1 for [2026-03-10, 2026-03-07] with 3-day gap', () => {
            const dates = [
                new Date('2026-03-10'),
                new Date('2026-03-07'),
            ]
            expect(calculateCurrentStreak(dates)).toBe(1)
        })

        it('should return 2 when streak broken by gap in older dates', () => {
            // 2026-03-10, 2026-03-09 are consecutive
            // Gap on 2026-03-08
            // 2026-03-07 is isolated
            const dates = [
                new Date('2026-03-10'),
                new Date('2026-03-09'),
                new Date('2026-03-07'),
            ]
            expect(calculateCurrentStreak(dates)).toBe(2)
        })

        it('should count only consecutive days from most recent', () => {
            // Most recent: 2026-03-10
            // 2026-03-09 is 1 day before → continue streak
            // 2026-03-07 is 2 days before 2026-03-09 → break
            const dates = [
                new Date('2026-03-10'),
                new Date('2026-03-09'),
                new Date('2026-03-08'),
                new Date('2026-03-07'),
                new Date('2026-03-05'),
            ]
            expect(calculateCurrentStreak(dates)).toBe(4)
        })
    })

    describe('Unsorted input', () => {
        it('should handle unsorted input correctly', () => {
            const dates = [
                new Date('2026-03-08'),
                new Date('2026-03-10'),
                new Date('2026-03-09'),
            ]
            expect(calculateCurrentStreak(dates)).toBe(3)
        })

        it('should produce same result regardless of input order', () => {
            const orderedDates = [
                new Date('2026-03-08'),
                new Date('2026-03-09'),
                new Date('2026-03-10'),
            ]
            const unorderedDates = [
                new Date('2026-03-10'),
                new Date('2026-03-08'),
                new Date('2026-03-09'),
            ]
            expect(calculateCurrentStreak(orderedDates)).toBe(
                calculateCurrentStreak(unorderedDates)
            )
        })

        it('should handle reverse-sorted input', () => {
            const dates = [
                new Date('2026-03-10'),
                new Date('2026-03-09'),
                new Date('2026-03-08'),
            ]
            expect(calculateCurrentStreak(dates)).toBe(3)
        })
    })

    describe('Duplicate dates', () => {
        it('should de-duplicate same calendar dates', () => {
            // Two check-ins on 2026-03-10 should count as 1 day
            const dates = [
                new Date('2026-03-10'),
                new Date('2026-03-10'),
                new Date('2026-03-09'),
                new Date('2026-03-08'),
            ]
            expect(calculateCurrentStreak(dates)).toBe(3)
        })

        it('should deduplicate all duplicate dates', () => {
            const dates = [
                new Date('2026-03-10'),
                new Date('2026-03-10'),
                new Date('2026-03-10'),
                new Date('2026-03-09'),
                new Date('2026-03-09'),
                new Date('2026-03-08'),
            ]
            expect(calculateCurrentStreak(dates)).toBe(3)
        })

        it('should return 1 if only duplicate dates exist', () => {
            const dates = [
                new Date('2026-03-10'),
                new Date('2026-03-10'),
                new Date('2026-03-10'),
            ]
            expect(calculateCurrentStreak(dates)).toBe(1)
        })
    })

    describe('Edge cases', () => {
        it('should handle dates with time components (only use date portion)', () => {
            const dates = [
                new Date('2026-03-10T15:30:00Z'),
                new Date('2026-03-09T08:00:00Z'),
                new Date('2026-03-08T23:59:59Z'),
            ]
            expect(calculateCurrentStreak(dates)).toBe(3)
        })

        it('should handle year transitions', () => {
            const dates = [
                new Date('2026-01-02'),
                new Date('2026-01-01'),
                new Date('2025-12-31'),
            ]
            expect(calculateCurrentStreak(dates)).toBe(3)
        })
    })
})
