import { prevDay, toDateStr } from '../../lib/checkInDateHelpers'
import { calculateStreaks } from '../../lib/checkInStats'

const d = (dateStr: string) => new Date(`${dateStr}T00:00:00Z`)

describe('calculateStreaks', () => {
    const todayStr = toDateStr(new Date())
    const yesterdayStr = prevDay(todayStr)
    const twoDaysAgoStr = prevDay(yesterdayStr)
    const threeDaysAgoStr = prevDay(twoDaysAgoStr)

    describe('currentStreak', () => {
        it('returns 0 for empty array', () => {
            expect(calculateStreaks([])).toEqual({
                currentStreak: 0,
                longestStreak: 0
            })
        })

        it('returns 1 for today only', () => {
            expect(calculateStreaks([d(todayStr)]).currentStreak).toBe(1)
        })

        it('returns 1 for yesterday only', () => {
            expect(calculateStreaks([d(yesterdayStr)]).currentStreak).toBe(1)
        })

        it('returns 2 for today + yesterday', () => {
            expect(
                calculateStreaks([d(todayStr), d(yesterdayStr)]).currentStreak
            ).toBe(2)
        })

        it('returns 3 for today + yesterday + 2 days ago', () => {
            expect(
                calculateStreaks([
                    d(todayStr),
                    d(yesterdayStr),
                    d(twoDaysAgoStr)
                ]).currentStreak
            ).toBe(3)
        })

        it('returns 1 when most recent is today but yesterday is missing', () => {
            expect(
                calculateStreaks([d(todayStr), d(twoDaysAgoStr)]).currentStreak
            ).toBe(1)
        })

        it('returns 0 for old dates with gap from today/yesterday', () => {
            expect(
                calculateStreaks([d(twoDaysAgoStr), d(threeDaysAgoStr)]).currentStreak
            ).toBe(0)
        })

        it('deduplicates same-day check-ins', () => {
            expect(
                calculateStreaks([
                    d(todayStr),
                    d(todayStr),
                    d(yesterdayStr)
                ]).currentStreak
            ).toBe(2)
        })
    })

    describe('longestStreak', () => {
        it('returns 0 for empty array', () => {
            expect(calculateStreaks([]).longestStreak).toBe(0)
        })

        it('returns 1 for single date', () => {
            expect(calculateStreaks([d(todayStr)]).longestStreak).toBe(1)
        })

        it('returns 2 for today + yesterday', () => {
            expect(
                calculateStreaks([d(todayStr), d(yesterdayStr)]).longestStreak
            ).toBe(2)
        })

        it('returns 3 for 3 consecutive days', () => {
            expect(
                calculateStreaks([
                    d(todayStr),
                    d(yesterdayStr),
                    d(twoDaysAgoStr)
                ]).longestStreak
            ).toBe(3)
        })

        it('returns longest run when streak is broken', () => {
            expect(
                calculateStreaks([
                    d(todayStr),
                    d(twoDaysAgoStr),
                    d(threeDaysAgoStr)
                ]).longestStreak
            ).toBe(2)
        })
    })

    describe('timezone awareness for currentStreak', () => {
        it('uses timezone to determine today when computing currentStreak', () => {
            const utcPlusThree = 'Asia/Jerusalem'
            const result = calculateStreaks(
                [d(todayStr), d(yesterdayStr)],
                utcPlusThree
            )
            expect(result.currentStreak).toBe(2)
        })
    })
})
