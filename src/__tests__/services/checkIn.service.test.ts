// @ts-nocheck
import { Prisma } from '../../../prisma/generated/prisma/client'
import * as dateHelpers from '../../lib/checkInDateHelpers'
import * as checkInStats from '../../lib/checkInStats'
import * as checkInModel from '../../models/checkInModel'
import {
    createCheckIn,
    getCheckIns,
    getCheckInStats,
    updateCheckIn
} from '../../services/checkInService'
import * as insightService from '../../services/insightService'
import * as recommendationsService from '../../services/recommendationsService'

jest.mock('../../models/checkInModel')
jest.mock('../../services/insightService')
jest.mock('../../services/recommendationsService')
jest.mock('../../lib/checkInDateHelpers')
jest.mock('../../lib/checkInStats')
jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}))

const USER_ID = 'user-id-123'
const PROFILE_ID = 'profile-id-123'
const CHECK_IN_ID = 'check-in-id-123'
const TIMEZONE = 'America/New_York'
const CHECK_IN_DATE = new Date('2026-06-04')

const mockCheckIn = (overrides = {}) => ({
    id: CHECK_IN_ID,
    profileId: PROFILE_ID,
    moodScore: 7,
    painLevel: 3,
    activities: ['walking'],
    notes: null,
    checkInDate: CHECK_IN_DATE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
})

const mockProfileContext = () =>
    jest.spyOn(checkInModel, 'getProfileContext')
        .mockResolvedValue({ id: PROFILE_ID, timezone: TIMEZONE })

describe('CheckInService', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(dateHelpers, 'resolveCheckInDate').mockReturnValue(CHECK_IN_DATE)
        jest.spyOn(dateHelpers, 'resolveTimestampInUserTimeZone').mockReturnValue(new Date())
        jest.spyOn(insightService, 'generateInsightSafely').mockResolvedValue(undefined)
        jest.spyOn(recommendationsService, 'generateRecommendationsSafely').mockResolvedValue(undefined)
    })

    // ==================== getCheckIns ====================
    describe('getCheckIns', () => {
        it('fetches profileId and delegates to model', async () => {
            jest.spyOn(checkInModel, 'getProfileIdForUser').mockResolvedValue(PROFILE_ID)
            jest.spyOn(checkInModel, 'getCheckIns').mockResolvedValue([mockCheckIn()])

            const result = await getCheckIns(USER_ID, { limit: 10 })

            expect(checkInModel.getProfileIdForUser).toHaveBeenCalledWith(USER_ID)
            expect(checkInModel.getCheckIns).toHaveBeenCalledWith(PROFILE_ID, 10)
            expect(result).toHaveLength(1)
        })

        it('passes undefined limit when no query provided', async () => {
            jest.spyOn(checkInModel, 'getProfileIdForUser').mockResolvedValue(PROFILE_ID)
            jest.spyOn(checkInModel, 'getCheckIns').mockResolvedValue([])

            await getCheckIns(USER_ID)

            expect(checkInModel.getCheckIns).toHaveBeenCalledWith(PROFILE_ID, undefined)
        })
    })

    // ==================== createCheckIn ====================
    describe('createCheckIn', () => {
        const newCheckInData = {
            userId: USER_ID,
            moodScore: 7,
            painLevel: 3,
            activities: ['walking']
        }

        it('creates new check-in when none exists today', async () => {
            mockProfileContext()
            jest.spyOn(checkInModel, 'findTodayCheckIn').mockResolvedValueOnce(null)
            const created = mockCheckIn()
            jest.spyOn(checkInModel, 'createCheckIn').mockResolvedValue(created)
            jest.spyOn(checkInModel, 'updateUserLastCheckIn').mockResolvedValue(undefined)
            jest.spyOn(checkInModel, 'findTodayCheckIn').mockResolvedValueOnce(created)

            const result = await createCheckIn(newCheckInData)

            expect(result.created).toBe(true)
            expect(checkInModel.createCheckIn).toHaveBeenCalled()
        })

        it('updates existing check-in when one exists today', async () => {
            mockProfileContext()
            const existing = mockCheckIn()
            jest.spyOn(checkInModel, 'findTodayCheckIn')
                .mockResolvedValueOnce(existing)
                .mockResolvedValueOnce(existing)
            jest.spyOn(checkInModel, 'updateCheckIn').mockResolvedValue(undefined)

            const result = await createCheckIn(newCheckInData)

            expect(result.created).toBe(false)
            expect(checkInModel.updateCheckIn).toHaveBeenCalled()
            expect(checkInModel.createCheckIn).not.toHaveBeenCalled()
        })

        it('triggers insight and recommendations generation', async () => {
            mockProfileContext()
            jest.spyOn(checkInModel, 'findTodayCheckIn').mockResolvedValue(null)
            jest.spyOn(checkInModel, 'createCheckIn').mockResolvedValue(mockCheckIn())
            jest.spyOn(checkInModel, 'updateUserLastCheckIn').mockResolvedValue(undefined)
            jest.spyOn(checkInModel, 'findTodayCheckIn').mockResolvedValue(mockCheckIn())

            await createCheckIn(newCheckInData)

            expect(insightService.generateInsightSafely).toHaveBeenCalledWith(USER_ID, CHECK_IN_ID)
            expect(recommendationsService.generateRecommendationsSafely).toHaveBeenCalledWith(USER_ID, CHECK_IN_ID)
        })

        it('throws conflict on P2002 unique constraint violation', async () => {
            mockProfileContext()
            jest.spyOn(checkInModel, 'findTodayCheckIn').mockResolvedValue(null)
            const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique', {
                code: 'P2002',
                clientVersion: '5.0'
            })
            jest.spyOn(checkInModel, 'createCheckIn').mockRejectedValue(p2002Error)

            await expect(createCheckIn(newCheckInData)).rejects.toThrow(/check-in/)
        })

        it('rethrows non-P2002 errors', async () => {
            mockProfileContext()
            jest.spyOn(checkInModel, 'findTodayCheckIn').mockResolvedValue(null)
            jest.spyOn(checkInModel, 'createCheckIn').mockRejectedValue(new Error('DB failure'))

            await expect(createCheckIn(newCheckInData)).rejects.toThrow('DB failure')
        })
    })

    // ==================== updateCheckIn ====================
    describe('updateCheckIn', () => {
        const updateData = { userId: USER_ID, moodScore: 8 }

        it('throws not found when no check-in exists today', async () => {
            mockProfileContext()
            jest.spyOn(checkInModel, 'findTodayCheckIn').mockResolvedValue(null)

            await expect(updateCheckIn(updateData)).rejects.toThrow(/check-in/)
        })

        it('updates check-in and returns updated record', async () => {
            mockProfileContext()
            const existing = mockCheckIn()
            const updated = mockCheckIn({ moodScore: 8 })
            jest.spyOn(checkInModel, 'findTodayCheckIn')
                .mockResolvedValueOnce(existing)
                .mockResolvedValueOnce(updated)
            jest.spyOn(checkInModel, 'updateCheckIn').mockResolvedValue(undefined)
            jest.spyOn(checkInModel, 'updateUserLastCheckIn').mockResolvedValue(undefined)

            const result = await updateCheckIn(updateData)

            expect(result.moodScore).toBe(8)
        })

        it('triggers insight and recommendations after update', async () => {
            mockProfileContext()
            const existing = mockCheckIn()
            jest.spyOn(checkInModel, 'findTodayCheckIn')
                .mockResolvedValueOnce(existing)
                .mockResolvedValueOnce(existing)
            jest.spyOn(checkInModel, 'updateCheckIn').mockResolvedValue(undefined)
            jest.spyOn(checkInModel, 'updateUserLastCheckIn').mockResolvedValue(undefined)

            await updateCheckIn(updateData)

            expect(insightService.generateInsightSafely).toHaveBeenCalledWith(USER_ID, CHECK_IN_ID)
        })
    })

    // ==================== getCheckInStats ====================
    describe('getCheckInStats', () => {
        it('returns aggregated stats from check-ins', async () => {
            const checkIns = [mockCheckIn()]
            mockProfileContext()
            jest.spyOn(checkInModel, 'getCheckInsForStats').mockResolvedValue(checkIns)
            jest.spyOn(checkInStats, 'calculateAverageMood').mockReturnValue(7)
            jest.spyOn(checkInStats, 'calculateAveragePain').mockReturnValue(3)
            jest.spyOn(checkInStats, 'calculateTopActivities').mockReturnValue(['walking'])
            jest.spyOn(checkInStats, 'calculateStreaks').mockReturnValue({
                currentStreak: 5,
                longestStreak: 10
            })

            const result = await getCheckInStats(USER_ID)

            expect(result.totalCheckIns).toBe(1)
            expect(result.averageMoodScore).toBe(7)
            expect(result.averagePainLevel).toBe(3)
            expect(result.topActivities).toEqual(['walking'])
            expect(result.currentStreak).toBe(5)
        })

        it('returns 0 for totalCheckIns when no check-ins', async () => {
            mockProfileContext()
            jest.spyOn(checkInModel, 'getCheckInsForStats').mockResolvedValue([])
            jest.spyOn(checkInStats, 'calculateAverageMood').mockReturnValue(0)
            jest.spyOn(checkInStats, 'calculateAveragePain').mockReturnValue(0)
            jest.spyOn(checkInStats, 'calculateTopActivities').mockReturnValue([])
            jest.spyOn(checkInStats, 'calculateStreaks').mockReturnValue({
                currentStreak: 0,
                longestStreak: 0
            })

            const result = await getCheckInStats(USER_ID)

            expect(result.totalCheckIns).toBe(0)
        })
    })
})
