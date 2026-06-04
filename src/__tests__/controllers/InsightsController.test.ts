// @ts-nocheck
import type { Request, Response } from 'express'

import * as insightsController from '../../controllers/insightsController'
import * as dailyObservationService from '../../services/dailyObservationService'
import {
    createMockRequest,
    createMockResponse
} from '../setup/testSetup'

jest.mock('../../services/dailyObservationService')

const USER_ID = 'user-id-123'

describe('InsightsController', () => {
    let res: Response

    beforeEach(() => {
        jest.clearAllMocks()
        res = createMockResponse() as unknown as Response
    })

    // ==================== getObservation ====================
    describe('getObservation', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest() as unknown as Request

            await expect(
                insightsController.getObservation(req, res)
            ).rejects.toThrow()
        })

        it('returns observation when available', async () => {
            const observation = {
                type: 'consistent_mood',
                title: 'Your Daily Observation',
                observation: 'You are consistent.',
                supportiveDescription: 'Keep it up!',
                icon: '🌟'
            }
            jest.spyOn(dailyObservationService, 'getTodayObservation')
                .mockResolvedValue(observation)

            const req = createMockRequest({ userId: USER_ID }) as unknown as Request

            await insightsController.getObservation(req, res)

            expect(dailyObservationService.getTodayObservation).toHaveBeenCalledWith(USER_ID)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: observation })
            )
        })

        it('returns null when no observation available', async () => {
            jest.spyOn(dailyObservationService, 'getTodayObservation').mockResolvedValue(null)

            const req = createMockRequest({ userId: USER_ID }) as unknown as Request

            await insightsController.getObservation(req, res)

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: null })
            )
        })
    })
})
