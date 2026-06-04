// @ts-nocheck
import * as cache from '../../lib/cache/dailyObservationCache'
import type { TodayObservationResponse } from '../../types/data/DailyObservationType'

jest.mock('../../lib/checkInDateHelpers', () => ({
    resolveCheckInDate: jest.fn(() => new Date('2026-01-01T00:00:00.000Z')),
    toDateStr: jest.fn((d: Date) => d.toISOString().slice(0, 10))
}))

const mockObservation: TodayObservationResponse = {
    title: 'Daily insight',
    type: 'mood_stability',
    observation: 'Your mood has been stable.',
    supportiveDescription: 'Keep it up.',
    icon: 'Smile',
    createdAt: '2026-01-01 10:00'
}

describe('dailyObservationCache', () => {
    beforeEach(() => {
        cache.clearCache()
        jest.useRealTimers()
    })

    afterEach(() => {
        cache.clearCache()
        jest.useRealTimers()
    })

    describe('get', () => {
        it('returns undefined (cache miss) when not set', () => {
            const result = cache.get('user-1', 'UTC')

            expect(result).toBeUndefined()
        })

        it('returns cached observation within TTL', () => {
            jest.useFakeTimers()

            cache.set('user-1', 'UTC', mockObservation)

            const result = cache.get('user-1', 'UTC')

            expect(result).toEqual(mockObservation)
        })

        it('returns null when null was explicitly cached', () => {
            cache.set('user-1', 'UTC', null)

            const result = cache.get('user-1', 'UTC')

            expect(result).toBeNull()
        })

        it('returns undefined after TTL expires', () => {
            jest.useFakeTimers()

            cache.set('user-1', 'UTC', mockObservation)

            // Advance past midnight (25 hours to be safe)
            jest.advanceTimersByTime(25 * 60 * 60 * 1_000)

            const result = cache.get('user-1', 'UTC')

            expect(result).toBeUndefined()
        })

        it('different users have separate cache entries', () => {
            cache.set('user-1', 'UTC', mockObservation)

            expect(cache.get('user-2', 'UTC')).toBeUndefined()
        })

        it('same user different timezones produce separate entries', () => {
            // resolveCheckInDate returns same date regardless of timezone in mock,
            // but the key includes timezone — different keys
            const { resolveCheckInDate } = require('../../lib/checkInDateHelpers')

            resolveCheckInDate.mockReturnValueOnce(new Date('2026-01-01'))
            cache.set('user-1', 'UTC', mockObservation)

            resolveCheckInDate.mockReturnValueOnce(new Date('2026-01-02'))
            const result = cache.get('user-1', 'America/New_York')

            expect(result).toBeUndefined()
        })
    })

    describe('set', () => {
        it('stores observation that can be retrieved', () => {
            cache.set('user-1', 'UTC', mockObservation)

            expect(cache.get('user-1', 'UTC')).toEqual(mockObservation)
        })

        it('stores null observation (no pattern detected)', () => {
            cache.set('user-1', 'UTC', null)

            expect(cache.get('user-1', 'UTC')).toBeNull()
        })

        it('overwrites previous observation for same user/date', () => {
            const updated = { ...mockObservation, title: 'Updated' }

            cache.set('user-1', 'UTC', mockObservation)
            cache.set('user-1', 'UTC', updated)

            expect(cache.get('user-1', 'UTC')).toEqual(updated)
        })

        it('cleans expired entries when new entry is set', () => {
            jest.useFakeTimers()

            const { resolveCheckInDate } = require('../../lib/checkInDateHelpers')
            resolveCheckInDate.mockReturnValue(new Date('2026-01-01'))

            cache.set('user-expired', 'UTC', mockObservation)

            // Expire by advancing time
            jest.advanceTimersByTime(25 * 60 * 60 * 1_000)

            // Setting a new entry triggers cleanup
            resolveCheckInDate.mockReturnValue(new Date('2026-01-02'))
            cache.set('user-1', 'UTC', mockObservation)

            // Expired user entry is gone
            resolveCheckInDate.mockReturnValue(new Date('2026-01-01'))
            expect(cache.get('user-expired', 'UTC')).toBeUndefined()
        })

        it('independent entries for N users do not interfere', () => {
            for (let i = 0; i < 5; i++) {
                cache.set(`user-${i}`, 'UTC', { ...mockObservation, title: `title-${i}` })
            }

            for (let i = 0; i < 5; i++) {
                const result = cache.get(`user-${i}`, 'UTC')
                expect(result?.title).toBe(`title-${i}`)
            }
        })
    })

    describe('clearCache', () => {
        it('removes all entries', () => {
            cache.set('user-1', 'UTC', mockObservation)
            cache.set('user-2', 'UTC', null)

            cache.clearCache()

            expect(cache.get('user-1', 'UTC')).toBeUndefined()
            expect(cache.get('user-2', 'UTC')).toBeUndefined()
        })
    })
})
