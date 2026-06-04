// @ts-nocheck
import type { Request, Response } from 'express'

import * as checkInController from '../../controllers/checkInController'
import * as checkInService from '../../services/checkInService'
import * as progressInsightsService from '../../services/progressInsightsService'
import {
    createMockRequest,
    createMockResponse
} from '../setup/testSetup'

jest.mock('../../services/checkInService')
jest.mock('../../services/progressInsightsService')

const USER_ID = 'user-id-123'

const mockCheckIn = (overrides = {}) => ({
    id: 'check-in-id',
    profileId: 'profile-id',
    moodScore: 7,
    painLevel: 3,
    activities: ['walking'],
    notes: null,
    checkInDate: new Date('2026-06-04'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
})

describe('CheckInController', () => {
    let res: Response

    beforeEach(() => {
        jest.clearAllMocks()
        res = createMockResponse() as unknown as Response
    })

    // ==================== getCheckIns ====================
    describe('getCheckIns', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest() as unknown as Request

            await expect(
                checkInController.getCheckIns(req, res)
            ).rejects.toThrow()
        })

        it('calls service with userId and parsed query', async () => {
            const checkIns = [mockCheckIn()]
            jest.spyOn(checkInService, 'getCheckIns').mockResolvedValue(checkIns)

            const req = createMockRequest({
                userId: USER_ID,
                query: { limit: '5' }
            }) as unknown as Request

            await checkInController.getCheckIns(req, res)

            expect(checkInService.getCheckIns).toHaveBeenCalledWith(
                USER_ID,
                expect.objectContaining({ limit: 5 })
            )
        })

        it('returns check-ins in response', async () => {
            const checkIns = [mockCheckIn(), mockCheckIn({ id: 'c2' })]
            jest.spyOn(checkInService, 'getCheckIns').mockResolvedValue(checkIns)

            const req = createMockRequest({ userId: USER_ID }) as unknown as Request

            await checkInController.getCheckIns(req, res)

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: checkIns })
            )
        })
    })

    // ==================== createCheckIn ====================
    describe('createCheckIn', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest({
                body: { moodScore: 7, painLevel: 3, activities: ['walking'] }
            }) as unknown as Request

            await expect(
                checkInController.createCheckIn(req, res)
            ).rejects.toThrow()
        })

        it('calls service and returns 201 on create', async () => {
            const checkIn = mockCheckIn()
            jest.spyOn(checkInService, 'createCheckIn').mockResolvedValue({
                checkIn,
                created: true
            })

            const req = createMockRequest({
                userId: USER_ID,
                body: { moodScore: 7, painLevel: 3, activities: ['walking'] }
            }) as unknown as Request

            await checkInController.createCheckIn(req, res)

            expect(checkInService.createCheckIn).toHaveBeenCalledWith(
                expect.objectContaining({ userId: USER_ID })
            )
            expect(res.status).toHaveBeenCalledWith(201)
        })

        it('returns 200 on update (created=false)', async () => {
            const checkIn = mockCheckIn()
            jest.spyOn(checkInService, 'createCheckIn').mockResolvedValue({
                checkIn,
                created: false
            })

            const req = createMockRequest({
                userId: USER_ID,
                body: { moodScore: 8, painLevel: 2, activities: [] }
            }) as unknown as Request

            await checkInController.createCheckIn(req, res)

            expect(res.status).toHaveBeenCalledWith(200)
        })
    })

    // ==================== updateCheckIn ====================
    describe('updateCheckIn', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest({
                body: { moodScore: 8 }
            }) as unknown as Request

            await expect(
                checkInController.updateCheckIn(req, res)
            ).rejects.toThrow()
        })

        it('calls service and returns updated check-in', async () => {
            const updated = mockCheckIn({ moodScore: 8 })
            jest.spyOn(checkInService, 'updateCheckIn').mockResolvedValue(updated)

            const req = createMockRequest({
                userId: USER_ID,
                body: { moodScore: 8 }
            }) as unknown as Request

            await checkInController.updateCheckIn(req, res)

            expect(checkInService.updateCheckIn).toHaveBeenCalledWith(
                expect.objectContaining({ userId: USER_ID })
            )
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: updated })
            )
        })
    })

    // ==================== getCheckInStats ====================
    describe('getCheckInStats', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest() as unknown as Request

            await expect(
                checkInController.getCheckInStats(req, res)
            ).rejects.toThrow()
        })

        it('returns stats', async () => {
            const stats = {
                totalCheckIns: 10,
                averageMoodScore: 7,
                averagePainLevel: 3,
                topActivities: ['walking'],
                currentStreak: 5,
                longestStreak: 10
            }
            jest.spyOn(checkInService, 'getCheckInStats').mockResolvedValue(stats)

            const req = createMockRequest({ userId: USER_ID }) as unknown as Request

            await checkInController.getCheckInStats(req, res)

            expect(checkInService.getCheckInStats).toHaveBeenCalledWith(USER_ID)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: stats })
            )
        })
    })

    // ==================== getProgressInsights ====================
    describe('getProgressInsights', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest() as unknown as Request

            await expect(
                checkInController.getProgressInsights(req, res)
            ).rejects.toThrow()
        })

        it('returns progress insights', async () => {
            const insight = { summary: 'Good progress', metrics: [] }
            jest.spyOn(progressInsightsService, 'generateProgressInsight').mockResolvedValue(insight)

            const req = createMockRequest({ userId: USER_ID }) as unknown as Request

            await checkInController.getProgressInsights(req, res)

            expect(progressInsightsService.generateProgressInsight).toHaveBeenCalledWith(USER_ID)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: insight })
            )
        })
    })
})
