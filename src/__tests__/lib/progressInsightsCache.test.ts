// @ts-nocheck
import * as cache from '../../lib/cache/progressInsightsCache'
import type { ProgressInsight } from '../../types/data/ProgressInsightType'

const mockInsight: ProgressInsight = {
    type: 'mood_trend',
    title: 'Mood improving',
    description: 'Your mood has been improving.',
    metadata: {}
} as unknown as ProgressInsight

const params = {
    userId: 'user-1',
    timeWindow: 'week',
    windowStart: new Date('2026-01-01'),
    windowEnd: new Date('2026-01-07'),
    lastCheckInTimestamp: 1000000
}

describe('progressInsightsCache', () => {
    beforeEach(() => {
        cache.clear()
        jest.useRealTimers()
    })

    afterEach(() => {
        cache.clear()
        jest.useRealTimers()
    })

    describe('get', () => {
        it('returns null when cache is empty', () => {
            const result = cache.get(
                params.userId,
                params.timeWindow,
                params.windowStart,
                params.windowEnd,
                params.lastCheckInTimestamp
            )

            expect(result).toBeNull()
        })

        it('returns cached insight within TTL', () => {
            cache.set(
                params.userId,
                params.timeWindow,
                params.windowStart,
                params.windowEnd,
                params.lastCheckInTimestamp,
                mockInsight,
                60_000
            )

            const result = cache.get(
                params.userId,
                params.timeWindow,
                params.windowStart,
                params.windowEnd,
                params.lastCheckInTimestamp
            )

            expect(result).toEqual(mockInsight)
        })

        it('returns null after TTL expires', () => {
            jest.useFakeTimers()

            cache.set(
                params.userId,
                params.timeWindow,
                params.windowStart,
                params.windowEnd,
                params.lastCheckInTimestamp,
                mockInsight,
                1_000
            )

            jest.advanceTimersByTime(2_000)

            const result = cache.get(
                params.userId,
                params.timeWindow,
                params.windowStart,
                params.windowEnd,
                params.lastCheckInTimestamp
            )

            expect(result).toBeNull()
        })

        it('different users do not share cache entries', () => {
            cache.set(
                'user-1',
                params.timeWindow,
                params.windowStart,
                params.windowEnd,
                params.lastCheckInTimestamp,
                mockInsight,
                60_000
            )

            const result = cache.get(
                'user-2',
                params.timeWindow,
                params.windowStart,
                params.windowEnd,
                params.lastCheckInTimestamp
            )

            expect(result).toBeNull()
        })

        it('different time windows produce separate cache entries', () => {
            cache.set(
                params.userId,
                'week',
                params.windowStart,
                params.windowEnd,
                params.lastCheckInTimestamp,
                mockInsight,
                60_000
            )

            const result = cache.get(
                params.userId,
                'month',
                params.windowStart,
                params.windowEnd,
                params.lastCheckInTimestamp
            )

            expect(result).toBeNull()
        })

        it('different lastCheckInTimestamp produces separate cache entries', () => {
            cache.set(
                params.userId,
                params.timeWindow,
                params.windowStart,
                params.windowEnd,
                1000,
                mockInsight,
                60_000
            )

            const result = cache.get(
                params.userId,
                params.timeWindow,
                params.windowStart,
                params.windowEnd,
                2000
            )

            expect(result).toBeNull()
        })
    })

    describe('set', () => {
        it('stores insight retrievable by same key', () => {
            cache.set(
                params.userId,
                params.timeWindow,
                params.windowStart,
                params.windowEnd,
                params.lastCheckInTimestamp,
                mockInsight,
                60_000
            )

            expect(
                cache.get(
                    params.userId,
                    params.timeWindow,
                    params.windowStart,
                    params.windowEnd,
                    params.lastCheckInTimestamp
                )
            ).toEqual(mockInsight)
        })

        it('overwrites existing entry for same key', () => {
            const updated = { ...mockInsight, title: 'Updated' } as unknown as ProgressInsight

            cache.set(
                params.userId,
                params.timeWindow,
                params.windowStart,
                params.windowEnd,
                params.lastCheckInTimestamp,
                mockInsight,
                60_000
            )

            cache.set(
                params.userId,
                params.timeWindow,
                params.windowStart,
                params.windowEnd,
                params.lastCheckInTimestamp,
                updated,
                60_000
            )

            expect(
                cache.get(
                    params.userId,
                    params.timeWindow,
                    params.windowStart,
                    params.windowEnd,
                    params.lastCheckInTimestamp
                )
            ).toEqual(updated)
        })

        it('cleans expired entries on set', () => {
            jest.useFakeTimers()

            const otherParams = {
                ...params,
                userId: 'user-expired'
            }

            cache.set(
                otherParams.userId,
                otherParams.timeWindow,
                otherParams.windowStart,
                otherParams.windowEnd,
                otherParams.lastCheckInTimestamp,
                mockInsight,
                500
            )

            jest.advanceTimersByTime(1_000)

            // Setting a new entry triggers cleanup
            cache.set(
                params.userId,
                params.timeWindow,
                params.windowStart,
                params.windowEnd,
                params.lastCheckInTimestamp,
                mockInsight,
                60_000
            )

            // Expired entry is gone
            expect(
                cache.get(
                    otherParams.userId,
                    otherParams.timeWindow,
                    otherParams.windowStart,
                    otherParams.windowEnd,
                    otherParams.lastCheckInTimestamp
                )
            ).toBeNull()
        })
    })

    describe('clear', () => {
        it('removes all entries from cache', () => {
            cache.set(
                params.userId,
                params.timeWindow,
                params.windowStart,
                params.windowEnd,
                params.lastCheckInTimestamp,
                mockInsight,
                60_000
            )

            cache.clear()

            expect(
                cache.get(
                    params.userId,
                    params.timeWindow,
                    params.windowStart,
                    params.windowEnd,
                    params.lastCheckInTimestamp
                )
            ).toBeNull()
        })

        it('multiple sets then clear leaves cache empty', () => {
            for (let i = 0; i < 5; i++) {
                cache.set(
                    `user-${i}`,
                    params.timeWindow,
                    params.windowStart,
                    params.windowEnd,
                    i,
                    mockInsight,
                    60_000
                )
            }

            cache.clear()

            for (let i = 0; i < 5; i++) {
                expect(
                    cache.get(
                        `user-${i}`,
                        params.timeWindow,
                        params.windowStart,
                        params.windowEnd,
                        i
                    )
                ).toBeNull()
            }
        })
    })
})
