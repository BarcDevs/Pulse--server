import { prevDay, toDateStr } from '../../lib/checkInDateHelpers'
import {
    calculateAverageMood,
    calculateAveragePain,
    calculateStreaks,
    calculateTopActivities
} from '../../lib/checkInStats'

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

const makeCheckIn = (overrides: Record<string, unknown> = {}) => ({
    moodScore: 5,
    painLevel: 3,
    activities: [] as string[],
    checkInDate: new Date(),
    ...overrides
})

describe('calculateAverageMood', () => {
    it('returns 0 for empty array', () => {
        expect(calculateAverageMood([])).toBe(0)
    })

    it('returns score for single check-in', () => {
        expect(calculateAverageMood([makeCheckIn({ moodScore: 8 })])).toBe(8)
    })

    it('returns average for multiple check-ins', () => {
        const checkIns = [
            makeCheckIn({ moodScore: 6 }),
            makeCheckIn({ moodScore: 8 }),
            makeCheckIn({ moodScore: 10 })
        ]
        expect(calculateAverageMood(checkIns)).toBeCloseTo(8)
    })

    it('returns fractional average when not whole number', () => {
        const checkIns = [makeCheckIn({ moodScore: 7 }), makeCheckIn({ moodScore: 8 })]
        expect(calculateAverageMood(checkIns)).toBe(7.5)
    })
})

describe('calculateAveragePain', () => {
    it('returns 0 for empty array', () => {
        expect(calculateAveragePain([])).toBe(0)
    })

    it('returns score for single check-in', () => {
        expect(calculateAveragePain([makeCheckIn({ painLevel: 4 })])).toBe(4)
    })

    it('returns average for multiple check-ins', () => {
        const checkIns = [
            makeCheckIn({ painLevel: 2 }),
            makeCheckIn({ painLevel: 4 }),
            makeCheckIn({ painLevel: 6 })
        ]
        expect(calculateAveragePain(checkIns)).toBeCloseTo(4)
    })

    it('returns 0 for all-zero pain levels', () => {
        const checkIns = [makeCheckIn({ painLevel: 0 }), makeCheckIn({ painLevel: 0 })]
        expect(calculateAveragePain(checkIns)).toBe(0)
    })
})

describe('calculateTopActivities', () => {
    it('returns empty array for empty input', () => {
        expect(calculateTopActivities([])).toEqual([])
    })

    it('returns single activity for single check-in', () => {
        expect(
            calculateTopActivities([makeCheckIn({ activities: ['walking'] })])
        ).toEqual(['walking'])
    })

    it('returns activities ranked by frequency', () => {
        const checkIns = [
            makeCheckIn({ activities: ['walking', 'yoga'] }),
            makeCheckIn({ activities: ['walking', 'swimming'] }),
            makeCheckIn({ activities: ['yoga'] })
        ]
        const result = calculateTopActivities(checkIns)
        expect(result[0]).toBe('walking')
        expect(result[1]).toBe('yoga')
    })

    it('returns at most 5 activities', () => {
        const checkIns = [
            makeCheckIn({ activities: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] })
        ]
        expect(calculateTopActivities(checkIns)).toHaveLength(5)
    })

    it('handles check-ins with no activities', () => {
        const checkIns = [
            makeCheckIn({ activities: [] }),
            makeCheckIn({ activities: ['running'] })
        ]
        expect(calculateTopActivities(checkIns)).toEqual(['running'])
    })
})
