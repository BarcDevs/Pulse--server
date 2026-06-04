// @ts-nocheck
import {
    generateOTP,
    removeEmailChangeOTP,
    removeResetPasswordOTP,
    sendConfirmEmailOTP,
    sendEmailChangeOTP,
    sendForgotPasswordOTP,
    verifyOTP
} from '../../lib/authOTP'
import * as authModel from '../../models/authModel'
import { sendEmail } from '../../utils/emailSender'
import { createMockUser } from '../setup/testSetup'

jest.mock('../../models/authModel')
jest.mock('../../utils/emailSender')
jest.mock('../../utils/emailTemplates', () => ({
    resetPasswordTemplate: jest.fn().mockReturnValue('<html/>'),
    confirmEmailTemplate: jest.fn().mockReturnValue('<html/>'),
    changeEmailTemplate: jest.fn().mockReturnValue('<html/>')
}))

const mockSetUserOTP = authModel.setUserOTP as jest.Mock
const mockSetEmailChangeOTP =
    authModel.setEmailChangeOTP as jest.Mock
const mockGetUserByEmail =
    authModel.getUserByEmail as jest.Mock
const mockSendEmail = sendEmail as jest.Mock

beforeEach(() => {
    jest.clearAllMocks()
    mockSetUserOTP.mockResolvedValue(undefined)
    mockSetEmailChangeOTP.mockResolvedValue(undefined)
    mockSendEmail.mockResolvedValue(undefined)
})

describe('authOTP', () => {
    // ==================== generateOTP ====================
    describe('generateOTP', () => {
        it('should return otp and expiration', () => {
            const result = generateOTP()

            expect(result).toHaveProperty('otp')
            expect(result).toHaveProperty('expiration')
        })

        it('should return 6-digit otp', () => {
            const { otp } = generateOTP()

            expect(otp).toBeGreaterThanOrEqual(100000)
            expect(otp).toBeLessThan(1000000)
        })

        it('should return future expiration', () => {
            const { expiration } = generateOTP()

            expect(expiration.getTime()).toBeGreaterThan(Date.now())
        })

        it('should generate different otps on each call', () => {
            const results = Array.from(
                { length: 10 },
                () => generateOTP().otp
            )
            const unique = new Set(results)

            expect(unique.size).toBeGreaterThan(1)
        })
    })

    // ==================== verifyOTP ====================
    describe('verifyOTP', () => {
        it(
            'should return true for matching otp and valid expiration',
            () => {
                const otp = 123456
                const expiration = new Date(
                    Date.now() + 60 * 60 * 1000
                )

                expect(verifyOTP(otp, expiration, otp)).toBe(true)
            }
        )

        it('should return false for wrong otp', () => {
            const expiration = new Date(
                Date.now() + 60 * 60 * 1000
            )

            expect(verifyOTP(123456, expiration, 654321)).toBe(false)
        })

        it('should return false for expired otp', () => {
            const otp = 123456
            const expiration = new Date(
                Date.now() - 60 * 60 * 1000
            )

            expect(verifyOTP(otp, expiration, otp)).toBe(false)
        })

        it('should coerce string input to number', () => {
            const otp = 123456
            const expiration = new Date(
                Date.now() + 60 * 60 * 1000
            )

            expect(
                verifyOTP(otp, expiration, '123456' as unknown as number)
            ).toBe(true)
        })
    })

    // ==================== removeResetPasswordOTP ====================
    describe('removeResetPasswordOTP', () => {
        it('should call setUserOTP with null values', async () => {
            await removeResetPasswordOTP('user-123')

            expect(mockSetUserOTP).toHaveBeenCalledWith(
                'user-123',
                {
                    resetPasswordOTP: null,
                    resetPasswordExpiration: null
                }
            )
        })
    })

    // ==================== removeEmailChangeOTP ====================
    describe('removeEmailChangeOTP', () => {
        it(
            'should call setEmailChangeOTP with null values',
            async () => {
                await removeEmailChangeOTP('user-123')

                expect(mockSetEmailChangeOTP).toHaveBeenCalledWith(
                    'user-123',
                    {
                        pendingEmail: null,
                        emailChangeOTP: null,
                        emailChangeExpiration: null
                    }
                )
            }
        )
    })

    // ==================== sendForgotPasswordOTP ====================
    describe('sendForgotPasswordOTP', () => {
        it('should return false when user not found', async () => {
            mockGetUserByEmail.mockResolvedValue(null)

            const result = await sendForgotPasswordOTP(
                'unknown@test.com'
            )

            expect(result).toBe(false)
            expect(mockSetUserOTP).not.toHaveBeenCalled()
            expect(mockSendEmail).not.toHaveBeenCalled()
        })

        it('should return otp number when user found', async () => {
            mockGetUserByEmail.mockResolvedValue(createMockUser())

            const result = await sendForgotPasswordOTP(
                'test@test.com'
            )

            expect(typeof result).toBe('number')
            expect(result as number).toBeGreaterThanOrEqual(100000)
            expect(result as number).toBeLessThan(1000000)
        })

        it(
            'should call setUserOTP with otp and expiration',
            async () => {
                mockGetUserByEmail.mockResolvedValue(createMockUser())

                const result = await sendForgotPasswordOTP(
                    'test@test.com'
                )

                expect(mockSetUserOTP).toHaveBeenCalledWith(
                    'test-user-id-123',
                    expect.objectContaining({
                        resetPasswordOTP: result,
                        resetPasswordExpiration: expect.any(Date)
                    })
                )
            }
        )

        it('should call sendEmail with the user email', async () => {
            mockGetUserByEmail.mockResolvedValue(createMockUser())

            await sendForgotPasswordOTP('test@test.com')

            expect(mockSendEmail).toHaveBeenCalledWith(
                'test@test.com',
                expect.any(String),
                expect.any(String),
                expect.any(String)
            )
        })

        it('propagates error when sendEmail throws', async () => {
            mockGetUserByEmail.mockResolvedValue(createMockUser())
            mockSendEmail.mockRejectedValue(new Error('SMTP failure'))

            await expect(
                sendForgotPasswordOTP('test@test.com')
            ).rejects.toThrow('SMTP failure')
        })

        it('propagates error when setUserOTP throws', async () => {
            mockGetUserByEmail.mockResolvedValue(createMockUser())
            mockSetUserOTP.mockRejectedValue(new Error('DB error'))

            await expect(
                sendForgotPasswordOTP('test@test.com')
            ).rejects.toThrow('DB error')
        })
    })

    // ==================== sendConfirmEmailOTP ====================
    describe('sendConfirmEmailOTP', () => {
        it('should return false when user not found', async () => {
            mockGetUserByEmail.mockResolvedValue(null)

            const result = await sendConfirmEmailOTP(
                'unknown@test.com'
            )

            expect(result).toBe(false)
            expect(mockSendEmail).not.toHaveBeenCalled()
        })

        it('should return otp number when user found', async () => {
            mockGetUserByEmail.mockResolvedValue(createMockUser())

            const result = await sendConfirmEmailOTP('test@test.com')

            expect(typeof result).toBe('number')
            expect(result as number).toBeGreaterThanOrEqual(100000)
        })

        it('should call sendEmail with the user email', async () => {
            mockGetUserByEmail.mockResolvedValue(createMockUser())

            await sendConfirmEmailOTP('test@test.com')

            expect(mockSendEmail).toHaveBeenCalledWith(
                'test@test.com',
                expect.any(String),
                expect.any(String),
                expect.any(String)
            )
        })

        it('propagates error when sendEmail throws', async () => {
            mockGetUserByEmail.mockResolvedValue(createMockUser())
            mockSendEmail.mockRejectedValue(new Error('SMTP failure'))

            await expect(
                sendConfirmEmailOTP('test@test.com')
            ).rejects.toThrow('SMTP failure')
        })
    })

    // ==================== sendEmailChangeOTP ====================
    describe('sendEmailChangeOTP', () => {
        it('should return otp number', async () => {
            const result = await sendEmailChangeOTP(
                'user-123',
                'new@test.com'
            )

            expect(typeof result).toBe('number')
            expect(result).toBeGreaterThanOrEqual(100000)
            expect(result).toBeLessThan(1000000)
        })

        it(
            'should call setEmailChangeOTP with pendingEmail and otp',
            async () => {
                const result = await sendEmailChangeOTP(
                    'user-123',
                    'new@test.com'
                )

                expect(mockSetEmailChangeOTP).toHaveBeenCalledWith(
                    'user-123',
                    expect.objectContaining({
                        pendingEmail: 'new@test.com',
                        emailChangeOTP: result,
                        emailChangeExpiration: expect.any(Date)
                    })
                )
            }
        )

        it('should call sendEmail with the new email', async () => {
            await sendEmailChangeOTP('user-123', 'new@test.com')

            expect(mockSendEmail).toHaveBeenCalledWith(
                'new@test.com',
                expect.any(String),
                expect.any(String),
                expect.any(String)
            )
        })

        it('should work without optional language param', async () => {
            await expect(
                sendEmailChangeOTP('user-123', 'new@test.com')
            ).resolves.not.toThrow()
        })

        it('propagates error when sendEmail throws', async () => {
            mockSendEmail.mockRejectedValue(new Error('SMTP failure'))

            await expect(
                sendEmailChangeOTP('user-123', 'new@test.com')
            ).rejects.toThrow('SMTP failure')
        })

        it('propagates error when setEmailChangeOTP throws', async () => {
            mockSetEmailChangeOTP.mockRejectedValue(new Error('DB error'))

            await expect(
                sendEmailChangeOTP('user-123', 'new@test.com')
            ).rejects.toThrow('DB error')
        })
    })
})