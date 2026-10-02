import Csrf from 'csrf'
import supertest from 'supertest'

import { serverConfig } from '../../../config'
import App from '../../app'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { createToken } from '../../lib/authCrypto'
import Prisma from '../../utils/prismaClient'

const SIGNUP_URL = `/api/${serverConfig.apiVersion}/auth/signup`
const FORUM_URL = `/api/${serverConfig.apiVersion}/forum`
const POSTS_URL = `${FORUM_URL}/posts`

const csrfLib = new Csrf()

const testUser = {
    firstName: 'Forum',
    lastName: 'Tester',
    email: 'forum-test@test.com',
    password: 'Password123!'
}

const otherUser = {
    firstName: 'Other',
    lastName: 'Tester',
    email: 'forum-other@test.com',
    password: 'Password123!'
}

const validPost = {
    title: 'My first post',
    body: 'This is the body of my post',
    category: 'general'
}

const validReply = {
    body: 'This is a reply'
}

const buildCsrfHeaders = (token: string) => {
    const csrfSecret = csrfLib.secretSync()
    const csrfToken = csrfLib.create(csrfSecret)
    return {
        cookies: [`accessToken=${token}`, `_csrf=${csrfSecret}`],
        csrfToken
    }
}

const setupUser = async (user: typeof testUser = testUser) => {
    await supertest(App).post(SIGNUP_URL).send(user)
    const dbUser = await Prisma.user.findUnique({
        where: { email: user.email }
    })
    return { token: createToken(dbUser!), dbUser: dbUser! }
}

const createPost = async (token: string, body = validPost) => {
    const { cookies, csrfToken } = buildCsrfHeaders(token)
    return supertest(App)
        .post(POSTS_URL)
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send(body)
}

describe('Forum Routes — Integration', () => {
    describe('POST /forum/posts', () => {
        it('creates a post and returns 201', async () => {
            const { token } = await setupUser()

            const res = await createPost(token)

            expect(res.status).toBe(HttpStatusCodes.CREATED)
            expect(res.body.data.title).toBe(validPost.title)
            expect(res.body.data).toHaveProperty('id')
        })

        it('returns 401 without authentication', async () => {
            const res = await supertest(App)
                .post(POSTS_URL)
                .send(validPost)

            expect(res.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        })

        it('returns 400 for invalid body (missing title)', async () => {
            const { token } = await setupUser()
            const { cookies, csrfToken } = buildCsrfHeaders(token)

            const res = await supertest(App)
                .post(POSTS_URL)
                .set('Cookie', cookies)
                .set('x-csrf-token', csrfToken)
                .send({ ...validPost, title: undefined })

            expect(res.status).toBe(HttpStatusCodes.BAD_REQUEST)
        })
    })

    describe('GET /forum/posts', () => {
        it('returns 401 without a session', async () => {
            const res = await supertest(App).get(POSTS_URL)

            expect(res.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        })

        it('returns list of posts', async () => {
            const { token } = await setupUser()
            await createPost(token)

            const res = await supertest(App)
                .get(POSTS_URL)
                .set('Cookie', [`accessToken=${token}`])

            expect(res.status).toBe(HttpStatusCodes.OK)
            expect(Array.isArray(res.body.data.items)).toBe(true)
        })
    })

    describe('GET /forum/posts/:postId', () => {
        it('returns a single post', async () => {
            const { token } = await setupUser()
            const createRes = await createPost(token)
            const postId = createRes.body.data.id

            const res = await supertest(App)
                .get(`${POSTS_URL}/${postId}`)
                .set('Cookie', [`accessToken=${token}`])

            expect(res.status).toBe(HttpStatusCodes.OK)
            expect(res.body.data.id).toBe(postId)
        })

        it('returns 404 for missing post', async () => {
            const { token } = await setupUser()
            const res = await supertest(App)
                .get(`${POSTS_URL}/non-existent-id`)
                .set('Cookie', [`accessToken=${token}`])

            expect(res.status).toBe(HttpStatusCodes.NOT_FOUND)
        })
    })

    describe('PUT /forum/posts/:postId', () => {
        it('updates the post when owner', async () => {
            const { token } = await setupUser()
            const createRes = await createPost(token)
            const postId = createRes.body.data.id

            const { cookies, csrfToken } = buildCsrfHeaders(token)
            const res = await supertest(App)
                .put(`${POSTS_URL}/${postId}`)
                .set('Cookie', cookies)
                .set('x-csrf-token', csrfToken)
                .send({ title: 'Updated title' })

            expect(res.status).toBe(HttpStatusCodes.OK)
            expect(res.body.data.title).toBe('Updated title')
        })

        it('returns 401 when not the owner', async () => {
            const { token } = await setupUser()
            const createRes = await createPost(token)
            const postId = createRes.body.data.id

            const { token: otherToken } = await setupUser(otherUser)
            const { cookies, csrfToken } = buildCsrfHeaders(otherToken)

            const res = await supertest(App)
                .put(`${POSTS_URL}/${postId}`)
                .set('Cookie', cookies)
                .set('x-csrf-token', csrfToken)
                .send({ title: 'Hijacked title' })

            expect(res.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        })

        it('returns 401 without authentication', async () => {
            const { token } = await setupUser()
            const createRes = await createPost(token)
            const postId = createRes.body.data.id

            const res = await supertest(App)
                .put(`${POSTS_URL}/${postId}`)
                .send({ title: 'Updated title' })

            expect(res.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        })
    })

    describe('DELETE /forum/posts/:postId', () => {
        it('deletes the post when owner', async () => {
            const { token } = await setupUser()
            const createRes = await createPost(token)
            const postId = createRes.body.data.id

            const { cookies, csrfToken } = buildCsrfHeaders(token)
            const res = await supertest(App)
                .delete(`${POSTS_URL}/${postId}`)
                .set('Cookie', cookies)
                .set('x-csrf-token', csrfToken)

            expect(res.status).toBe(HttpStatusCodes.OK)

            const getRes = await supertest(App)
                .get(`${POSTS_URL}/${postId}`)
                .set('Cookie', [`accessToken=${token}`])
            expect(getRes.status).toBe(HttpStatusCodes.NOT_FOUND)
        })

        it('returns 401 when not the owner', async () => {
            const { token } = await setupUser()
            const createRes = await createPost(token)
            const postId = createRes.body.data.id

            const { token: otherToken } = await setupUser(otherUser)
            const { cookies, csrfToken } = buildCsrfHeaders(otherToken)

            const res = await supertest(App)
                .delete(`${POSTS_URL}/${postId}`)
                .set('Cookie', cookies)
                .set('x-csrf-token', csrfToken)

            expect(res.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        })
    })

    describe('POST /forum/posts/:postId/like', () => {
        it('toggles like on a post', async () => {
            const { token } = await setupUser()
            const createRes = await createPost(token)
            const postId = createRes.body.data.id

            const { cookies, csrfToken } = buildCsrfHeaders(token)
            const res = await supertest(App)
                .post(`${POSTS_URL}/${postId}/like`)
                .set('Cookie', cookies)
                .set('x-csrf-token', csrfToken)

            expect(res.status).toBe(HttpStatusCodes.OK)
            expect(res.body.data.liked).toBe(true)
        })

        it('returns 401 without authentication', async () => {
            const { token } = await setupUser()
            const createRes = await createPost(token)
            const postId = createRes.body.data.id

            const res = await supertest(App)
                .post(`${POSTS_URL}/${postId}/like`)

            expect(res.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        })
    })

    describe('replies of an account pending deletion', () => {
        it('are hidden from reply lists, counts and the post', async () => {
            const { token } = await setupUser()
            const { token: otherToken, dbUser: other } =
                await setupUser(otherUser)
            const postId = (await createPost(token)).body.data.id

            const { cookies, csrfToken } = buildCsrfHeaders(otherToken)
            await supertest(App)
                .post(`${POSTS_URL}/${postId}/replies`)
                .set('Cookie', cookies)
                .set('x-csrf-token', csrfToken)
                .send(validReply)
            await Prisma.user.update({
                where: { id: other.id },
                data: { active: false, deletedAt: new Date() }
            })

            const repliesRes = await supertest(App)
                .get(`${POSTS_URL}/${postId}/replies`)
                .set('Cookie', [`accessToken=${token}`])
            const postRes = await supertest(App)
                .get(`${POSTS_URL}/${postId}`)
                .set('Cookie', [`accessToken=${token}`])

            expect(repliesRes.body.data.items).toHaveLength(0)
            expect(repliesRes.body.data.pagination.total).toBe(0)
            expect(postRes.body.data._count.replies).toBe(0)
        })
    })

    describe('POST /forum/posts/:postId/replies', () => {
        it('creates a reply on a post', async () => {
            const { token } = await setupUser()
            const createRes = await createPost(token)
            const postId = createRes.body.data.id

            const { cookies, csrfToken } = buildCsrfHeaders(token)
            const res = await supertest(App)
                .post(`${POSTS_URL}/${postId}/replies`)
                .set('Cookie', cookies)
                .set('x-csrf-token', csrfToken)
                .send(validReply)

            expect(res.status).toBe(HttpStatusCodes.CREATED)
            expect(res.body.data.body).toBe(validReply.body)
        })

        it('returns 401 without authentication', async () => {
            const { token } = await setupUser()
            const createRes = await createPost(token)
            const postId = createRes.body.data.id

            const res = await supertest(App)
                .post(`${POSTS_URL}/${postId}/replies`)
                .send(validReply)

            expect(res.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        })
    })

    describe('post reply count', () => {
        const addReply = async (token: string, postId: string) => {
            const { cookies, csrfToken } = buildCsrfHeaders(token)
            return supertest(App)
                .post(`${POSTS_URL}/${postId}/replies`)
                .set('Cookie', cookies)
                .set('x-csrf-token', csrfToken)
                .send(validReply)
        }

        const storedCount = async (postId: string) =>
            (await Prisma.post.findUniqueOrThrow({ where: { id: postId } }))
                .replyCount

        it('follows reply creation and deletion', async () => {
            const { token } = await setupUser()
            const postId = (await createPost(token)).body.data.id

            await addReply(token, postId)
            const second = await addReply(token, postId)
            expect(await storedCount(postId)).toBe(2)

            const { cookies, csrfToken } = buildCsrfHeaders(token)
            const delRes = await supertest(App)
                .delete(`${POSTS_URL}/${postId}/replies/${second.body.data.id}`)
                .set('Cookie', cookies)
                .set('x-csrf-token', csrfToken)

            expect(delRes.status).toBe(HttpStatusCodes.OK)
            expect(await storedCount(postId)).toBe(1)
        })

        it('orders the hot filter by reply count', async () => {
            const { token } = await setupUser()
            const quietId = (await createPost(token)).body.data.id
            const busyId = (await createPost(token, {
                ...validPost,
                title: 'Busy post'
            })).body.data.id
            await addReply(token, quietId)
            await addReply(token, busyId)
            await addReply(token, busyId)

            const res = await supertest(App)
                .get(POSTS_URL)
                .query({ filter: 'hot' })
                .set('Cookie', [`accessToken=${token}`])

            expect(res.status).toBe(HttpStatusCodes.OK)
            const ids = res.body.data.items.map((p: { id: string }) => p.id)
            expect(ids.indexOf(busyId)).toBeLessThan(ids.indexOf(quietId))
        })
    })

    describe('per-post anonymity', () => {
        const getPost = (token: string, postId: string) =>
            supertest(App)
                .get(`${POSTS_URL}/${postId}`)
                .set('Cookie', [`accessToken=${token}`])

        const rememberedChoice = async (userId: string) =>
            (await Prisma.profile.findUniqueOrThrow({ where: { userId } }))
                .anonymousParticipation

        it('shows the real author on a named post and an alias on an anonymous one', async () => {
            const { token, dbUser } = await setupUser()

            const named = await createPost(token, {
                ...validPost,
                isAnonymous: false
            } as typeof validPost)
            const anon = await createPost(token, {
                ...validPost,
                isAnonymous: true
            } as typeof validPost)

            const namedAuthor = (await getPost(token, named.body.data.id))
                .body.data.author.user
            const anonAuthor = (await getPost(token, anon.body.data.id))
                .body.data.author.user
            expect(namedAuthor.username).toBe(dbUser.username)
            expect(anonAuthor.username).toMatch(/^anonymous-/)
            expect(anonAuthor.firstName).toBe('Anonymous')
        })

        it('defaults to the last choice and remembers each new one', async () => {
            const { token, dbUser } = await setupUser()
            expect(await rememberedChoice(dbUser.id)).toBe(true)

            await createPost(token, {
                ...validPost,
                isAnonymous: false
            } as typeof validPost)
            expect(await rememberedChoice(dbUser.id)).toBe(false)

            const inherited = await createPost(token)
            expect(inherited.body.data.isAnonymous).toBe(false)
        })

        it('applies the choice to replies and keeps it per reply', async () => {
            const { token, dbUser } = await setupUser()
            const postId = (await createPost(token)).body.data.id
            const reply = async (isAnonymous: boolean) => {
                const { cookies, csrfToken } = buildCsrfHeaders(token)
                return supertest(App)
                    .post(`${POSTS_URL}/${postId}/replies`)
                    .set('Cookie', cookies)
                    .set('x-csrf-token', csrfToken)
                    .send({ ...validReply, isAnonymous })
            }

            await reply(false)
            await reply(true)

            const res = await supertest(App)
                .get(`${POSTS_URL}/${postId}/replies`)
                .set('Cookie', [`accessToken=${token}`])
            const usernames = res.body.data.items.map(
                (r: { author: { user: { username: string } } }) =>
                    r.author.user.username
            )
            expect(usernames).toContain(dbUser.username)
            expect(usernames.some((u: string) => u.startsWith('anonymous-')))
                .toBe(true)
        })

        it('finds a post by author username only when that post is not anonymous', async () => {
            const { token, dbUser } = await setupUser()
            const named = await createPost(token, {
                ...validPost,
                title: 'Named one',
                isAnonymous: false
            } as typeof validPost)
            const anon = await createPost(token, {
                ...validPost,
                title: 'Hidden one',
                isAnonymous: true
            } as typeof validPost)

            const res = await supertest(App)
                .get(POSTS_URL)
                .query({ search: dbUser.username })
                .set('Cookie', [`accessToken=${token}`])

            const ids = res.body.data.items.map((p: { id: string }) => p.id)
            expect(ids).toContain(named.body.data.id)
            expect(ids).not.toContain(anon.body.data.id)
        })
    })
})
