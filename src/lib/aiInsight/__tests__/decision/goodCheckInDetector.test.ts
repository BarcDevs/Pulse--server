import type { CheckInType } from '../../../../types/data/CheckInType'
import { isGoodCheckIn } from '../../decision/goodCheckInDetector'

const checkIn = (moodScore: number, painLevel: number): CheckInType => ({
    id: 'id1',
    profileId: 'profile1',
    checkInDate: new Date(),
    moodScore,
    painLevel,
    activities: [],
    createdAt: new Date(),
    updatedAt: null,
    insights: []
})

describe('isGoodCheckIn()', () => {
    it('is true for high mood and low pain', () => {
        expect(isGoodCheckIn(checkIn(8, 2))).toBe(true)
    })

    it('is true on the thresholds (mood 7, pain 4)', () => {
        expect(isGoodCheckIn(checkIn(7, 4))).toBe(true)
    })

    it('is false when mood is below 7', () => {
        expect(isGoodCheckIn(checkIn(6, 2))).toBe(false)
    })

    it('is false when pain is above 4', () => {
        expect(isGoodCheckIn(checkIn(9, 5))).toBe(false)
    })
})
