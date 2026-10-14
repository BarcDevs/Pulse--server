import Csrf from 'csrf'
import supertest from 'supertest'

import { serverConfig } from '../../../config'
import App from '../../app'
import { POST_VIEW_WINDOW_MS } from '../../constants/forum/postViews'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { dayInMs, hourInMs } from '../../constants/time'
import { createToken } from '../../lib/authCrypto'
import Prisma from '../../utils/prismaClient'

const SIGNUP_URL = `/api/${serverConfig.apiVersion}/auth/signup`
const FORUM_POSTS_URL = `/api/${serverConfig.apiVersion}/forum/posts`

const csrfLib = new Csrf()

let userCounter = 0
const setupUser = async () => {
    userCounter++
    const user = {
        firstName: 'Viewer',
        lastName: 'Tester',
        email: `postview${userCounter}@test.com`,
        password: 'Password123!'
    }
    await supertest(App).post(SIGNUP_URL).send(user)
    const dbUser = await Prisma.user.findUnique({
        where: { email: user.email }
    })
    const profile = await Prisma.profile.findUnique({
        where: { userId: dbUser!.id }
    })
    return {
        token: createToken(dbUser!),
        profileId: profile!.id
    }
}

const csrfHeaders = (token: string) => {
    const secret = csrfLib.secretSync()
    return {
        cookies: [`accessToken=${token}`, `_csrf=${secret}`],
        csrfToken: csrfLib.create(secret)
    }
}

const view = (token: string, postId: string) => {
    const h = csrfHeaders(token)
    return supertest(App)
        .post(`${FORUM_POSTS_URL}/${postId}/view`)
        .set('Cookie', h.cookies)
        .set('x-csrf-token', h.csrfToken)
}

const createPost = async (token: string) => {
    const h = csrfHeaders(token)
    const res = await supertest(App)
        .post(FORUM_POSTS_URL)
        .set('Cookie', h.cookies)
        .set('x-csrf-token', h.csrfToken)
        .send({
            title: 'View post',
            body: 'Content',
            category: 'General',
            tags: []
        })
    expect(res.status).toBe(HttpStatusCodes.CREATED)
    return res.body.data.id as string
}

const getViews = async (postId: string) =>
    (await Prisma.post.findUnique({ where: { id: postId } }))!.views

const ageView = (profileId: string, postId: string, ms: number) =>
    Prisma.postView.update({
        where: {
            profileId_postId: {
                profileId,
                postId
            }
        },
        data: { lastViewedAt: new Date(Date.now() - ms) }
    })

describe('POST /forum/posts/:postId/view - Integration', () => {
    it('counts the first view and ignores a repeat inside the window', async () => {
        const author = await setupUser()
        const viewer = await setupUser()
        const postId = await createPost(author.token)

        expect((await view(viewer.token, postId)).status).toBe(HttpStatusCodes.OK)
        expect((await view(viewer.token, postId)).status).toBe(HttpStatusCodes.OK)

        expect(await getViews(postId)).toBe(1)
    })

    it('does not count again 23 hours later, counts again 25 hours later', async () => {
        const author = await setupUser()
        const viewer = await setupUser()
        const postId = await createPost(author.token)
        await view(viewer.token, postId)

        await ageView(viewer.profileId, postId, 23 * hourInMs)
        await view(viewer.token, postId)
        expect(await getViews(postId)).toBe(1)

        await ageView(viewer.profileId, postId, 25 * hourInMs)
        await view(viewer.token, postId)
        expect(await getViews(postId)).toBe(2)
        expect(POST_VIEW_WINDOW_MS).toBe(dayInMs)
    })

    it('counts two different profiles separately', async () => {
        const author = await setupUser()
        const first = await setupUser()
        const second = await setupUser()
        const postId = await createPost(author.token)

        await view(first.token, postId)
        await view(second.token, postId)

        expect(await getViews(postId)).toBe(2)
    })

    it('does not count the author', async () => {
        const author = await setupUser()
        const postId = await createPost(author.token)

        await view(author.token, postId)

        expect(await getViews(postId)).toBe(0)
        expect(await Prisma.postView.count({ where: { postId } })).toBe(0)
    })

    it('counts once when the same profile sends simultaneous requests', async () => {
        const author = await setupUser()
        const viewer = await setupUser()
        const postId = await createPost(author.token)

        await Promise.all([
            view(viewer.token, postId),
            view(viewer.token, postId),
            view(viewer.token, postId)
        ])

        expect(await getViews(postId)).toBe(1)
    })

    it('returns 404 for a missing post', async () => {
        const viewer = await setupUser()

        const res = await view(viewer.token, 'missing-post-id')

        expect(res.status).toBe(HttpStatusCodes.NOT_FOUND)
    })
})
