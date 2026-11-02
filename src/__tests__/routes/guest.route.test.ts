import supertest from 'supertest'

import { serverConfig } from '../../../config'
import { Prisma } from '../../../prisma/generated/prisma/client'
import App from '../../app'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { getSessionState } from '../../models/sessionModel'
import { sendEmail } from '../../utils/emailSender'
import { prismaMock } from '../setup/jestSetup'
import {
    createAuthenticatedRequest,
    createAuthToken,
    createMockUser,
    withCsrfAuth
} from '../setup/testSetup'

const base = `/api/${serverConfig.apiVersion}`
const guestEndpoint = `${base}/auth/guest`
const upgradeEndpoint = `${base}/auth/guest/upgrade`

const asGuestSession = (isGuest: boolean) =>
    jest.mocked(getSessionState).mockResolvedValue({
        active: true,
        isGuest,
        passwordUpdatedAt: new Date(0)
    })

const cookieNames = (response: supertest.Response) =>
    ((response.headers['set-cookie'] ?? []) as unknown as string[])
        .map((cookie) => cookie.split('=')[0])

describe('Guest routes', () => {
    const guest = createMockUser({
        isGuest: true,
        firstName: 'Guest',
        lastName: 'Guest'
    })

    beforeEach(() => {
        jest.clearAllMocks()
    })

    // ==================== POST /auth/guest ====================
    describe(`POST ${guestEndpoint}`, () => {
        it('creates a guest, sets both cookies and returns user + _csrf', async () => {
            prismaMock.user.create.mockResolvedValue(guest as never)
            prismaMock.user.findUnique.mockResolvedValue(guest as never)

            const response = await supertest(App).post(guestEndpoint)

            expect(response.status).toBe(HttpStatusCodes.CREATED)
            expect(response.body.data.user.isGuest).toBe(true)
            expect(response.body.data.user).not.toHaveProperty('password')
            expect(response.body.data).toHaveProperty('_csrf')
            expect(cookieNames(response))
                .toEqual(expect.arrayContaining(['accessToken', '_csrf']))
        })

        it('needs no CSRF token and no session', async () => {
            prismaMock.user.create.mockResolvedValue(guest as never)
            prismaMock.user.findUnique.mockResolvedValue(guest as never)

            const response = await supertest(App).post(guestEndpoint)

            expect(response.status).not.toBe(HttpStatusCodes.UNAUTHORIZED)
        })

        it('reuses the guest behind a valid cookie without a new row or a new token', async () => {
            asGuestSession(true)
            prismaMock.user.findUnique.mockResolvedValue(guest as never)

            const response = await supertest(App)
                .post(guestEndpoint)
                .set('Cookie', [`accessToken=${createAuthToken(guest)}`])

            expect(response.status).toBe(HttpStatusCodes.OK)
            expect(response.body.data.user.id).toBe(guest.id)
            expect(prismaMock.user.create).not.toHaveBeenCalled()
            expect(cookieNames(response)).toEqual(['_csrf'])
        })

        it('answers 409 and keeps the session when the cookie is a real account', async () => {
            asGuestSession(false)
            const realUser = createMockUser()

            const response = await supertest(App)
                .post(guestEndpoint)
                .set('Cookie', [`accessToken=${createAuthToken(realUser)}`])

            expect(response.status).toBe(HttpStatusCodes.CONFLICT)
            expect(prismaMock.user.create).not.toHaveBeenCalled()
            expect(cookieNames(response)).not.toContain('accessToken')
        })
    })

    // ==================== POST /auth/guest/upgrade ====================
    describe(`POST ${upgradeEndpoint}`, () => {
        const body = {
            email: 'new@test.com',
            password: 'Mango-Kite-Plum-7!'
        }

        const send = (payload: object, isGuest = true) => {
            asGuestSession(isGuest)
            const { token, csrfSecret, csrfToken } =
                createAuthenticatedRequest(guest)

            return withCsrfAuth(
                supertest(App).post(upgradeEndpoint),
                token,
                csrfSecret,
                csrfToken
            ).send(payload)
        }

        it('converts the guest, re-issues the cookies and sends no email', async () => {
            prismaMock.user.findFirst.mockResolvedValue(null as never)
            prismaMock.user.update.mockResolvedValue(
                createMockUser({
                    isGuest: false,
                    email: body.email
                }) as never
            )

            const response = await send(body)

            expect(response.status).toBe(HttpStatusCodes.OK)
            expect(response.body.data.user.isGuest).toBe(false)
            expect(response.body.data.user.email).toBe(body.email)
            expect(response.body.data).toHaveProperty('_csrf')
            expect(response.body.data).not.toHaveProperty('confirmEmailSent')
            expect(cookieNames(response))
                .toEqual(expect.arrayContaining(['accessToken', '_csrf']))
            expect(sendEmail).not.toHaveBeenCalled()
        })

        it('requires a CSRF token', async () => {
            asGuestSession(true)

            const response = await supertest(App)
                .post(upgradeEndpoint)
                .set('Cookie', [`accessToken=${createAuthToken(guest)}`])
                .send(body)

            expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
            expect(prismaMock.user.update).not.toHaveBeenCalled()
        })

        it('requires a session', async () => {
            const response = await supertest(App)
                .post(upgradeEndpoint)
                .send(body)

            expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        })

        it.each([
            ['a weak password', { ...body, password: 'abc' }],
            ['a missing email', { password: body.password }],
            ['a .invalid email', { ...body, email: 'x@guest.invalid' }]
        ])('answers 400 for %s', async (_name, payload) => {
            const response = await send(payload)

            expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
            expect(prismaMock.user.update).not.toHaveBeenCalled()
        })

        it('answers 409 when the email is already taken', async () => {
            prismaMock.user.findFirst
                .mockResolvedValue(createMockUser() as never)

            const response = await send(body)

            expect(response.status).toBe(HttpStatusCodes.CONFLICT)
            expect(prismaMock.user.update).not.toHaveBeenCalled()
        })

        it('answers 409 when a concurrent request takes the email first', async () => {
            prismaMock.user.findFirst.mockResolvedValue(null as never)
            prismaMock.user.update.mockRejectedValue(
                new Prisma.PrismaClientKnownRequestError('dup', {
                    code: 'P2002',
                    clientVersion: 'test',
                    meta: { target: ['email'] }
                })
            )

            const response = await send(body)

            expect(response.status).toBe(HttpStatusCodes.CONFLICT)
        })

        it('answers 403 for a real account', async () => {
            const response = await send(body, false)

            expect(response.status).toBe(HttpStatusCodes.FORBIDDEN)
            expect(prismaMock.user.update).not.toHaveBeenCalled()
        })
    })

    // ==================== what a guest may reach ====================
    describe('guest access to the rest of the API', () => {
        const asGuest = () => {
            asGuestSession(true)

            return [`accessToken=${createAuthToken(guest)}`]
        }

        it('lets a guest read /auth/me with isGuest set', async () => {
            const cookies = asGuest()
            prismaMock.user.findUnique.mockResolvedValue(guest as never)

            const response = await supertest(App)
                .get(`${base}/auth/me`)
                .set('Cookie', cookies)

            expect(response.status).toBe(HttpStatusCodes.OK)
            expect(response.body.data.user.isGuest).toBe(true)
        })

        it('lets a guest refresh the CSRF token', async () => {
            const cookies = asGuest()

            const response = await supertest(App)
                .get(`${base}/auth/refresh`)
                .set('Cookie', cookies)

            expect(response.status).toBe(HttpStatusCodes.OK)
            expect(response.body.data).toHaveProperty('_csrf')
        })

        it('lets a guest read check-ins and stats', async () => {
            const cookies = asGuest()
            prismaMock.profile.findUnique.mockResolvedValue({
                id: 'profile-id',
                userId: guest.id,
                timezone: 'UTC'
            } as never)
            prismaMock.dailyCheckIn.findMany.mockResolvedValue([])

            const list = await supertest(App)
                .get(`${base}/check-in`)
                .set('Cookie', cookies)
            const stats = await supertest(App)
                .get(`${base}/check-in/stats`)
                .set('Cookie', cookies)

            expect(list.status).toBe(HttpStatusCodes.OK)
            expect(stats.status).toBe(HttpStatusCodes.OK)
        })

        it.each([
            ['profile', 'get', '/profile'],
            ['forum posts', 'get', '/forum/posts'],
            ['recovery goals', 'get', '/recovery-goals'],
            ['support tickets', 'get', '/support/tickets']
        ])('answers 403 for %s', async (_name, _method, path) => {
            const cookies = asGuest()

            const response = await supertest(App)
                .get(`${base}${path}`)
                .set('Cookie', cookies)

            expect(response.status).toBe(HttpStatusCodes.FORBIDDEN)
            expect(response.body.message)
                .toContain('Create an account to use this feature')
        })

        it('refuses a new-day check-in once the guest has the maximum', async () => {
            asGuestSession(true)
            const { token, csrfSecret, csrfToken } =
                createAuthenticatedRequest(guest)
            prismaMock.profile.findUnique.mockResolvedValue({
                id: 'profile-id',
                userId: guest.id,
                timezone: 'UTC'
            } as never)
            prismaMock.dailyCheckIn.findUnique.mockResolvedValue(null)
            prismaMock.dailyCheckIn.count.mockResolvedValue(3)

            const response = await withCsrfAuth(
                supertest(App).post(`${base}/check-in`),
                token,
                csrfSecret,
                csrfToken
            ).send({
                moodScore: 6,
                painLevel: 3
            })

            expect(response.status).toBe(HttpStatusCodes.FORBIDDEN)
            expect(response.body.message)
                .toContain('Guest check-in limit reached')
            expect(prismaMock.dailyCheckIn.create).not.toHaveBeenCalled()
        })
    })
})
