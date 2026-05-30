import { checkInConfig } from '../../config/app'
import { resolveCheckInDate } from '../../lib/checkInDateHelpers'

// 21:30 UTC on May 29 = 00:30 Jerusalem (IDT, UTC+3) on May 30
const MAY_29_21_30_UTC = new Date('2026-05-29T21:30:00Z')
const MAY_29_MIDNIGHT_UTC = new Date('2026-05-29T00:00:00Z')
const MAY_30_MIDNIGHT_UTC = new Date('2026-05-30T00:00:00Z')

describe('resolveCheckInDate', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    describe('undefined timezone → uses defaultTimezone', () => {
        it('returns Jerusalem date, not UTC date', () => {
            jest.setSystemTime(MAY_29_21_30_UTC)
            // UTC says May 29, Jerusalem says May 30 — must return May 30
            expect(resolveCheckInDate(undefined)).toEqual(MAY_30_MIDNIGHT_UTC)
        })

        it('no arg: returns Jerusalem date', () => {
            jest.setSystemTime(MAY_29_21_30_UTC)
            expect(resolveCheckInDate()).toEqual(MAY_30_MIDNIGHT_UTC)
        })

        it('default is Asia/Jerusalem per appConfig', () => {
            expect(checkInConfig.defaultTimezone).toBe('Asia/Jerusalem')
        })
    })

    describe('valid IANA timezone', () => {
        it('Asia/Jerusalem at 00:30 local → returns new day', () => {
            jest.setSystemTime(MAY_29_21_30_UTC)
            expect(resolveCheckInDate('Asia/Jerusalem')).toEqual(MAY_30_MIDNIGHT_UTC)
        })

        it('UTC timezone → returns UTC date', () => {
            jest.setSystemTime(MAY_29_21_30_UTC)
            expect(resolveCheckInDate('UTC')).toEqual(MAY_29_MIDNIGHT_UTC)
        })

        it('daytime (10:00 UTC): Asia/Jerusalem returns same calendar day', () => {
            jest.setSystemTime(new Date('2026-05-29T10:00:00Z'))
            // 10:00 UTC = 13:00 Jerusalem → still May 29
            expect(resolveCheckInDate('Asia/Jerusalem')).toEqual(MAY_29_MIDNIGHT_UTC)
        })
    })

    describe('invalid timezone → falls back to defaultTimezone', () => {
        it('"UTC+3" is invalid IANA → falls back to Asia/Jerusalem', () => {
            jest.setSystemTime(MAY_29_21_30_UTC)
            expect(resolveCheckInDate('UTC+3')).toEqual(MAY_30_MIDNIGHT_UTC)
        })
    })

    describe('midnight boundary (the bug)', () => {
        it('undefined timezone at 21:30 UTC returns different date than UTC would', () => {
            jest.setSystemTime(MAY_29_21_30_UTC)
            const withNull = resolveCheckInDate(undefined)
            const withUtc = resolveCheckInDate('UTC')
            // Confirms null no longer silently falls back to UTC
            expect(withNull).not.toEqual(withUtc)
        })
    })
})
