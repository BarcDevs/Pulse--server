import type { Request, Response } from 'express'

import { HttpStatusCodes } from '../../constants/httpStatusCodes'
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
const DELETE_OTP = 123456

const mockUserWithDeleteCode = () => createMockUser({
    id: USER_ID,
    deleteAccountOTP: DELETE_OTP,
    deleteAccountExpiration: new Date(Date.now() + 10 * 60000)
})

describe('UserController', () => {
    let res: Response

    beforeEach(() => {
        jest.clearAllMocks()
        res = createMockResponse() as unknown as Response
        jest.spyOn(authHelpers, 'sanitizeUserData').mockImplementation(u => u)
    })

    // ==================== service error propagation ====================
    describe('service error propagation', () => {
        it('updateUser propagates service error', async () => {
            jest.spyOn(authHelpers, 'updateUserData').mockRejectedValue(new Error('DB error'))
            const req = createMockRequest({
                userId: USER_ID,
                body: { firstName: 'Jane' }
            }) as unknown as Request
            await expect(userController.updateUser(req, res)).rejects.toThrow('DB error')
        })

        it('updatePassword propagates service error', async () => {
            jest.spyOn(authHelpers, 'updateUserPassword').mockRejectedValue(new Error('wrong password'))
            const req = createMockRequest({
                userId: USER_ID,
                body: { currentPassword: 'Password123!', newPassword: 'NewPassword123!' }
            }) as unknown as Request
            await expect(userController.updatePassword(req, res)).rejects.toThrow('wrong password')
        })

        it('deleteUser propagates service error', async () => {
            jest.spyOn(authService, 'getUser').mockResolvedValue(mockUserWithDeleteCode())
            jest.spyOn(authService, 'deactivateUser').mockRejectedValue(new Error('DB error'))
            const req = createMockRequest({
                userId: USER_ID,
                body: { OTP: DELETE_OTP }
            }) as unknown as Request
            await expect(userController.deleteUser(req, res)).rejects.toThrow('DB error')
        })
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

        it('calls deactivateUser, clears cookies, returns 200 for the right code', async () => {
            jest.spyOn(authService, 'getUser').mockResolvedValue(mockUserWithDeleteCode())
            jest.spyOn(authService, 'deactivateUser').mockResolvedValue(undefined)

            const req = createMockRequest({
                userId: USER_ID,
                body: { OTP: DELETE_OTP }
            }) as unknown as Request

            await userController.deleteUser(req, res)

            expect(authService.deactivateUser).toHaveBeenCalledWith(USER_ID)
            expect(res.clearCookie).toHaveBeenCalledWith('accessToken')
            expect(res.clearCookie).toHaveBeenCalledWith('_csrf')
            expect(res.status).toHaveBeenCalledWith(HttpStatusCodes.OK)
        })

        it('does not deactivate on a wrong code', async () => {
            jest.spyOn(authService, 'getUser').mockResolvedValue(mockUserWithDeleteCode())

            const req = createMockRequest({
                userId: USER_ID,
                body: { OTP: 999999 }
            }) as unknown as Request

            await expect(
                userController.deleteUser(req, res)
            ).rejects.toThrow()
            expect(authService.deactivateUser).not.toHaveBeenCalled()
        })

        it('does not deactivate when no code was requested', async () => {
            jest.spyOn(authService, 'getUser').mockResolvedValue(createMockUser({ id: USER_ID }))

            const req = createMockRequest({
                userId: USER_ID,
                body: { OTP: DELETE_OTP }
            }) as unknown as Request

            await expect(
                userController.deleteUser(req, res)
            ).rejects.toThrow()
            expect(authService.deactivateUser).not.toHaveBeenCalled()
        })
    })
})