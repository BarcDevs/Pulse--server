// @ts-nocheck
import type { Request, Response } from 'express'

import * as profileController from '../../controllers/profileController'
import * as profileService from '../../services/profileService'
import {
    createMockRequest,
    createMockResponse
} from '../setup/testSetup'

jest.mock('../../services/profileService')

const USER_ID = 'user-id-123'

const mockProfile = () => ({
    id: 'profile-id',
    userId: USER_ID,
    bio: 'Hello',
    location: 'Tel Aviv',
    image: null,
    timezone: 'UTC',
    healthInterests: [],
    activityPreferences: []
})

describe('ProfileController', () => {
    let res: Response

    beforeEach(() => {
        jest.clearAllMocks()
        res = createMockResponse() as unknown as Response
    })

    // ==================== service error propagation ====================
    describe('service error propagation', () => {
        it('getProfile propagates service error', async () => {
            jest.spyOn(profileService, 'getProfile').mockRejectedValue(new Error('DB error'))
            const req = createMockRequest({ userId: USER_ID }) as unknown as Request
            await expect(profileController.getProfile(req, res)).rejects.toThrow('DB error')
        })

        it('updateProfile propagates service error', async () => {
            jest.spyOn(profileService, 'updateProfile').mockRejectedValue(new Error('not found'))
            const req = createMockRequest({
                userId: USER_ID,
                body: { bio: 'New bio' }
            }) as unknown as Request
            await expect(profileController.updateProfile(req, res)).rejects.toThrow('not found')
        })

        it('getHealthInterests propagates service error', async () => {
            jest.spyOn(profileService, 'getAvailableHealthInterests').mockRejectedValue(new Error('DB error'))
            const req = createMockRequest() as unknown as Request
            await expect(profileController.getHealthInterests(req, res)).rejects.toThrow('DB error')
        })
    })

    // ==================== getProfile ====================
    describe('getProfile', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest() as unknown as Request

            await expect(
                profileController.getProfile(req, res)
            ).rejects.toThrow()
        })

        it('passes includePosts=false by default', async () => {
            const profile = mockProfile()
            jest.spyOn(profileService, 'getProfile').mockResolvedValue(profile)

            const req = createMockRequest({ userId: USER_ID }) as unknown as Request

            await profileController.getProfile(req, res)

            expect(profileService.getProfile).toHaveBeenCalledWith(USER_ID, false)
        })

        it('passes includePosts=true when query param set', async () => {
            const profile = mockProfile()
            jest.spyOn(profileService, 'getProfile').mockResolvedValue(profile)

            const req = createMockRequest({
                userId: USER_ID,
                query: { includePosts: 'true' }
            }) as unknown as Request

            await profileController.getProfile(req, res)

            expect(profileService.getProfile).toHaveBeenCalledWith(USER_ID, true)
        })

        it('returns profile in response', async () => {
            const profile = mockProfile()
            jest.spyOn(profileService, 'getProfile').mockResolvedValue(profile)

            const req = createMockRequest({ userId: USER_ID }) as unknown as Request

            await profileController.getProfile(req, res)

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: profile })
            )
        })
    })

    // ==================== updateProfile ====================
    describe('updateProfile', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest({
                body: { bio: 'New bio' }
            }) as unknown as Request

            await expect(
                profileController.updateProfile(req, res)
            ).rejects.toThrow()
        })

        it('calls service with userId and validated data', async () => {
            const updated = mockProfile()
            jest.spyOn(profileService, 'updateProfile').mockResolvedValue(updated)

            const req = createMockRequest({
                userId: USER_ID,
                body: { bio: 'New bio' }
            }) as unknown as Request

            await profileController.updateProfile(req, res)

            expect(profileService.updateProfile).toHaveBeenCalledWith(
                USER_ID,
                expect.objectContaining({ bio: 'New bio' })
            )
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: updated })
            )
        })
    })

    // ==================== getHealthInterests ====================
    describe('getHealthInterests', () => {
        it('returns available health interests', async () => {
            const interests = [
                { id: 'i1', slug: 'sleep', name: 'Sleep' },
                { id: 'i2', slug: 'nutrition', name: 'Nutrition' }
            ]
            jest.spyOn(profileService, 'getAvailableHealthInterests').mockResolvedValue(interests)

            const req = createMockRequest() as unknown as Request

            await profileController.getHealthInterests(req, res)

            expect(profileService.getAvailableHealthInterests).toHaveBeenCalled()
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: interests })
            )
        })
    })

    // ==================== getActivityPreferences ====================
    describe('getActivityPreferences', () => {
        it('returns available activity preferences', () => {
            const activities = [
                { id: 'a1', slug: 'walking', name: 'Walking' }
            ]
            jest.spyOn(profileService, 'getAvailableActivityPreferences').mockReturnValue(activities)

            const req = createMockRequest() as unknown as Request

            profileController.getActivityPreferences(req, res)

            expect(profileService.getAvailableActivityPreferences).toHaveBeenCalled()
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: activities })
            )
        })
    })
})
