// @ts-nocheck
import type { Request, Response } from 'express'

import * as userController from '../../controllers/userController'
import * as authHelpers from '../../lib/authHelpers'
import * as authService from '../../services/authService'
import {
    createMockRequest,
    createMockResponse,
    createMockUser
} from '../setup/testSetup'

jest.mock('../../lib/authHelpers')
jest.mock('../../services/authService')

const USER_ID = 'user-id-123'

describe('UserController', () => {
    let res: Response

    beforeEach(() => {
        jest.clearAllMocks()
        res = createMockResponse() as unknown as Response
        jest.spyOn(authHelpers, 'sanitizeUserData').mockImplementation(u => u)
    })

    // ==================== updateUser ====================
    describe('updateUser', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest({
                body: { firstName: 'Jane' }
            }) as unknown as Request

            await expect(
                userController.updateUser(req, res)
            ).rejects.toThrow()
        })

        it('calls updateUserData and returns sanitized user', async () => {
            const updatedUser = createMockUser({ firstName: 'Jane' })
            jest.spyOn(authHelpers, 'updateUserData').mockResolvedValue(updatedUser)

            const req = createMockRequest({
                userId: USER_ID,
                body: { firstName: 'Jane' }
            }) as unknown as Request

            await userController.updateUser(req, res)

            expect(authHelpers.updateUserData).toHaveBeenCalledWith(
                USER_ID,
                expect.objectContaining({ firstName: 'Jane' })
            )
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ user: updatedUser })
                })
            )
        })
    })

    // ==================== updatePassword ====================
    describe('updatePassword', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest({
                body: { currentPassword: 'Old1!', newPassword: 'New1!' }
            }) as unknown as Request

            await expect(
                userController.updatePassword(req, res)
            ).rejects.toThrow()
        })

        it('calls updateUserPassword with correct passwords', async () => {
            const updatedUser = createMockUser()
            jest.spyOn(authHelpers, 'updateUserPassword').mockResolvedValue(updatedUser)

            const req = createMockRequest({
                userId: USER_ID,
                body: {
                    currentPassword: 'Password123!',
                    newPassword: 'NewPassword123!'
                }
            }) as unknown as Request

            await userController.updatePassword(req, res)

            expect(authHelpers.updateUserPassword).toHaveBeenCalledWith(
                USER_ID,
                'Password123!',
                'NewPassword123!'
            )
        })
    })

    // ==================== deleteUser ====================
    describe('deleteUser', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest() as unknown as Request

            await expect(
                userController.deleteUser(req, res)
            ).rejects.toThrow()
        })

        it('calls deactivateUser, clears cookies, returns 204', async () => {
            jest.spyOn(authService, 'deactivateUser').mockResolvedValue(undefined)

            const req = createMockRequest({ userId: USER_ID }) as unknown as Request

            await userController.deleteUser(req, res)

            expect(authService.deactivateUser).toHaveBeenCalledWith(USER_ID)
            expect(res.clearCookie).toHaveBeenCalledWith('accessToken')
            expect(res.clearCookie).toHaveBeenCalledWith('_csrf')
            expect(res.status).toHaveBeenCalledWith(204)
        })
    })
})
