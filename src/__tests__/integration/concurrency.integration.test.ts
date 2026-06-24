// @ts-nocheck
import Csrf from 'csrf'
import supertest from 'supertest'

import { serverConfig } from '../../../config'
import App from '../../app'
import { createToken } from '../../lib/authCrypto'
import Prisma from '../../utils/prismaClient'

const SIGNUP_URL = `/api/${serverConfig.apiVersion}/auth/signup`
const CHECK_IN_URL = `/api/${serverConfig.apiVersion}/check-in`
const PROFILE_URL = `/api/${serverConfig.apiVersion}/profile`
const FORUM_POSTS_URL = `/api/${serverConfig.apiVersion}/forum/posts`

const csrfLib = new Csrf()

let userCounter = 0
const makeUser = () => {
    userCounter++
    return {
        firstName: 'Concurrent',
        lastName: 'Tester',
        email: `concurrent${userCounter}@test.com`,
        password: 'Password123!'
    }
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
    const user = makeUser()
    await supertest(App).post(SIGNUP_URL).send(user)
    const dbUser = await Prisma.user.findUnique({ where: { email: user.email } })
    const token = createToken(dbUser!)
    return { token, dbUser: dbUser!, email: user.email }
}

const validCheckIn = {
    moodScore: 7,
    painLevel: 3,
    activities: ['walking']
}

describe('Concurrency — Integration', () => {
    describe('POST /check-in — upsert race', () => {
        it('two simultaneous check-ins for same user/day produce exactly 1 DB record', async () => {
            const { token, dbUser } = await setupUser()
            const h1 = buildCsrfHeaders(token)
            const h2 = buildCsrfHeaders(token)

            const [r1, r2] = await Promise.all([
                supertest(App)
                    .post(CHECK_IN_URL)
                    .set('Cookie', h1.cookies)
                    .set('x-csrf-token', h1.csrfToken)
                    .send({ ...validCheckIn, moodScore: 6 }),
                supertest(App)
                    .post(CHECK_IN_URL)
                    .set('Cookie', h2.cookies)
                    .set('x-csrf-token', h2.csrfToken)
                    .send({ ...validCheckIn, moodScore: 8 })
            ])

            expect([201, 200]).toContain(r1.status)
            expect([201, 200]).toContain(r2.status)

            const profile = await Prisma.profile.findUnique({
                where: { userId: dbUser.id },
                include: { checkIns: true }
            })
            expect(profile!.checkIns).toHaveLength(1)
        })

        it('concurrent check-ins resolve to a single consistent moodScore', async () => {
            const { token, dbUser } = await setupUser()
            const h1 = buildCsrfHeaders(token)
            const h2 = buildCsrfHeaders(token)

            await Promise.all([
                supertest(App)
                    .post(CHECK_IN_URL)
                    .set('Cookie', h1.cookies)
                    .set('x-csrf-token', h1.csrfToken)
                    .send({ ...validCheckIn, moodScore: 3 }),
                supertest(App)
                    .post(CHECK_IN_URL)
                    .set('Cookie', h2.cookies)
                    .set('x-csrf-token', h2.csrfToken)
                    .send({ ...validCheckIn, moodScore: 9 })
            ])

            const profile = await Prisma.profile.findUnique({
                where: { userId: dbUser.id },
                include: { checkIns: true }
            })
            const checkIn = profile!.checkIns[0]
            expect([3, 9]).toContain(checkIn.moodScore)
        })
    })

    describe('PATCH /profile — concurrent updates', () => {
        it('two simultaneous profile updates leave DB in a consistent state', async () => {
            const { token, dbUser } = await setupUser()
            const h1 = buildCsrfHeaders(token)
            const h2 = buildCsrfHeaders(token)

            const [r1, r2] = await Promise.all([
                supertest(App)
                    .patch(PROFILE_URL)
                    .set('Cookie', h1.cookies)
                    .set('x-csrf-token', h1.csrfToken)
                    .send({ bio: 'First update bio' }),
                supertest(App)
                    .patch(PROFILE_URL)
                    .set('Cookie', h2.cookies)
                    .set('x-csrf-token', h2.csrfToken)
                    .send({ bio: 'Second update bio' })
            ])

            expect([200]).toContain(r1.status)
            expect([200]).toContain(r2.status)

            const profile = await Prisma.profile.findUnique({
                where: { userId: dbUser.id }
            })
            expect(['First update bio', 'Second update bio']).toContain(profile!.bio)
        })
    })

    describe('POST /forum/posts/:postId/like — concurrent toggle', () => {
        it('two simultaneous likes from same user produce at most 1 PostLike row', async () => {
            const { token, dbUser } = await setupUser()
            const hCreate = buildCsrfHeaders(token)

            const createRes = await supertest(App)
                .post(FORUM_POSTS_URL)
                .set('Cookie', hCreate.cookies)
                .set('x-csrf-token', hCreate.csrfToken)
                .send({ title: 'Race post', body: 'Content', category: 'General', tags: [] })

            expect(createRes.status).toBe(201)
            const postId = createRes.body.data.id

            const h1 = buildCsrfHeaders(token)
            const h2 = buildCsrfHeaders(token)
            const LIKE_URL = `${FORUM_POSTS_URL}/${postId}/like`

            await Promise.all([
                supertest(App)
                    .post(LIKE_URL)
                    .set('Cookie', h1.cookies)
                    .set('x-csrf-token', h1.csrfToken),
                supertest(App)
                    .post(LIKE_URL)
                    .set('Cookie', h2.cookies)
                    .set('x-csrf-token', h2.csrfToken)
            ])

            const profile = await Prisma.profile.findUnique({
                where: { userId: dbUser.id }
            })
            const likeCount = await Prisma.postLike.count({
                where: { profileId: profile!.id, postId }
            })
            expect(likeCount).toBeLessThanOrEqual(1)
        })

        it('sequential unlike from same user produces 0 PostLike rows', async () => {
            const { token, dbUser } = await setupUser()
            const hCreate = buildCsrfHeaders(token)

            const createRes = await supertest(App)
                .post(FORUM_POSTS_URL)
                .set('Cookie', hCreate.cookies)
                .set('x-csrf-token', hCreate.csrfToken)
                .send({ title: 'Toggle post', body: 'Content', category: 'General', tags: [] })

            const postId = createRes.body.data.id
            const LIKE_URL = `${FORUM_POSTS_URL}/${postId}/like`

            const h1 = buildCsrfHeaders(token)
            await supertest(App)
                .post(LIKE_URL)
                .set('Cookie', h1.cookies)
                .set('x-csrf-token', h1.csrfToken)

            const h2 = buildCsrfHeaders(token)
            await supertest(App)
                .post(LIKE_URL)
                .set('Cookie', h2.cookies)
                .set('x-csrf-token', h2.csrfToken)

            const profile = await Prisma.profile.findUnique({
                where: { userId: dbUser.id }
            })
            const likeCount = await Prisma.postLike.count({
                where: { profileId: profile!.id, postId }
            })
            expect(likeCount).toBe(0)
        })
    })
})
