import supertest from 'supertest'

import { serverConfig } from '../../../config'
import { Prisma } from '../../../prisma/generated/prisma/client'
import App from '../../app'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { prismaMock } from '../setup/jestSetup'
import {
    createAuthenticatedRequest,
    createAuthToken,
    createMockPost,
    createMockReply,
    createMockTag,
    createMockUser,
    createRawMockTag,
    withCsrfAuth
} from '../setup/testSetup'

// Forum reads need a session: community is for signed-in users only
const readerCookie = [`accessToken=${createAuthToken(createMockUser())}`]

describe('Forum Routes', () => {
    // ==================== GET POSTS ====================
    describe(`GET /api/${serverConfig.apiVersion}/forum/posts`, () => {
        const postsEndpoint = `/api/${serverConfig.apiVersion}/forum/posts`

        it('should return 401 for unauthenticated request', async () => {
            const response = await supertest(App).get(postsEndpoint)

            expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        })

        it(
            'should return 200 and posts array',
            async () => {
                const mockPosts = [
                    createMockPost(),
                    createMockPost({
                        id: 'post-2'
                    })
                ]
                prismaMock.post.findMany
                    .mockResolvedValue(
                        mockPosts as never
                    )

                const response =
                    await supertest(App)
                        .get(postsEndpoint)
                        .set('Cookie', readerCookie)

                expect(response.status)
                    .toBe(HttpStatusCodes.OK)
                expect(response.body.data.items)
                    .toBeInstanceOf(Array)
                expect(response.body.message)
                    .toContain('posts found')
            }
        )

        it(
            'should return 200 with pagination',
            async () => {
                const mockPosts = [createMockPost()]
                prismaMock.post.findMany
                    .mockResolvedValue(mockPosts as never)

                const response = await supertest(App)
                    .get(postsEndpoint)
                    .set('Cookie', readerCookie)
                    .query({
                        limit: 5,
                        page: 1
                    })

                expect(response.status).toBe(HttpStatusCodes.OK)
            }
        )

        it(
            'should return 200 with tag filter',
            async () => {
                const mockPosts = [
                    createMockPost({
                        tags: [
                            createMockTag()
                        ]
                    })
                ]
                prismaMock.post.findMany
                    .mockResolvedValue(mockPosts as never)

                const response = await supertest(App)
                    .get(postsEndpoint)
                    .set('Cookie', readerCookie)
                    .query({ tag: 'test-tag' })

                expect(response.status).toBe(HttpStatusCodes.OK)
            }
        )

        it(
            'should return 200 with category filter',
            async () => {
                const mockPosts = [
                    createMockPost({ category: 'health' })
                ]
                prismaMock.post.findMany
                    .mockResolvedValue(mockPosts as never)

                const response = await supertest(App)
                    .get(postsEndpoint)
                    .set('Cookie', readerCookie)
                    .query({ category: 'health' })

                expect(response.status).toBe(HttpStatusCodes.OK)
            }
        )

        it(
            'should return 200 with search filter',
            async () => {
                const mockPosts = [
                    createMockPost({ title: 'Search Test' })
                ]
                prismaMock.post.findMany
                    .mockResolvedValue(mockPosts as never)

                const response = await supertest(App)
                    .get(postsEndpoint)
                    .set('Cookie', readerCookie)
                    .query({ search: 'Search' })

                expect(response.status).toBe(HttpStatusCodes.OK)
            }
        )

        it(
            'should return 200 with newest filter',
            async () => {
                const mockPosts = [createMockPost()]
                prismaMock.post.findMany
                    .mockResolvedValue(mockPosts as never)

                const response = await supertest(App)
                    .get(postsEndpoint)
                    .set('Cookie', readerCookie)
                    .query({ filter: 'newest' })

                expect(response.status).toBe(HttpStatusCodes.OK)
            }
        )

        it(
            'should return 200 with popular filter',
            async () => {
                const mockPosts = [
                    createMockPost({ views: 100 })
                ]
                prismaMock.post.findMany
                    .mockResolvedValue(mockPosts as never)

                const response = await supertest(App)
                    .get(postsEndpoint)
                    .set('Cookie', readerCookie)
                    .query({ filter: 'popular' })

                expect(response.status).toBe(HttpStatusCodes.OK)
            }
        )

        it(
            'should return 200 with hot filter',
            async () => {
                const mockPosts = [createMockPost()]
                prismaMock.post.findMany
                    .mockResolvedValue(mockPosts as never)

                const response = await supertest(App)
                    .get(postsEndpoint)
                    .set('Cookie', readerCookie)
                    .query({ filter: 'hot' })

                expect(response.status).toBe(HttpStatusCodes.OK)
            }
        )

        it(
            'should return 200 with unanswered filter',
            async () => {
                const mockPosts = [
                    createMockPost({
                        _count: { replies: 0, likes: 0 }
                    })
                ]
                prismaMock.post.findMany
                    .mockResolvedValue(mockPosts as never)

                const response = await supertest(App)
                    .get(postsEndpoint)
                    .set('Cookie', readerCookie)
                    .query({ filter: 'unanswered' })

                expect(response.status).toBe(HttpStatusCodes.OK)
            }
        )

        it(
            'should return 404 when no posts found',
            async () => {
                prismaMock.post.findMany
                    .mockResolvedValue(null as unknown as never[])

                const response = await supertest(App)
                    .get(postsEndpoint)
                    .set('Cookie', readerCookie)

                expect(response.status).toBe(HttpStatusCodes.NOT_FOUND)
                expect(response.body.error[0].statusType)
                    .toBe('Not Found')
            }
        )

        it(
            'should return 400 for invalid limit (over 100)',
            async () => {
                const response = await supertest(App)
                    .get(postsEndpoint)
                    .set('Cookie', readerCookie)
                    .query({ limit: 200 })

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
            }
        )
    })

    // ==================== CREATE POST ====================
    describe(`POST /api/${serverConfig.apiVersion}/forum/posts`, () => {
        const postsEndpoint = `/api/${serverConfig.apiVersion}/forum/posts`

        it(
            'should return 201 for valid post creation',
            async () => {
                const mockUser = createMockUser()
                const mockPost = createMockPost()
                const mockProfile = {
                    id: 'profile-id',
                    userId: mockUser.id
                }
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.profile.findUnique
                    .mockResolvedValue(mockProfile as never)
                prismaMock.tag.findMany
                    .mockResolvedValue([])
                prismaMock.post.create
                    .mockResolvedValue(mockPost as never)

                const response = await withCsrfAuth(
                    supertest(App).post(postsEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    title: 'New Post',
                    body: 'Post content',
                    category: 'general',
                    tags: [
                        'tag1',
                        'tag2'
                    ]
                })

                expect(response.status).toBe(HttpStatusCodes.CREATED)
                expect(response.body.message)
                    .toBe('Post created successfully')
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .post(postsEndpoint)
                    .send({
                        title: 'New Post',
                        body: 'Post content',
                        category: 'general',
                        tags: ['tag1']
                    })

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
            }
        )

        it(
            'should return 401 for missing CSRF token',
            async () => {
                const mockUser = createMockUser()
                const token = createAuthToken(mockUser)

                const response = await supertest(App)
                    .post(postsEndpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])
                    .send({
                        title: 'New Post',
                        body: 'Post content',
                        category: 'general',
                        tags: ['tag1']
                    })

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
            }
        )

        it(
            'should return 400 for missing title',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await withCsrfAuth(
                    supertest(App).post(postsEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    body: 'Post content',
                    category: 'general',
                    tags: ['tag1']
                })

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
                expect(response.body.error[0].property)
                    .toBe('title')
            }
        )

        it(
            'should return 400 for missing body',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await withCsrfAuth(
                    supertest(App).post(postsEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    title: 'New Post',
                    category: 'general',
                    tags: ['tag1']
                })

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
                expect(response.body.error[0].property)
                    .toBe('body')
            }
        )

        it(
            'should return 400 for missing category',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await withCsrfAuth(
                    supertest(App).post(postsEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    title: 'New Post',
                    body: 'Post content',
                    tags: ['tag1']
                })

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
                expect(response.body.error[0].property)
                    .toBe('category')
            }
        )

        it(
            'should accept missing tags',
            async () => {
                const mockUser = createMockUser()
                const mockPost = createMockPost()
                const mockProfile = {
                    id: 'profile-id',
                    userId: mockUser.id
                }
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.profile.findUnique
                    .mockResolvedValue(mockProfile as never)
                prismaMock.post.create
                    .mockResolvedValue(mockPost as never)

                const response = await withCsrfAuth(
                    supertest(App).post(postsEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    title: 'New Post',
                    body: 'Post content',
                    category: 'general'
                })

                expect(response.status).toBe(HttpStatusCodes.CREATED)
            }
        )
    })

    // ==================== GET SINGLE POST ====================
    describe(`GET /api/${serverConfig.apiVersion}/forum/posts/:postId`, () => {
        it('should return 200 and single post', async () => {
            const mockPost = createMockPost()
            prismaMock.post.findUnique
                .mockResolvedValue(mockPost as never)

            const response = await supertest(App)
                .get(`/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123`)
                .set('Cookie', readerCookie)

            expect(response.status).toBe(HttpStatusCodes.OK)
            expect(response.body.data.id)
                .toBe('test-post-id-123')
        })

        it(
            'should return 404 for non-existent post',
            async () => {
                prismaMock.post.findUnique
                    .mockResolvedValue(null as never)

                const response = await supertest(App)
                    .get(`/api/${serverConfig.apiVersion}/forum/posts/non-existent-id`)
                    .set('Cookie', readerCookie)

                expect(response.status).toBe(HttpStatusCodes.NOT_FOUND)
                expect(response.body.error[0].statusType)
                    .toBe('Not Found')
            }
        )

        it(
            'should return null author image in response without error',
            async () => {
                const mockPost = createMockPost({
                    author: {
                        id: 'test-user-id-123',
                        image: null,
                        user: {
                            id: 'test-user-id-123',
                            username: 'testuser',
                            firstName: 'Test',
                            lastName: 'User'
                        }
                    }
                })
                prismaMock.post.findUnique
                    .mockResolvedValue(mockPost as never)

                const response = await supertest(App)
                    .get(`/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123`)
                    .set('Cookie', readerCookie)

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.data.author.image).toBeNull()
            }
        )
    })

    // ==================== UPDATE POST ====================
    describe(`PUT /api/${serverConfig.apiVersion}/forum/posts/:postId`, () => {
        it(
            'should return 200 for valid update by owner',
            async () => {
                const mockUser = createMockUser()
                const mockProfile = {
                    id: 'test-profile-id-123',
                    userId: mockUser.id
                }
                const mockPost = createMockPost({
                    authorId: mockProfile.id
                })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.profile.findUnique
                    .mockResolvedValue(mockProfile as never)
                prismaMock.post.findUnique
                    .mockResolvedValue(mockPost as never)
                prismaMock.post.update.mockResolvedValue({
                    ...mockPost,
                    title: 'Updated Title'
                } as never)
                prismaMock.tag.findMany
                    .mockResolvedValue([])

                const response = await withCsrfAuth(
                    supertest(App).put(
                        `/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123`
                    ),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    title: 'Updated Title'
                })

                expect(response.status).toBe(HttpStatusCodes.OK)
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .put(`/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123`)
                    .send({
                        title: 'Updated Title'
                    })

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
            }
        )

        it('should return 401 for non-owner', async () => {
            const mockUser = createMockUser()
            const mockProfile = {
                id: 'test-profile-id-123',
                userId: mockUser.id
            }
            const mockPost = createMockPost({
                authorId: 'different-profile-id'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.profile.findUnique
                .mockResolvedValue(mockProfile as never)
            prismaMock.post.findUnique
                .mockResolvedValue(mockPost as never)

            const response = await supertest(App)
                .put(`/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123`)
                .set('Cookie', [
                    `accessToken=${token}`,
                    `_csrf=${csrfSecret}`
                ])
                .set('x-csrf-token', csrfToken)
                .send({
                    title: 'Updated Title'
                })

            expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        })

        it(
            'should return 404 for non-existent post',
            async () => {
                const mockUser = createMockUser()
                const mockProfile = {
                    id: 'test-profile-id-123',
                    userId: mockUser.id
                }
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.profile.findUnique
                    .mockResolvedValue(mockProfile as never)
                prismaMock.post.findUnique
                    .mockResolvedValue(null as never)

                const response = await withCsrfAuth(
                    supertest(App).put(
                        `/api/${serverConfig.apiVersion}/forum/posts/non-existent-id`
                    ),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    title: 'Updated Title'
                })

                expect(response.status).toBe(HttpStatusCodes.NOT_FOUND)
            }
        )
    })

    // ==================== DELETE POST ====================
    describe(`DELETE /api/${serverConfig.apiVersion}/forum/posts/:postId`, () => {
        it(
            'should return 200 for valid delete by owner',
            async () => {
                const mockUser = createMockUser()
                const mockProfile = {
                    id: 'test-profile-id-123',
                    userId: mockUser.id
                }
                const mockPost = createMockPost({
                    authorId: mockProfile.id
                })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.profile.findUnique
                    .mockResolvedValue(mockProfile as never)
                prismaMock.post.findUnique
                    .mockResolvedValue(mockPost as never)
                prismaMock.post.delete
                    .mockResolvedValue(mockPost as never)

                const response = await withCsrfAuth(
                    supertest(App).delete(
                        `/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123`
                    ),
                    token,
                    csrfSecret,
                    csrfToken
                )

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.message)
                    .toContain('deleted')
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .delete(
                        `/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123`
                    )

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
            }
        )

        it('should return 401 for non-owner', async () => {
            const mockUser = createMockUser()
            const mockProfile = {
                id: 'test-profile-id-123',
                userId: mockUser.id
            }
            const mockPost = createMockPost({
                authorId: 'different-profile-id'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.profile.findUnique
                .mockResolvedValue(mockProfile as never)
            prismaMock.post.findUnique
                .mockResolvedValue(mockPost as never)

            const response = await supertest(App)
                .delete(
                    `/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123`
                )
                .set('Cookie', [
                    `accessToken=${token}`,
                    `_csrf=${csrfSecret}`
                ])
                .set('x-csrf-token', csrfToken)

            expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        })
    })

    // ==================== GET REPLIES ====================
    describe(`GET /api/${serverConfig.apiVersion}/forum/posts/:postId/replies`, () => {
        it('should return 200 and replies array with _count', async () => {
            const mockPost = createMockPost()
            const mockReplies = [
                createMockReply(),
                createMockReply({ id: 'reply-2' })
            ]
            prismaMock.post.findUnique
                .mockResolvedValue(mockPost as never)
            prismaMock.reply.findMany
                .mockResolvedValue(mockReplies as never)

            const response = await supertest(App)
                .get(
                    `/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123/replies`
                )
                .set('Cookie', readerCookie)

            expect(response.status).toBe(HttpStatusCodes.OK)
            expect(response.body.data.items)
                .toBeInstanceOf(Array)
            expect(response.body.data.items.length)
                .toBeGreaterThan(0)
            response.body.data.items.forEach((reply: unknown) => {
                expect(reply).toHaveProperty('_count')
                expect((reply as { _count: unknown })._count)
                    .toHaveProperty('likes')
            })
        })

        it(
            'should return 404 when post not found',
            async () => {
                prismaMock.post.findUnique
                    .mockResolvedValue(null as never)

                const response = await supertest(App)
                    .get(
                        `/api/${serverConfig.apiVersion}/forum/posts/non-existent/replies`
                    )
                    .set('Cookie', readerCookie)

                expect(response.status).toBe(HttpStatusCodes.NOT_FOUND)
            }
        )
    })

    // ==================== CREATE REPLY ====================
    describe(`POST /api/${serverConfig.apiVersion}/forum/posts/:postId/replies`, () => {
        it(
            'should return 201 for valid reply creation',
            async () => {
                const mockUser = createMockUser()
                const mockPost = createMockPost()
                const mockReply = createMockReply()
                const mockProfile = {
                    id: 'profile-id',
                    userId: mockUser.id
                }
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.post.findUnique
                    .mockResolvedValue(mockPost as never)
                prismaMock.profile.findUnique
                    .mockResolvedValue(mockProfile as never)
                prismaMock.reply.create
                    .mockResolvedValue(mockReply as never)

                const response = await withCsrfAuth(
                    supertest(App).post(
                        `/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123/replies`
                    ),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    body: 'This is a reply'
                })

                expect(response.status).toBe(HttpStatusCodes.CREATED)
                expect(response.body.message)
                    .toBe('Reply created successfully')
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .post(
                        `/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123/replies`
                    )
                    .send({
                        body: 'This is a reply'
                    })

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
            }
        )

        it('should return 400 for missing body', async () => {
            const mockUser = createMockUser()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            const response = await supertest(App)
                .post(
                    `/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123/replies`
                )
                .set('Cookie', [
                    `accessToken=${token}`,
                    `_csrf=${csrfSecret}`
                ])
                .set('x-csrf-token', csrfToken)
                .send({})

            expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
            expect(response.body.error[0].statusType)
                .toBe('Validation Error')
        })
    })

    // ==================== UPDATE REPLY ====================
    describe(
        `PUT /api/${serverConfig.apiVersion}/forum/posts/:postId/replies/:replyId`,
        () => {
            it(
                'should return 200 for valid update by owner',
                async () => {
                    const mockUser = createMockUser()
                    const mockProfile = {
                        id: 'test-profile-id-123',
                        userId: mockUser.id
                    }
                    const mockReply = createMockReply({
                        authorId: mockProfile.id
                    })
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } = createAuthenticatedRequest(mockUser)

                    prismaMock.profile.findUnique
                        .mockResolvedValue(mockProfile as never)
                    prismaMock.reply.findUnique
                        .mockResolvedValue(mockReply as never)
                    prismaMock.reply.update.mockResolvedValue({
                        ...mockReply,
                        body: 'Updated reply'
                    } as never)

                    const response = await withCsrfAuth(
                        supertest(App).put(
                            `/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123/replies/test-reply-id-123`
                        ),
                        token,
                        csrfSecret,
                        csrfToken
                    ).send({
                        body: 'Updated reply'
                    })

                    expect(response.status).toBe(HttpStatusCodes.OK)
                }
            )

            it(
                'should return 401 for non-owner',
                async () => {
                    const mockUser = createMockUser()
                    const mockProfile = {
                        id: 'test-profile-id-123',
                        userId: mockUser.id
                    }
                    const mockReply = createMockReply({
                        authorId: 'different-profile-id'
                    })
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } = createAuthenticatedRequest(mockUser)

                    prismaMock.profile.findUnique
                        .mockResolvedValue(mockProfile as never)
                    prismaMock.reply.findUnique
                        .mockResolvedValue(mockReply as never)

                    const response = await withCsrfAuth(
                        supertest(App).put(
                            `/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123/replies/test-reply-id-123`
                        ),
                        token,
                        csrfSecret,
                        csrfToken
                    ).send({
                        body: 'Updated reply'
                    })

                    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
                }
            )

            it(
                'should return 404 for non-existent reply',
                async () => {
                    const mockUser = createMockUser()
                    const mockProfile = {
                        id: 'test-profile-id-123',
                        userId: mockUser.id
                    }
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } = createAuthenticatedRequest(mockUser)

                    prismaMock.profile.findUnique
                        .mockResolvedValue(mockProfile as never)
                    prismaMock.reply.findUnique
                        .mockResolvedValue(null as never)

                    const response = await withCsrfAuth(
                        supertest(App).put(
                            `/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123/replies/non-existent-id`
                        ),
                        token,
                        csrfSecret,
                        csrfToken
                    ).send({
                        body: 'Updated reply'
                    })

                    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND)
                }
            )
        }
    )

    // ==================== DELETE REPLY ====================
    describe(
        `DELETE /api/${serverConfig.apiVersion}/forum/posts/:postId/replies/:replyId`,
        () => {
            const deleteReplyEndpoint =
                `/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123/replies/test-reply-id-123`

            it(
                'should return 200 for valid delete by owner',
                async () => {
                    const mockUser = createMockUser()
                    const mockProfile = {
                        id: 'test-profile-id-123',
                        userId: mockUser.id
                    }
                    const mockReply = createMockReply({
                        authorId: mockProfile.id
                    })
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } = createAuthenticatedRequest(mockUser)

                    prismaMock.profile.findUnique
                        .mockResolvedValue(mockProfile as never)
                    prismaMock.reply.findUnique
                        .mockResolvedValue(mockReply as never)
                    prismaMock.reply.delete
                        .mockResolvedValue(mockReply as never)

                    const response = await supertest(App)
                        .delete(deleteReplyEndpoint)
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set('x-csrf-token', csrfToken)

                    expect(response.status).toBe(HttpStatusCodes.OK)
                    expect(response.body.message)
                        .toContain('deleted')
                }
            )

            it(
                'should return 401 for non-owner user',
                async () => {
                    const mockUser = createMockUser()
                    const mockProfile = {
                        id: 'test-profile-id-123',
                        userId: mockUser.id
                    }
                    const _otherUser = createMockUser({
                        id: 'other-user-id'
                    })
                    const mockReply = createMockReply({
                        authorId: 'other-profile-id'
                    })
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } = createAuthenticatedRequest(mockUser)

                    prismaMock.profile.findUnique
                        .mockResolvedValue(mockProfile as never)
                    prismaMock.reply.findUnique
                        .mockResolvedValue(mockReply as never)

                    const response = await supertest(App)
                        .delete(deleteReplyEndpoint)
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set('x-csrf-token', csrfToken)

                    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
                    expect(response.body.error[0].error)
                        .toContain('not the author')
                }
            )

            it(
                'should return 404 for non-existent reply',
                async () => {
                    const mockUser = createMockUser()
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } = createAuthenticatedRequest(mockUser)

                    prismaMock.reply.findUnique
                        .mockResolvedValue(null as never)

                    const response = await supertest(App)
                        .delete(deleteReplyEndpoint)
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set('x-csrf-token', csrfToken)

                    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND)
                }
            )

            it(
                'should return 401 for unauthenticated request',
                async () => {
                    const response = await supertest(App)
                        .delete(deleteReplyEndpoint)

                    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
                }
            )

            it(
                'should return 401 when CSRF token is missing',
                async () => {
                    const mockUser = createMockUser()
                    const mockReply = createMockReply({
                        authorId: mockUser.id
                    })
                    const {
                        token,
                        csrfSecret
                    } = createAuthenticatedRequest(mockUser)

                    prismaMock.reply.findUnique
                        .mockResolvedValue(mockReply as never)

                    const response = await supertest(App)
                        .delete(deleteReplyEndpoint)
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])

                    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
                    expect(response.body.error[0].error)
                        .toContain('CSRF')
                }
            )

            it(
                'should return 401 when CSRF token is invalid',
                async () => {
                    const mockUser = createMockUser()
                    const mockReply = createMockReply({
                        authorId: mockUser.id
                    })
                    const {
                        token,
                        csrfSecret
                    } = createAuthenticatedRequest(mockUser)

                    prismaMock.reply.findUnique
                        .mockResolvedValue(mockReply as never)

                    const response = await supertest(App)
                        .delete(deleteReplyEndpoint)
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set('x-csrf-token', 'invalid-token')

                    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
                    expect(response.body.error[0].error)
                        .toContain('CSRF')
                }
            )
        }
    )

    // ==================== LIKE POST ====================
    describe(`POST /api/${serverConfig.apiVersion}/forum/posts/:postId/like`, () => {
        const likeEndpoint =
            `/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123/like`

        const setupLikeMocks = (mockProfile: {
            id: string
            userId: string
        }) => {
            prismaMock.post.findUnique
                .mockResolvedValue(createMockPost() as never)
            prismaMock.profile.findUnique
                .mockResolvedValue(mockProfile as never)
        }

        it(
            'should return 200 with liked=true on first like',
            async () => {
                const mockUser = createMockUser()
                const mockProfile = {
                    id: 'profile-id',
                    userId: mockUser.id
                }
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                setupLikeMocks(mockProfile)
                prismaMock.postLike.deleteMany
                    .mockResolvedValue({ count: 0 } as never)
                prismaMock.postLike.create
                    .mockResolvedValue({} as never)
                prismaMock.postLike.count
                    .mockResolvedValue(1 as never)

                const response = await withCsrfAuth(
                    supertest(App).post(likeEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                )

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.data.liked).toBe(true)
                expect(response.body.data.likes).toBe(1)
                expect(response.body.message).toBe('Post liked')
            }
        )

        it(
            'should return 200 with liked=false on unlike',
            async () => {
                const mockUser = createMockUser()
                const mockProfile = {
                    id: 'profile-id',
                    userId: mockUser.id
                }
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                setupLikeMocks(mockProfile)
                prismaMock.postLike.deleteMany
                    .mockResolvedValue({ count: 1 } as never)
                prismaMock.postLike.count
                    .mockResolvedValue(0 as never)

                const response = await withCsrfAuth(
                    supertest(App).post(likeEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                )

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.data.liked).toBe(false)
                expect(response.body.data.likes).toBe(0)
                expect(response.body.message).toBe('Post unliked')
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .post(likeEndpoint)

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
            }
        )

        it(
            'should return 401 for missing CSRF token',
            async () => {
                const mockUser = createMockUser()
                const token = createAuthToken(mockUser)

                const response = await supertest(App)
                    .post(likeEndpoint)
                    .set('Cookie', [`accessToken=${token}`])

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
            }
        )

        it(
            'should return 404 when post not found',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.post.findUnique
                    .mockResolvedValue(null as never)

                const response = await withCsrfAuth(
                    supertest(App).post(likeEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                )

                expect(response.status).toBe(HttpStatusCodes.NOT_FOUND)
                expect(response.body.error[0].statusType)
                    .toBe('Not Found')
            }
        )
    })

    // ==================== SHARE POST ====================
    describe(`POST /api/${serverConfig.apiVersion}/forum/posts/:postId/share`, () => {
        const shareEndpoint =
            `/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123/share`

        it(
            'should return 200 with incremented shareCount',
            async () => {
                prismaMock.post.update
                    .mockResolvedValue({ shareCount: 1 } as never)

                const response = await supertest(App)
                    .post(shareEndpoint)
                    .set('Cookie', readerCookie)

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.data.shareCount).toBe(1)
                expect(response.body.message)
                    .toBe('Post test-post-id-123 shared')
            }
        )

        it(
            'should return 404 when post not found',
            async () => {
                prismaMock.post.update.mockRejectedValue(
                    new Prisma.PrismaClientKnownRequestError(
                        'Record not found',
                        { code: 'P2025', clientVersion: '5.0' }
                    )
                )

                const response = await supertest(App)
                    .post(`/api/${serverConfig.apiVersion}/forum/posts/test-post-id-404/share`)
                    .set('Cookie', readerCookie)

                expect(response.status).toBe(HttpStatusCodes.NOT_FOUND)
                expect(response.body.error[0].statusType)
                    .toBe('Not Found')
            }
        )
    })

    // ==================== LIKE REPLY ====================
    describe(
        `POST /api/${serverConfig.apiVersion}/forum/posts/:postId/replies/:replyId/like`,
        () => {
            const likeReplyEndpoint =
                `/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123/replies/test-reply-id-123/like`

            it(
                'should return 200 with liked=true on first like',
                async () => {
                    const mockUser = createMockUser()
                    const mockProfile = {
                        id: 'profile-id',
                        userId: mockUser.id
                    }
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } = createAuthenticatedRequest(mockUser)

                    prismaMock.reply.findUnique
                        .mockResolvedValue(createMockReply() as never)
                    prismaMock.profile.findUnique
                        .mockResolvedValue(mockProfile as never)
                    prismaMock.replyLike.deleteMany
                        .mockResolvedValue({ count: 0 } as never)
                    prismaMock.replyLike.create
                        .mockResolvedValue({} as never)
                    prismaMock.replyLike.count
                        .mockResolvedValue(1 as never)

                    const response = await withCsrfAuth(
                        supertest(App).post(likeReplyEndpoint),
                        token,
                        csrfSecret,
                        csrfToken
                    )

                    expect(response.status).toBe(HttpStatusCodes.OK)
                    expect(response.body.data.liked).toBe(true)
                    expect(response.body.data.likes).toBe(1)
                    expect(response.body.message)
                        .toBe('Reply liked')
                }
            )

            it(
                'should return 200 with liked=false on unlike',
                async () => {
                    const mockUser = createMockUser()
                    const mockProfile = {
                        id: 'profile-id',
                        userId: mockUser.id
                    }
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } = createAuthenticatedRequest(mockUser)

                    prismaMock.reply.findUnique
                        .mockResolvedValue(createMockReply() as never)
                    prismaMock.profile.findUnique
                        .mockResolvedValue(mockProfile as never)
                    prismaMock.replyLike.deleteMany
                        .mockResolvedValue({ count: 1 } as never)
                    prismaMock.replyLike.count
                        .mockResolvedValue(0 as never)

                    const response = await withCsrfAuth(
                        supertest(App).post(likeReplyEndpoint),
                        token,
                        csrfSecret,
                        csrfToken
                    )

                    expect(response.status).toBe(HttpStatusCodes.OK)
                    expect(response.body.data.liked).toBe(false)
                    expect(response.body.message)
                        .toBe('Reply unliked')
                }
            )

            it(
                'should return 401 for unauthenticated request',
                async () => {
                    const response = await supertest(App)
                        .post(likeReplyEndpoint)

                    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
                }
            )

            it(
                'should return 404 when reply not found',
                async () => {
                    const mockUser = createMockUser()
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } = createAuthenticatedRequest(mockUser)

                    prismaMock.reply.findUnique
                        .mockResolvedValue(null as never)

                    const response = await withCsrfAuth(
                        supertest(App).post(likeReplyEndpoint),
                        token,
                        csrfSecret,
                        csrfToken
                    )

                    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND)
                    expect(response.body.error[0].statusType)
                        .toBe('Not Found')
                }
            )
        }
    )

    // ==================== SAVE POST ====================
    describe(`POST /api/${serverConfig.apiVersion}/forum/posts/:postId/save`, () => {
        const saveEndpoint =
            `/api/${serverConfig.apiVersion}/forum/posts/test-post-id-123/save`

        const setupSaveMocks = (mockProfile: {
            id: string
            userId: string
        }) => {
            prismaMock.post.findUnique
                .mockResolvedValue(createMockPost() as never)
            prismaMock.profile.findUnique
                .mockResolvedValue(mockProfile as never)
        }

        it(
            'should return 200 with saved=true on first save',
            async () => {
                const mockUser = createMockUser()
                const mockProfile = {
                    id: 'profile-id',
                    userId: mockUser.id
                }
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                setupSaveMocks(mockProfile)
                prismaMock.savedPost.deleteMany
                    .mockResolvedValue({ count: 0 } as never)
                prismaMock.savedPost.create
                    .mockResolvedValue({} as never)

                const response = await withCsrfAuth(
                    supertest(App).post(saveEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                )

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.data.saved).toBe(true)
                expect(response.body.message).toBe('Post saved')
            }
        )

        it(
            'should return 200 with saved=false on unsave',
            async () => {
                const mockUser = createMockUser()
                const mockProfile = {
                    id: 'profile-id',
                    userId: mockUser.id
                }
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                setupSaveMocks(mockProfile)
                prismaMock.savedPost.deleteMany
                    .mockResolvedValue({ count: 1 } as never)

                const response = await withCsrfAuth(
                    supertest(App).post(saveEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                )

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.data.saved).toBe(false)
                expect(response.body.message).toBe('Post unsaved')
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .post(saveEndpoint)

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
            }
        )

        it(
            'should return 401 for missing CSRF token',
            async () => {
                const mockUser = createMockUser()
                const token = createAuthToken(mockUser)

                const response = await supertest(App)
                    .post(saveEndpoint)
                    .set('Cookie', [`accessToken=${token}`])

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
            }
        )

        it(
            'should return 404 when post not found',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.post.findUnique
                    .mockResolvedValue(null as never)

                const response = await withCsrfAuth(
                    supertest(App).post(saveEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                )

                expect(response.status).toBe(HttpStatusCodes.NOT_FOUND)
                expect(response.body.error[0].statusType)
                    .toBe('Not Found')
            }
        )
    })

    // ==================== GET SAVED POSTS ====================
    describe(`GET /api/${serverConfig.apiVersion}/forum/posts/saved`, () => {
        const savedEndpoint = `/api/${serverConfig.apiVersion}/forum/posts/saved`

        it(
            'should return 200 with saved posts array',
            async () => {
                const mockUser = createMockUser()
                const mockProfile = {
                    id: 'profile-id',
                    userId: mockUser.id
                }
                const token = createAuthToken(mockUser)
                const mockPosts = [
                    createMockPost(),
                    createMockPost({ id: 'post-2' })
                ]

                prismaMock.profile.findUnique
                    .mockResolvedValue(mockProfile as never)
                prismaMock.post.findMany
                    .mockResolvedValue(mockPosts as never)

                const response = await supertest(App)
                    .get(savedEndpoint)
                    .set('Cookie', [`accessToken=${token}`])

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.data)
                    .toBeInstanceOf(Array)
                expect(response.body.data).toHaveLength(2)
                expect(response.body.message)
                    .toContain('saved posts found')
            }
        )

        it(
            'should return 200 with empty array when no saved posts',
            async () => {
                const mockUser = createMockUser()
                const mockProfile = {
                    id: 'profile-id',
                    userId: mockUser.id
                }
                const token = createAuthToken(mockUser)

                prismaMock.profile.findUnique
                    .mockResolvedValue(mockProfile as never)
                prismaMock.post.findMany
                    .mockResolvedValue([])

                const response = await supertest(App)
                    .get(savedEndpoint)
                    .set('Cookie', [`accessToken=${token}`])

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.data).toEqual([])
                expect(response.body.message)
                    .toBe('0 saved posts found')
            }
        )

        it(
            'should return 200 with pagination params',
            async () => {
                const mockUser = createMockUser()
                const mockProfile = {
                    id: 'profile-id',
                    userId: mockUser.id
                }
                const token = createAuthToken(mockUser)

                prismaMock.profile.findUnique
                    .mockResolvedValue(mockProfile as never)
                prismaMock.post.findMany
                    .mockResolvedValue([createMockPost()] as never)

                const response = await supertest(App)
                    .get(savedEndpoint)
                    .set('Cookie', [`accessToken=${token}`])
                    .query({ limit: 5, page: 1 })

                expect(response.status).toBe(HttpStatusCodes.OK)
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .get(savedEndpoint)

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
            }
        )
    })

    // ==================== GET TAGS ====================
    describe(`GET /api/${serverConfig.apiVersion}/forum/tags`, () => {
        const tagsEndpoint = `/api/${serverConfig.apiVersion}/forum/tags`

        it('should return 200 and tags array', async () => {
            prismaMock.tag.findMany
                .mockResolvedValue([
                    createRawMockTag(),
                    createRawMockTag({ id: 'tag-2', name: 'tag2', nameHe: 'תג 2' })
                ])

            const response = await supertest(App)
                .get(tagsEndpoint)
                .set('Cookie', readerCookie)

            expect(response.status).toBe(HttpStatusCodes.OK)
            expect(response.body.data)
                .toBeInstanceOf(Array)
        })

        it(
            'should return 200 with search filter',
            async () => {
                prismaMock.tag.findMany
                    .mockResolvedValue([createRawMockTag({ name: 'javascript', nameHe: 'ג\'אווהסקריפט' })])

                const response = await supertest(App)
                    .get(tagsEndpoint)
                    .set('Cookie', readerCookie)
                    .query({ search: 'java' })

                expect(response.status).toBe(HttpStatusCodes.OK)
            }
        )

        it(
            'should return 200 with popular filter',
            async () => {
                prismaMock.tag.findMany
                    .mockResolvedValue([createRawMockTag()])

                const response = await supertest(App)
                    .get(tagsEndpoint)
                    .set('Cookie', readerCookie)
                    .query({ filter: 'popular' })

                expect(response.status).toBe(HttpStatusCodes.OK)
            }
        )

        it(
            'should return 200 with pagination',
            async () => {
                prismaMock.tag.findMany
                    .mockResolvedValue([createRawMockTag()])

                const response = await supertest(App)
                    .get(tagsEndpoint)
                    .set('Cookie', readerCookie)
                    .query({
                        limit: 5,
                        page: 1
                    })

                expect(response.status).toBe(HttpStatusCodes.OK)
            }
        )

        it(
            'should return 404 when no tags found',
            async () => {
                prismaMock.tag.findMany
                    .mockResolvedValue(null as unknown as never[])

                const response = await supertest(App)
                    .get(tagsEndpoint)
                    .set('Cookie', readerCookie)

                expect(response.status).toBe(HttpStatusCodes.NOT_FOUND)
            }
        )
    })

    // ==================== GET SINGLE TAG ====================
    describe(`GET /api/${serverConfig.apiVersion}/forum/tags/:tagId`, () => {
        it('should return 200 and single tag', async () => {
            prismaMock.tag.findUnique
                .mockResolvedValue(createRawMockTag())

            const response = await supertest(App)
                .get(`/api/${serverConfig.apiVersion}/forum/tags/test-tag-id-123`)
                .set('Cookie', readerCookie)

            expect(response.status).toBe(HttpStatusCodes.OK)
            expect(response.body.data.id)
                .toBe('test-tag-id-123')
        })

        it(
            'should return 404 for non-existent tag',
            async () => {
                prismaMock.tag.findUnique
                    .mockResolvedValue(null as never)

                const response = await supertest(App)
                    .get(`/api/${serverConfig.apiVersion}/forum/tags/non-existent-id`)
                    .set('Cookie', readerCookie)

                expect(response.status).toBe(HttpStatusCodes.NOT_FOUND)
                expect(response.body.error[0].statusType)
                    .toBe('Not Found')
            }
        )
    })

    // ==================== REPORT UNKNOWN TAG ====================
    describe(`POST /api/${serverConfig.apiVersion}/forum/tags/unknown`, () => {
        const endpoint = `/api/${serverConfig.apiVersion}/forum/tags/unknown`

        it(
            'should return 200 and record unknown tag attempt',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.unknownTagAttempt.upsert
                    .mockResolvedValue({
                        id: 'attempt-id',
                        tagName: 'non-existent-tag',
                        count: 1,
                        lastSeenAt: new Date(),
                        createdAt: new Date()
                    } as never)

                const response = await withCsrfAuth(
                    supertest(App).post(endpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({ tagName: 'non-existent-tag' })

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.message)
                    .toBe('Tag attempt recorded')
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .post(endpoint)
                    .send({ tagName: 'some-tag' })

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
            }
        )

        it(
            'should return 401 for missing CSRF token',
            async () => {
                const mockUser = createMockUser()
                const token = createAuthToken(mockUser)

                const response = await supertest(App)
                    .post(endpoint)
                    .set('Cookie', [`accessToken=${token}`])
                    .send({ tagName: 'some-tag' })

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
            }
        )

        it(
            'should return 400 for missing tagName',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await withCsrfAuth(
                    supertest(App).post(endpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({})

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
                expect(response.body.error[0].property)
                    .toBe('tagName')
            }
        )

        it(
            'should return 400 for empty tagName',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await withCsrfAuth(
                    supertest(App).post(endpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({ tagName: '' })

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
            }
        )
    })

    // ==================== GET CATEGORY STATS ====================
    describe(`GET /api/${serverConfig.apiVersion}/forum/posts/categories`, () => {
        const endpoint = `/api/${serverConfig.apiVersion}/forum/posts/categories`

        it(
            'should return 200 and category counts array',
            async () => {
                ;(prismaMock.post.groupBy as jest.Mock)
                    .mockResolvedValue([
                        { category: 'therapy', _count: { category: 4 } },
                        { category: 'wellness', _count: { category: 2 } }
                    ] as never)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', readerCookie)

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.data)
                    .toBeInstanceOf(Array)
                expect(response.body.message)
                    .toContain('categories found')
            }
        )

        it(
            'should include "all" as first item with total count',
            async () => {
                ;(prismaMock.post.groupBy as jest.Mock)
                    .mockResolvedValue([
                        { category: 'therapy', _count: { category: 4 } },
                        { category: 'wellness', _count: { category: 2 } }
                    ] as never)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', readerCookie)

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.data[0].category).toBe('all')
                expect(response.body.data[0].count).toBe(6)
            }
        )

        it(
            'should return items with category and count fields',
            async () => {
                ;(prismaMock.post.groupBy as jest.Mock)
                    .mockResolvedValue([
                        { category: 'therapy', _count: { category: 4 } }
                    ] as never)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', readerCookie)

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.data[1])
                    .toHaveProperty('category')
                expect(response.body.data[1])
                    .toHaveProperty('count')
                expect(typeof response.body.data[1].count)
                    .toBe('number')
            }
        )

        it(
            'should return only "all" with count 0 when no posts',
            async () => {
                ;(prismaMock.post.groupBy as jest.Mock)
                    .mockResolvedValue([] as never)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', readerCookie)

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.data).toEqual([
                    { category: 'all', count: 0 }
                ])
            }
        )
    })

    // ==================== GET UNKNOWN TAG ATTEMPTS (ADMIN) ====================
    describe(`GET /api/${serverConfig.apiVersion}/forum/tags/unknown`, () => {
        const endpoint = `/api/${serverConfig.apiVersion}/forum/tags/unknown`

        it(
            'should return 200 and attempts list for admin',
            async () => {
                const mockAdmin = createMockUser({
                    role: 'ADMIN'
                })
                const token = createAuthToken(mockAdmin)

                prismaMock.user.findUnique
                    .mockResolvedValue({
                        role: 'ADMIN'
                    } as never)
                prismaMock.unknownTagAttempt.findMany
                    .mockResolvedValue([
                        {
                            id: 'attempt-1',
                            tagName: 'covid',
                            count: 5,
                            lastSeenAt: new Date(),
                            createdAt: new Date()
                        },
                        {
                            id: 'attempt-2',
                            tagName: 'diabetes',
                            count: 3,
                            lastSeenAt: new Date(),
                            createdAt: new Date()
                        }
                    ] as never)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', readerCookie)
                    .set('Cookie', [`accessToken=${token}`])

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.data)
                    .toBeInstanceOf(Array)
                expect(response.body.message)
                    .toContain('unknown tag attempts')
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .get(endpoint)

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
            }
        )

        it(
            'should return 403 for non-admin user',
            async () => {
                const mockUser = createMockUser({
                    role: 'USER'
                })
                const token = createAuthToken(mockUser)

                prismaMock.user.findUnique
                    .mockResolvedValue({
                        role: 'USER'
                    } as never)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', readerCookie)
                    .set('Cookie', [`accessToken=${token}`])

                expect(response.status).toBe(HttpStatusCodes.FORBIDDEN)
            }
        )
    })

    // ==================== CASCADING SERVICE FAILURES ====================
    describe('Cascading service failure paths', () => {
        it(
            'POST /posts returns 500 when Prisma throws connection error on profile lookup',
            async () => {
                const mockUser = createMockUser()
                const { token, csrfSecret, csrfToken } = createAuthenticatedRequest(mockUser)

                prismaMock.profile.findUnique
                    .mockRejectedValue(new Error('ECONNREFUSED'))

                const response = await supertest(App)
                    .post(`/api/${serverConfig.apiVersion}/forum/posts`)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send({
                        title: 'Test Post',
                        body: 'Content',
                        category: 'general',
                        tags: []
                    })

                expect(response.status).toBe(HttpStatusCodes.INTERNAL_SERVER_ERROR)
            }
        )

        it(
            'GET /posts returns 500 when Prisma throws connection error',
            async () => {
                prismaMock.post.findMany
                    .mockRejectedValue(new Error('ECONNREFUSED'))

                const response = await supertest(App)
                    .get(`/api/${serverConfig.apiVersion}/forum/posts`)
                    .set('Cookie', readerCookie)

                expect(response.status).toBe(HttpStatusCodes.INTERNAL_SERVER_ERROR)
            }
        )
    })
})