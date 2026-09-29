import supertest from 'supertest'

import { serverConfig } from '../../../config'
import App from '../../app'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { createToken } from '../../lib/authCrypto'
import Prisma from '../../utils/prismaClient'
import { generateCsrfTokenPair } from '../setup/testSetup'

const SIGNUP_URL = `/api/${serverConfig.apiVersion}/auth/signup`
const LOGIN_URL = `/api/${serverConfig.apiVersion}/auth/login`
const ME_URL = `/api/${serverConfig.apiVersion}/auth/me`
const LOGOUT_URL = `/api/${serverConfig.apiVersion}/auth/logout`

const testUser = {
    firstName: 'Integration',
    lastName: 'Tester',
    email: 'integration@test.com',
    password: 'Password123!'
}

const signup = () =>
    supertest(App).post(SIGNUP_URL).send(testUser)

describe('Auth Routes — Integration', () => {
    describe('POST /auth/signup', () => {
        it('creates user and profile in DB, returns 201', async () => {
            const res = await signup()

            expect(res.status).toBe(HttpStatusCodes.CREATED)
            expect(res.body.data.user.email).toBe(testUser.email)
            expect(res.body.data.user).not.toHaveProperty('password')

            const dbUser = await Prisma.user.findUnique({
                where: { email: testUser.email },
                include: { profile: true }
            })
            expect(dbUser).not.toBeNull()
            expect(dbUser!.profile).not.toBeNull()
            expect(dbUser!.firstName).toBe(testUser.firstName)
        })

        it('returns 409 on duplicate email', async () => {
            await signup()
            const res = await signup()

            expect(res.status).toBe(HttpStatusCodes.CONFLICT)
            expect(res.body.error[0].error).toBe('User already exists!')
        })

        it('returns 400 for missing required fields', async () => {
            const res = await supertest(App)
                .post(SIGNUP_URL)
                .send({ email: testUser.email, password: testUser.password })

            expect(res.status).toBe(HttpStatusCodes.BAD_REQUEST)
            expect(res.body.error[0].statusType).toBe('Validation Error')
        })
    })

    describe('POST /auth/login', () => {
        beforeEach(async () => {
            await signup()
        })

        it('returns 200 and JWT cookie for valid credentials', async () => {
            const res = await supertest(App)
                .post(LOGIN_URL)
                .send({
                    email: testUser.email,
                    password: testUser.password
                })

            expect(res.status).toBe(HttpStatusCodes.OK)
            expect(res.body.data).not.toHaveProperty('token')
            expect(res.body.data).toHaveProperty('_csrf')
            const cookies = ([] as string[]).concat(res.headers['set-cookie'] || []).join('; ')
            expect(cookies).toContain('accessToken')
        })

        it('returns 401 for wrong password', async () => {
            const res = await supertest(App)
                .post(LOGIN_URL)
                .send({
                    email: testUser.email,
                    password: 'WrongPassword123!'
                })

            expect(res.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        })

        it('returns 401 for non-existent email', async () => {
            const res = await supertest(App)
                .post(LOGIN_URL)
                .send({
                    email: 'nobody@test.com',
                    password: testUser.password
                })

            expect(res.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        })
    })

    describe('GET /auth/me', () => {
        it('returns user data for valid JWT', async () => {
            await signup()
            const dbUser = await Prisma.user.findUnique({
                where: { email: testUser.email }
            })
            const token = createToken(dbUser!)

            const res = await supertest(App)
                .get(ME_URL)
                .set('Cookie', [`accessToken=${token}`])

            expect(res.status).toBe(HttpStatusCodes.OK)
            expect(res.body.data.user.email).toBe(testUser.email)
            expect(res.body.data.user).not.toHaveProperty('password')
        })

        it('returns 401 with no token', async () => {
            const res = await supertest(App).get(ME_URL)
            expect(res.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        })

        it('returns 401 for a token issued before a password change', async () => {
            await signup()
            const dbUser = await Prisma.user.findUnique({
                where: { email: testUser.email }
            })
            const token = createToken(dbUser!)
            await Prisma.user.update({
                where: { id: dbUser!.id },
                data: { passwordUpdatedAt: new Date(Date.now() + 5000) }
            })

            const res = await supertest(App)
                .get(ME_URL)
                .set('Cookie', [`accessToken=${token}`])

            expect(res.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        })

        it('returns 401 for a token of a deactivated user', async () => {
            await signup()
            const dbUser = await Prisma.user.findUnique({
                where: { email: testUser.email }
            })
            const token = createToken(dbUser!)
            await Prisma.user.update({
                where: { id: dbUser!.id },
                data: { active: false }
            })

            const res = await supertest(App)
                .get(ME_URL)
                .set('Cookie', [`accessToken=${token}`])

            expect(res.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        })
    })

    describe('POST /auth/logout', () => {
        it('clears auth cookies and returns 200', async () => {
            const { csrfSecret, csrfToken } = generateCsrfTokenPair()
            const res = await supertest(App)
                .post(LOGOUT_URL)
                .set('Cookie', [`_csrf=${csrfSecret}`])
                .set('x-csrf-token', csrfToken)

            expect(res.status).toBe(HttpStatusCodes.OK)
            const cookies = ([] as string[]).concat(res.headers['set-cookie'] || []).join('; ')
            expect(cookies).toContain('accessToken')
            expect(cookies).toContain('_csrf')
        })
    })
})
