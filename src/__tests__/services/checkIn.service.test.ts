import { Prisma } from '../../../prisma/generated/prisma/client'
import * as dateHelpers from '../../lib/checkInDateHelpers'
import * as checkInStats from '../../lib/checkInStats'
import * as checkInAiJobModel from '../../models/checkInAiJobModel'
import * as checkInModel from '../../models/checkInModel'
import {
    createCheckIn,
    getCheckIns,
    getCheckInStats,
    updateCheckIn
} from '../../services/checkInService'

jest.mock('../../models/checkInModel')
jest.mock('../../models/checkInAiJobModel')
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
    insights: [],
    ...overrides
})

const mockProfileContext = () =>
    jest.spyOn(checkInModel, 'getProfileContext')
        .mockResolvedValue({ id: PROFILE_ID, timezone: TIMEZONE } as never)

describe('CheckInService', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(dateHelpers, 'resolveCheckInDate').mockReturnValue(CHECK_IN_DATE as never)
        jest.spyOn(dateHelpers, 'resolveTimestampInUserTimeZone').mockReturnValue(new Date())
        jest.spyOn(checkInAiJobModel, 'enqueueJob').mockResolvedValue(undefined as never)
    })

    // ==================== model error propagation ====================
    describe('model error propagation', () => {
        it('getCheckIns propagates getProfileIdForUser error', async () => {
            jest.spyOn(checkInModel, 'getProfileIdForUser')
                .mockRejectedValue(new Error('DB error'))

            await expect(
                getCheckIns(USER_ID)
            ).rejects.toThrow('DB error')
        })

        it('createCheckIn propagates getProfileContext error', async () => {
            jest.spyOn(checkInModel, 'getProfileContext')
                .mockRejectedValue(new Error('Profile not found'))

            await expect(
                createCheckIn({ userId: USER_ID, moodScore: 7, painLevel: 3, activities: [] })
            ).rejects.toThrow('Profile not found')
        })

        it('createCheckIn propagates updateUserLastCheckIn error', async () => {
            mockProfileContext()
            jest.spyOn(checkInModel, 'findTodayCheckIn').mockResolvedValue(null as never)
            jest.spyOn(checkInModel, 'createCheckIn').mockResolvedValue(mockCheckIn())
            jest.spyOn(checkInModel, 'updateUserLastCheckIn')
                .mockRejectedValue(new Error('DB error'))

            await expect(
                createCheckIn({ userId: USER_ID, moodScore: 7, painLevel: 3, activities: [] })
            ).rejects.toThrow('DB error')
        })

        it('updateCheckIn propagates getProfileContext error', async () => {
            jest.spyOn(checkInModel, 'getProfileContext')
                .mockRejectedValue(new Error('DB error'))

            await expect(
                updateCheckIn({ userId: USER_ID, moodScore: 8 })
            ).rejects.toThrow('DB error')
        })

        it('getCheckInStats propagates getProfileContext error', async () => {
            jest.spyOn(checkInModel, 'getProfileContext')
                .mockRejectedValue(new Error('DB error'))

            await expect(
                getCheckInStats(USER_ID)
            ).rejects.toThrow('DB error')
        })
    })

    // ==================== getCheckIns ====================
    describe('getCheckIns', () => {
        it('fetches profileId and delegates to model', async () => {
            jest.spyOn(checkInModel, 'getProfileIdForUser').mockResolvedValue(PROFILE_ID as never)
            jest.spyOn(checkInModel, 'getCheckIns').mockResolvedValue([mockCheckIn()])

            const result = await getCheckIns(USER_ID, { limit: 10 })

            expect(checkInModel.getProfileIdForUser).toHaveBeenCalledWith(USER_ID)
            expect(checkInModel.getCheckIns).toHaveBeenCalledWith(PROFILE_ID, 10)
            expect(result).toHaveLength(1)
        })

        it('passes undefined limit when no query provided', async () => {
            jest.spyOn(checkInModel, 'getProfileIdForUser').mockResolvedValue(PROFILE_ID as never)
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
            jest.spyOn(checkInModel, 'findTodayCheckIn').mockResolvedValueOnce(null as never)
            const created = mockCheckIn()
            jest.spyOn(checkInModel, 'createCheckIn').mockResolvedValue(created as never)
            jest.spyOn(checkInModel, 'updateUserLastCheckIn').mockResolvedValue(undefined as never)
            jest.spyOn(checkInModel, 'findTodayCheckIn').mockResolvedValueOnce(created as never)

            const result = await createCheckIn(newCheckInData)

            expect(result.created).toBe(true)
            expect(checkInModel.createCheckIn).toHaveBeenCalled()
        })

        it('updates existing check-in when one exists today', async () => {
            mockProfileContext()
            const existing = mockCheckIn()
            jest.spyOn(checkInModel, 'findTodayCheckIn')
                .mockResolvedValueOnce(existing as never)
                .mockResolvedValueOnce(existing as never)
            jest.spyOn(checkInModel, 'updateCheckIn').mockResolvedValue(undefined as never)

            const result = await createCheckIn(newCheckInData)

            expect(result.created).toBe(false)
            expect(checkInModel.updateCheckIn).toHaveBeenCalled()
            expect(checkInModel.createCheckIn).not.toHaveBeenCalled()
        })

        it('queues the AI job instead of generating inline', async () => {
            mockProfileContext()
            jest.spyOn(checkInModel, 'findTodayCheckIn').mockResolvedValue(null as never)
            jest.spyOn(checkInModel, 'createCheckIn').mockResolvedValue(mockCheckIn())
            jest.spyOn(checkInModel, 'updateUserLastCheckIn').mockResolvedValue(undefined as never)
            jest.spyOn(checkInModel, 'findTodayCheckIn').mockResolvedValue(mockCheckIn())

            await createCheckIn(newCheckInData)

            expect(checkInAiJobModel.enqueueJob).toHaveBeenCalledWith(CHECK_IN_ID, USER_ID)
        })

        it('queues the AI job when updating the existing check-in of today', async () => {
            mockProfileContext()
            const existing = mockCheckIn()
            jest.spyOn(checkInModel, 'findTodayCheckIn').mockResolvedValue(existing as never)
            jest.spyOn(checkInModel, 'updateCheckIn').mockResolvedValue(undefined as never)

            await createCheckIn(newCheckInData)

            expect(checkInAiJobModel.enqueueJob).toHaveBeenCalledWith(CHECK_IN_ID, USER_ID)
        })

        it('still returns the saved check-in when queuing the AI job fails', async () => {
            mockProfileContext()
            const created = mockCheckIn()
            jest.spyOn(checkInModel, 'findTodayCheckIn')
                .mockResolvedValueOnce(null as never)
                .mockResolvedValueOnce(created as never)
            jest.spyOn(checkInModel, 'createCheckIn').mockResolvedValue(created as never)
            jest.spyOn(checkInModel, 'updateUserLastCheckIn').mockResolvedValue(undefined as never)
            jest.spyOn(checkInAiJobModel, 'enqueueJob').mockRejectedValue(new Error('db blip'))

            const result = await createCheckIn(newCheckInData)

            expect(result).toEqual({ checkIn: created, created: true })
        })

        it('does not fail the request when the AI job cannot run yet', async () => {
            mockProfileContext()
            const created = mockCheckIn({ insightsStatus: 'pending' })
            jest.spyOn(checkInModel, 'findTodayCheckIn')
                .mockResolvedValueOnce(null as never)
                .mockResolvedValueOnce(created as never)
            jest.spyOn(checkInModel, 'createCheckIn').mockResolvedValue(created as never)
            jest.spyOn(checkInModel, 'updateUserLastCheckIn').mockResolvedValue(undefined as never)

            const result = await createCheckIn(newCheckInData)

            expect(result.checkIn.insightsStatus).toBe('pending')
        })

        it('falls through to update on P2002 (concurrent create race)', async () => {
            mockProfileContext()
            const existing = mockCheckIn()
            const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique', {
                code: 'P2002',
                clientVersion: '5.0'
            })
            jest.spyOn(checkInModel, 'findTodayCheckIn')
                .mockResolvedValueOnce(null as never)
                .mockResolvedValue(existing as never)
            jest.spyOn(checkInModel, 'createCheckIn').mockRejectedValue(p2002Error)
            jest.spyOn(checkInModel, 'updateCheckIn').mockResolvedValue(undefined as never)

            const result = await createCheckIn(newCheckInData)

            expect(checkInModel.updateCheckIn).toHaveBeenCalled()
            expect(result).toEqual({ checkIn: existing, created: false })
        })

        it('rethrows non-P2002 errors', async () => {
            mockProfileContext()
            jest.spyOn(checkInModel, 'findTodayCheckIn').mockResolvedValue(null as never)
            jest.spyOn(checkInModel, 'createCheckIn').mockRejectedValue(new Error('DB failure'))

            await expect(createCheckIn(newCheckInData)).rejects.toThrow('DB failure')
        })
    })

    // ==================== updateCheckIn ====================
    describe('updateCheckIn', () => {
        const updateData = { userId: USER_ID, moodScore: 8 }

        it('throws not found when no check-in exists today', async () => {
            mockProfileContext()
            jest.spyOn(checkInModel, 'findTodayCheckIn').mockResolvedValue(null as never)

            await expect(updateCheckIn(updateData)).rejects.toThrow(/check-in/)
        })

        it('updates check-in and returns updated record', async () => {
            mockProfileContext()
            const existing = mockCheckIn()
            const updated = mockCheckIn({ moodScore: 8 })
            jest.spyOn(checkInModel, 'findTodayCheckIn')
                .mockResolvedValueOnce(existing as never)
                .mockResolvedValueOnce(updated as never)
            jest.spyOn(checkInModel, 'updateCheckIn').mockResolvedValue(undefined as never)
            jest.spyOn(checkInModel, 'updateUserLastCheckIn').mockResolvedValue(undefined as never)

            const result = await updateCheckIn(updateData)

            expect(result.moodScore).toBe(8)
        })

        it('queues the AI job after update', async () => {
            mockProfileContext()
            const existing = mockCheckIn()
            jest.spyOn(checkInModel, 'findTodayCheckIn')
                .mockResolvedValueOnce(existing as never)
                .mockResolvedValueOnce(existing as never)
            jest.spyOn(checkInModel, 'updateCheckIn').mockResolvedValue(undefined as never)
            jest.spyOn(checkInModel, 'updateUserLastCheckIn').mockResolvedValue(undefined as never)

            await updateCheckIn(updateData)

            expect(checkInAiJobModel.enqueueJob).toHaveBeenCalledWith(CHECK_IN_ID, USER_ID)
        })
    })

    // ==================== getCheckInStats ====================
    describe('getCheckInStats', () => {
        it('returns aggregated stats from check-ins', async () => {
            const checkIns = [mockCheckIn()]
            mockProfileContext()
            jest.spyOn(checkInModel, 'getCheckInsForStats').mockResolvedValue(checkIns as never)
            jest.spyOn(checkInStats, 'calculateAverageMood').mockReturnValue(7 as never)
            jest.spyOn(checkInStats, 'calculateAveragePain').mockReturnValue(3 as never)
            jest.spyOn(checkInStats, 'calculateTopActivities').mockReturnValue(['walking'])
            jest.spyOn(checkInStats, 'calculateStreaks').mockReturnValue({
                currentStreak: 5,
                longestStreak: 10
            } as never)

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
            jest.spyOn(checkInStats, 'calculateAverageMood').mockReturnValue(0 as never)
            jest.spyOn(checkInStats, 'calculateAveragePain').mockReturnValue(0 as never)
            jest.spyOn(checkInStats, 'calculateTopActivities').mockReturnValue([])
            jest.spyOn(checkInStats, 'calculateStreaks').mockReturnValue({
                currentStreak: 0,
                longestStreak: 0
            } as never)

            const result = await getCheckInStats(USER_ID)

            expect(result.totalCheckIns).toBe(0)
        })
    })
})
