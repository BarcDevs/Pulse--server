// @ts-nocheck
import type { Request, Response } from 'express'

import * as recommendationsController from '../../controllers/recommendationsController'
import * as recommendationsService from '../../services/recommendationsService'
import {
    createMockRequest,
    createMockResponse
} from '../setup/testSetup'

jest.mock('../../services/recommendationsService', () => ({
    getRecommendations: jest.fn()
}))

jest.mock('../../errors/factory/ErrorFactory', () => ({
    errorFactory: {
        auth: {
            unauthorized: jest.fn(() => new Error('Unauthorized'))
        }
    }
}))

const mockRecommendations = {
    items: [{ postId: 'post-1', score: 0.9, reason: 'tag match' }],
    generatedAt: new Date('2026-01-01'),
    basedOnCheckInId: 'checkin-1'
}

describe('recommendationsController', () => {
    describe('getRecommendations', () => {
        it('returns recommendations for authenticated user', async () => {
            ;(recommendationsService.getRecommendations as jest.Mock)
                .mockResolvedValue(mockRecommendations)

            const req = createMockRequest({ userId: 'user-1' }) as Request
            const res = createMockResponse() as Response

            await recommendationsController.getRecommendations(req, res)

            expect(recommendationsService.getRecommendations).toHaveBeenCalledWith('user-1')
            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Recommendations retrieved'
                })
            )
        })

        it('throws unauthorized when userId missing', async () => {
            const req = createMockRequest({ userId: undefined }) as Request
            const res = createMockResponse() as Response

            await expect(
                recommendationsController.getRecommendations(req, res)
            ).rejects.toThrow('Unauthorized')

            expect(recommendationsService.getRecommendations).not.toHaveBeenCalled()
        })

        it('propagates service error', async () => {
            ;(recommendationsService.getRecommendations as jest.Mock)
                .mockRejectedValue(new Error('service down'))

            const req = createMockRequest({ userId: 'user-1' }) as Request
            const res = createMockResponse() as Response

            await expect(
                recommendationsController.getRecommendations(req, res)
            ).rejects.toThrow('service down')
        })

        it('returns empty items when no recommendations available', async () => {
            ;(recommendationsService.getRecommendations as jest.Mock)
                .mockResolvedValue({ items: [], generatedAt: null, basedOnCheckInId: null })

            const req = createMockRequest({ userId: 'user-1' }) as Request
            const res = createMockResponse() as Response

            await recommendationsController.getRecommendations(req, res)

            expect(res.status).toHaveBeenCalledWith(200)
        })
    })
})
