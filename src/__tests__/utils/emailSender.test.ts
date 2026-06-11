// @ts-nocheck
// Unmock so we test the real implementation (jestSetup globally mocks it)
import nodemailer from 'nodemailer'

import type { sendEmail as SendEmailFn } from '../../utils/emailSender'
import logger from '../../utils/logger'

jest.unmock('../../utils/emailSender')

jest.mock('nodemailer', () => {
    const sendMail = jest.fn()
    return {
        __sendMail: sendMail,
        createTransport: jest.fn(() => ({ sendMail }))
    }
})

jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}))

let sendEmail: typeof SendEmailFn
let mockSendMail: jest.Mock

beforeAll(async () => {
    // isolateModules ensures the real emailSender loads with our nodemailer mock
    await jest.isolateModulesAsync(async () => {
        const mod = await import('../../utils/emailSender')
        sendEmail = mod.sendEmail
    })
    mockSendMail = (nodemailer as unknown as { __sendMail: jest.Mock }).__sendMail
})

beforeEach(() => {
    mockSendMail.mockReset()
    jest.clearAllMocks()
})

describe('emailSender', () => {
    describe('sendEmail', () => {
        it('sends email with correct mail options', async () => {
            mockSendMail.mockResolvedValue({ response: '250 OK' })

            await sendEmail('to@test.com', 'Subject', 'Text body')

            expect(mockSendMail).toHaveBeenCalledWith({
                from: expect.any(String),
                to: 'to@test.com',
                subject: 'Subject',
                text: 'Text body'
            })
        })

        it('includes html when provided', async () => {
            mockSendMail.mockResolvedValue({ response: '250 OK' })

            await sendEmail('to@test.com', 'Subject', 'Text', '<b>HTML</b>')

            const call = mockSendMail.mock.calls[0][0]
            expect(call.html).toBe('<b>HTML</b>')
        })

        it('omits html key when not provided', async () => {
            mockSendMail.mockResolvedValue({ response: '250 OK' })

            await sendEmail('to@test.com', 'Subject', 'Text')

            const call = mockSendMail.mock.calls[0][0]
            expect(call).not.toHaveProperty('html')
        })

        it('logs info with response on success', async () => {
            mockSendMail.mockResolvedValue({ response: '250 OK' })

            await sendEmail('to@test.com', 'Subject', 'Text')

            expect(logger.info).toHaveBeenCalledWith('Email sent: 250 OK')
        })

        it('throws wrapped error on SMTP failure', async () => {
            mockSendMail.mockRejectedValue(new Error('Connection refused'))

            await expect(
                sendEmail('to@test.com', 'Subject', 'Text')
            ).rejects.toThrow('Failed to send email. Please try again later.')
        })

        it('logs error details on SMTP failure', async () => {
            mockSendMail.mockRejectedValue(new Error('Authentication failed'))

            await expect(
                sendEmail('to@test.com', 'Subject', 'Text')
            ).rejects.toThrow()

            expect(logger.error).toHaveBeenCalledWith(
                'Failed to send email',
                expect.objectContaining({
                    to: 'to@test.com',
                    subject: 'Subject'
                })
            )
        })

        it('masks SMTP user in error log', async () => {
            mockSendMail.mockRejectedValue(new Error('Auth failed'))

            await expect(sendEmail('to@test.com', 'Sub', 'Text')).rejects.toThrow()

            const logCall = (logger.error as jest.Mock).mock.calls[0][1]
            expect(logCall.smtpUser).toMatch(/\*{4}/)
        })

        it('handles non-Error thrown value and logs it as string', async () => {
            mockSendMail.mockRejectedValue('raw string error')

            await expect(
                sendEmail('to@test.com', 'Sub', 'Text')
            ).rejects.toThrow('Failed to send email. Please try again later.')

            const logCall = (logger.error as jest.Mock).mock.calls[0][1]
            expect(typeof logCall.error).toBe('string')
        })

        it('preserves original error as cause', async () => {
            const original = new Error('SMTP timeout')
            mockSendMail.mockRejectedValue(original)

            let caught: (Error & { cause?: unknown }) | undefined
            try {
                await sendEmail('to@test.com', 'Sub', 'Text')
            } catch (e) {
                caught = e as Error & { cause?: unknown }
            }

            expect(caught?.cause).toBe(original)
        })
    })
})
