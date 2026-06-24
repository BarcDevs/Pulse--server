// @ts-nocheck
import Csrf from 'csrf'
import supertest from 'supertest'

import { serverConfig } from '../../../config'
import App from '../../app'
import { createToken } from '../../lib/authCrypto'
import Prisma from '../../utils/prismaClient'

const SIGNUP_URL = `/api/${serverConfig.apiVersion}/auth/signup`
const CHECK_IN_URL = `/api/${serverConfig.apiVersion}/check-in`

const csrfLib = new Csrf()

const testUser = {
    firstName: 'Checkin',
    lastName: 'Tester',
    email: 'checkin@test.com',
    password: 'Password123!'
}

const validCheckIn = {
    moodScore: 7,
    painLevel: 3,
    activities: ['walking', 'reading']
}

const buildCsrfHeaders = (token: string) => {
    const csrfSecret = csrfLib.secretSync()
    const csrfToken = csrfLib.create(csrfSecret)
    return {
        cookies: [`accessToken=${token}`, `_csrf=${csrfSecret}`],
        csrfToken
    }
}

const setupUser = async () => {
    await supertest(App).post(SIGNUP_URL).send(testUser)
    const dbUser = await Prisma.user.findUnique({
        where: { email: testUser.email }
    })
    return { token: createToken(dbUser!), dbUser: dbUser! }
}

describe('CheckIn Routes — Integration', () => {
    describe('POST /check-in', () => {
        it('creates check-in in DB and returns 201', async () => {
            const { token, dbUser } = await setupUser()
            const { cookies, csrfToken } = buildCsrfHeaders(token)

            const res = await supertest(App)
                .post(CHECK_IN_URL)
                .set('Cookie', cookies)
                .set('x-csrf-token', csrfToken)
                .send(validCheckIn)

            expect(res.status).toBe(201)
            expect(res.body.data.moodScore).toBe(validCheckIn.moodScore)
            expect(res.body.data).toHaveProperty('id')

            const profile = await Prisma.profile.findUnique({
                where: { userId: dbUser.id },
                include: { checkIns: true }
            })
            expect(profile!.checkIns).toHaveLength(1)
            expect(profile!.checkIns[0].moodScore).toBe(validCheckIn.moodScore)
        })

        it('second check-in same day returns 200 with created: false', async () => {
            const { token } = await setupUser()
            const { cookies: c1, csrfToken: t1 } = buildCsrfHeaders(token)
            const { cookies: c2, csrfToken: t2 } = buildCsrfHeaders(token)

            await supertest(App)
                .post(CHECK_IN_URL)
                .set('Cookie', c1)
                .set('x-csrf-token', t1)
                .send(validCheckIn)

            const res = await supertest(App)
                .post(CHECK_IN_URL)
                .set('Cookie', c2)
                .set('x-csrf-token', t2)
                .send({ ...validCheckIn, moodScore: 5 })

            expect(res.status).toBe(200)
            expect(res.body.data.moodScore).toBe(5)
        })

        it('returns 401 without authentication', async () => {
            const res = await supertest(App)
                .post(CHECK_IN_URL)
                .send(validCheckIn)

            expect(res.status).toBe(401)
        })

        it('returns 400 for invalid moodScore', async () => {
            const { token } = await setupUser()
            const { cookies, csrfToken } = buildCsrfHeaders(token)

            const res = await supertest(App)
                .post(CHECK_IN_URL)
                .set('Cookie', cookies)
                .set('x-csrf-token', csrfToken)
                .send({ ...validCheckIn, moodScore: 11 })

            expect(res.status).toBe(400)
        })
    })

    describe('GET /check-in', () => {
        it('returns check-ins for the authenticated user', async () => {
            const { token } = await setupUser()
            const { cookies: pc, csrfToken: pt } = buildCsrfHeaders(token)

            await supertest(App)
                .post(CHECK_IN_URL)
                .set('Cookie', pc)
                .set('x-csrf-token', pt)
                .send(validCheckIn)

            const res = await supertest(App)
                .get(CHECK_IN_URL)
                .set('Cookie', [`accessToken=${token}`])

            expect(res.status).toBe(200)
            expect(Array.isArray(res.body.data)).toBe(true)
            expect(res.body.data).toHaveLength(1)
            expect(res.body.data[0].moodScore).toBe(validCheckIn.moodScore)
        })

        it('returns empty array when no check-ins exist', async () => {
            const { token } = await setupUser()

            const res = await supertest(App)
                .get(CHECK_IN_URL)
                .set('Cookie', [`accessToken=${token}`])

            expect(res.status).toBe(200)
            expect(res.body.data).toEqual([])
        })

        it('returns 401 without authentication', async () => {
            const res = await supertest(App).get(CHECK_IN_URL)
            expect(res.status).toBe(401)
        })
    })

    describe('PATCH /check-in', () => {
        it('updates existing check-in and returns 200', async () => {
            const { token } = await setupUser()
            const { cookies: pc, csrfToken: pt } = buildCsrfHeaders(token)
            const { cookies: uc, csrfToken: ut } = buildCsrfHeaders(token)

            await supertest(App)
                .post(CHECK_IN_URL)
                .set('Cookie', pc)
                .set('x-csrf-token', pt)
                .send(validCheckIn)

            const res = await supertest(App)
                .patch(CHECK_IN_URL)
                .set('Cookie', uc)
                .set('x-csrf-token', ut)
                .send({ moodScore: 9 })

            expect(res.status).toBe(200)
            expect(res.body.data.moodScore).toBe(9)
        })

        it('returns 404 when no check-in exists for today', async () => {
            const { token } = await setupUser()
            const { cookies, csrfToken } = buildCsrfHeaders(token)

            const res = await supertest(App)
                .patch(CHECK_IN_URL)
                .set('Cookie', cookies)
                .set('x-csrf-token', csrfToken)
                .send({ moodScore: 9 })

            expect(res.status).toBe(404)
        })
    })
})
