import Csrf from 'csrf'
import jwt from 'jsonwebtoken'
import supertest from 'supertest'

import {
    authConfig,
    serverConfig
} from '../../../config'
import App from '../../app'
import { ACCOUNT_DELETION_GRACE_DAYS } from '../../constants/auth/authRules'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import {
    dayInMs,
    minuteInMs,
    secondInMs
} from '../../constants/time'
import { createToken } from '../../lib/authCrypto'
import { purgeExpiredAccounts } from '../../services/accountDeletionService'
import Prisma from '../../utils/prismaClient'

const SIGNUP_URL = `/api/${serverConfig.apiVersion}/auth/signup`
const LOGIN_URL = `/api/${serverConfig.apiVersion}/auth/login`
const ME_URL = `/api/${serverConfig.apiVersion}/auth/me`
const DELETE_URL = `/api/${serverConfig.apiVersion}/users/me`

const csrfLib = new Csrf()

const makeUser = (name: string) => ({
    firstName: 'Deletion',
    lastName: 'Tester',
    email: `${name}@test.com`,
    password: 'Password123!'
})

const setupUser = async (name: string) => {
    const user = makeUser(name)
    await supertest(App).post(SIGNUP_URL).send(user)
    const dbUser = await Prisma.user.findUnique({
        where: { email: user.email }
    })

    return { user, dbUser: dbUser!, token: createToken(dbUser!) }
}

const markDeleted = (id: string, daysAgo: number) =>
    Prisma.user.update({
        where: { id },
        data: {
            active: false,
            deletedAt: new Date(Date.now() - daysAgo * dayInMs)
        }
    })

describe('Account deletion — Integration', () => {
    it('DELETE /users/me deactivates and starts the countdown', async () => {
        const { dbUser, token } = await setupUser('countdown')
        const csrfSecret = csrfLib.secretSync()

        const res = await supertest(App)
            .delete(DELETE_URL)
            .set('Cookie', [`accessToken=${token}`, `_csrf=${csrfSecret}`])
            .set('x-csrf-token', csrfLib.create(csrfSecret))

        expect(res.status).toBe(HttpStatusCodes.OK)
        const after = await Prisma.user.findUnique({
            where: { id: dbUser.id }
        })
        expect(after!.active).toBe(false)
        expect(after!.deletedAt).toBeInstanceOf(Date)
    })

    it('logging back in cancels the deletion and keeps old tokens revoked', async () => {
        const { user, dbUser } = await setupUser('restore')
        await Prisma.user.update({
            where: { id: dbUser.id },
            data: { passwordUpdatedAt: new Date(Date.now() - 2 * minuteInMs) }
        })
        // A token from before the deletion, e.g. a stolen cookie
        const token = jwt.sign(
            {
                id: dbUser.id,
                iat: Math.floor((Date.now() - minuteInMs) / secondInMs)
            },
            authConfig.jwtSecret!
        )
        const beforeRes = await supertest(App)
            .get(ME_URL)
            .set('Cookie', [`accessToken=${token}`])
        expect(beforeRes.status).toBe(HttpStatusCodes.OK)
        await markDeleted(dbUser.id, 1)

        const loginRes = await supertest(App)
            .post(LOGIN_URL)
            .send({ email: user.email, password: user.password })

        expect(loginRes.status).toBe(HttpStatusCodes.OK)
        const after = await Prisma.user.findUnique({
            where: { id: dbUser.id }
        })
        expect(after!.active).toBe(true)
        expect(after!.deletedAt).toBeNull()

        const oldTokenRes = await supertest(App)
            .get(ME_URL)
            .set('Cookie', [`accessToken=${token}`])
        expect(oldTokenRes.status).toBe(HttpStatusCodes.UNAUTHORIZED)
    })

    it('signup with the email of a pending-deletion account is a conflict, not a 500', async () => {
        const { user, dbUser } = await setupUser('taken')
        await markDeleted(dbUser.id, 1)

        const res = await supertest(App)
            .post(SIGNUP_URL)
            .send({ ...user, username: 'someoneelse' })

        expect(res.status).toBe(HttpStatusCodes.CONFLICT)
    })

    it('purge hard-deletes only accounts past the grace period, with their data', async () => {
        const { dbUser: expired } = await setupUser('expired')
        const { dbUser: recent } = await setupUser('recent')
        const { dbUser: active } = await setupUser('active')
        await markDeleted(expired.id, ACCOUNT_DELETION_GRACE_DAYS + 1)
        await markDeleted(recent.id, ACCOUNT_DELETION_GRACE_DAYS - 1)

        const count = await purgeExpiredAccounts()

        expect(count).toBe(1)
        expect(await Prisma.user.findUnique({ where: { id: expired.id } }))
            .toBeNull()
        expect(await Prisma.profile.findUnique({ where: { userId: expired.id } }))
            .toBeNull()
        expect(await Prisma.user.findUnique({ where: { id: recent.id } }))
            .not.toBeNull()
        expect(await Prisma.user.findUnique({ where: { id: active.id } }))
            .not.toBeNull()
    })
})
