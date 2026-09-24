import supertest from 'supertest'

import { emailConfig, serverConfig } from '../../../config'
import App from '../../app'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { supportRateLimiter } from '../../middlewares/rateLimiting'
import { sendEmail } from '../../utils/emailSender'
import { prismaMock } from '../setup/jestSetup'
import {
    createAuthToken,
    createMockUser,
    withBearerAuth
} from '../setup/testSetup'

const endpoint = `/api/${serverConfig.apiVersion}/support/contact`

const validBody = {
    topic: 'technical',
    message: 'The app will not load',
    email: 'visitor@test.com'
}

describe(`POST ${endpoint}`, () => {
    describe('validation', () => {
        it.each([
            ['missing topic', { message: 'hi', email: 'a@b.com' }],
            ['invalid topic', { ...validBody, topic: 'nope' }],
            ['missing message', { topic: 'other', email: 'a@b.com' }],
            ['blank message', { ...validBody, message: '   ' }],
            [
                'message over 2000 chars',
                { ...validBody, message: 'a'.repeat(2001) }
            ],
            ['invalid email', { ...validBody, email: 'not-an-email' }]
        ])('returns 400 for %s', async (_name, body) => {
            const response = await supertest(App)
                .post(endpoint)
                .send(body)

            expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
            expect(response.body.error[0].statusType)
                .toBe('Validation Error')
            expect(sendEmail).not.toHaveBeenCalled()
        })

        it('returns 400 when logged out and email is missing', async () => {
            const response = await supertest(App)
                .post(endpoint)
                .send({ topic: 'other', message: 'hello' })

            expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
            expect(response.body.error[0].property).toBe('email')
            expect(sendEmail).not.toHaveBeenCalled()
        })

        it('accepts a message of exactly 2000 chars', async () => {
            const response = await supertest(App)
                .post(endpoint)
                .send({ ...validBody, message: 'a'.repeat(2000) })

            expect(response.status).toBe(HttpStatusCodes.OK)
        })
    })

    describe('logged out', () => {
        it('sends the email with body email as reply-to', async () => {
            const response = await supertest(App)
                .post(endpoint)
                .send(validBody)

            expect(response.status).toBe(HttpStatusCodes.OK)
            expect(response.body.message).toBe('Support message sent')
            expect(sendEmail).toHaveBeenCalledWith(
                emailConfig.supportEmail,
                '[Pulse support] technical',
                expect.stringContaining('The app will not load'),
                undefined,
                'visitor@test.com'
            )

            const text = (sendEmail as jest.Mock).mock.calls[0][2]
            expect(text).toContain('Topic: technical')
            expect(text).toContain('From: visitor@test.com')
            expect(text).toContain('Signed in: no')
        })

        it('does not require a CSRF token', async () => {
            const response = await supertest(App)
                .post(endpoint)
                .send(validBody)

            expect(response.status).toBe(HttpStatusCodes.OK)
        })

        it('treats an invalid access token as logged out', async () => {
            const response = await withBearerAuth(
                supertest(App).post(endpoint),
                'garbage'
            ).send(validBody)

            expect(response.status).toBe(HttpStatusCodes.OK)
            expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
        })

        it('returns 500 when sendEmail throws', async () => {
            ;(sendEmail as jest.Mock)
                .mockRejectedValueOnce(new Error('smtp down'))

            const response = await supertest(App)
                .post(endpoint)
                .send(validBody)

            expect(response.status)
                .toBe(HttpStatusCodes.INTERNAL_SERVER_ERROR)
            expect(response.body.error[0].statusCode)
                .toBe(HttpStatusCodes.INTERNAL_SERVER_ERROR)
        })
    })

    describe('logged in', () => {
        it('uses the account email and ignores body email', async () => {
            const mockUser = createMockUser()
            prismaMock.user.findUnique
                .mockResolvedValue(mockUser as never)

            const response = await withBearerAuth(
                supertest(App).post(endpoint),
                createAuthToken(mockUser)
            ).send(validBody)

            expect(response.status).toBe(HttpStatusCodes.OK)
            expect(sendEmail).toHaveBeenCalledWith(
                emailConfig.supportEmail,
                '[Pulse support] technical',
                expect.any(String),
                undefined,
                mockUser.email
            )

            const text = (sendEmail as jest.Mock).mock.calls[0][2]
            expect(text).toContain(`From: ${mockUser.email}`)
            expect(text).toContain(`yes (user id: ${mockUser.id})`)
        })

        it('does not require email in the body', async () => {
            const mockUser = createMockUser()
            prismaMock.user.findUnique
                .mockResolvedValue(mockUser as never)

            const response = await withBearerAuth(
                supertest(App).post(endpoint),
                createAuthToken(mockUser)
            ).send({ topic: 'account', message: 'help' })

            expect(response.status).toBe(HttpStatusCodes.OK)
        })

        it('falls back to body email when the user no longer exists', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null)

            const response = await withBearerAuth(
                supertest(App).post(endpoint),
                createAuthToken(createMockUser())
            ).send(validBody)

            expect(response.status).toBe(HttpStatusCodes.OK)
            expect(sendEmail).toHaveBeenCalledWith(
                emailConfig.supportEmail,
                expect.any(String),
                expect.any(String),
                undefined,
                'visitor@test.com'
            )
        })
    })

    describe('rate limiting', () => {
        it('wires supportRateLimiter into the route', async () => {
            await supertest(App).post(endpoint).send(validBody)

            expect(supportRateLimiter).toHaveBeenCalled()
        })
    })
})
