// @ts-nocheck
import supertest from 'supertest'

import App from '../../app'
import {prismaMock} from '../setup/jestSetup'
import {
    createAuthenticatedRequest,
    createAuthToken,
    createMockPost,
    createMockReply,
    createMockTag,
    createMockUser
} from '../setup/testSetup'

describe('Forum Routes', () => {
    // ==================== GET POSTS ====================
    describe('GET /api/v1/forum/posts', () => {
        const postsEndpoint = '/api/v1/forum/posts'

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
                        mockPosts
                    )

                const response =
                    await supertest(App)
                        .get(postsEndpoint)

                expect(response.status)
                    .toBe(200)
                expect(response.body.data)
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
                    .mockResolvedValue(mockPosts)

                const response = await supertest(App)
                    .get(postsEndpoint)
                    .query({
                        limit: 5,
                        page: 1
                    })

                expect(response.status).toBe(200)
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
                    .mockResolvedValue(mockPosts)

                const response = await supertest(App)
                    .get(postsEndpoint)
                    .query({tag: 'test-tag'})

                expect(response.status).toBe(200)
            }
        )

        it(
            'should return 200 with category filter',
            async () => {
                const mockPosts = [
                    createMockPost({category: 'health'})
                ]
                prismaMock.post.findMany
                    .mockResolvedValue(mockPosts)

                const response = await supertest(App)
                    .get(postsEndpoint)
                    .query({category: 'health'})

                expect(response.status).toBe(200)
            }
        )

        it(
            'should return 200 with search filter',
            async () => {
                const mockPosts = [
                    createMockPost({title: 'Search Test'})
                ]
                prismaMock.post.findMany
                    .mockResolvedValue(mockPosts)

                const response = await supertest(App)
                    .get(postsEndpoint)
                    .query({search: 'Search'})

                expect(response.status).toBe(200)
            }
        )

        it(
            'should return 200 with newest filter',
            async () => {
                const mockPosts = [createMockPost()]
                prismaMock.post.findMany
                    .mockResolvedValue(mockPosts)

                const response = await supertest(App)
                    .get(postsEndpoint)
                    .query({filter: 'newest'})

                expect(response.status).toBe(200)
            }
        )

        it(
            'should return 200 with popular filter',
            async () => {
                const mockPosts = [
                    createMockPost({views: 100})
                ]
                prismaMock.post.findMany
                    .mockResolvedValue(mockPosts)

                const response = await supertest(App)
                    .get(postsEndpoint)
                    .query({filter: 'popular'})

                expect(response.status).toBe(200)
            }
        )

        it(
            'should return 200 with hot filter',
            async () => {
                const mockPosts = [createMockPost()]
                prismaMock.post.findMany
                    .mockResolvedValue(mockPosts)

                const response = await supertest(App)
                    .get(postsEndpoint)
                    .query({filter: 'hot'})

                expect(response.status).toBe(200)
            }
        )

        it(
            'should return 200 with unanswered filter',
            async () => {
                const mockPosts = [
                    createMockPost({
                        _count: {replies: 0}
                    })
                ]
                prismaMock.post.findMany
                    .mockResolvedValue(mockPosts)

                const response = await supertest(App)
                    .get(postsEndpoint)
                    .query({filter: 'unanswered'})

                expect(response.status).toBe(200)
            }
        )

        it(
            'should return 404 when no posts found',
            async () => {
                prismaMock.post.findMany
                    .mockResolvedValue(null as unknown as never[])

                const response = await supertest(App)
                    .get(postsEndpoint)

                expect(response.status).toBe(404)
                expect(response.body.error[0].statusType)
                    .toBe('Not Found')
            }
        )

        it(
            'should return 403 for invalid limit (over 100)',
            async () => {
                const response = await supertest(App)
                    .get(postsEndpoint)
                    .query({limit: 200})

                expect(response.status).toBe(403)
            }
        )
    })

    // ==================== CREATE POST ====================
    describe('POST /api/v1/forum/posts', () => {
        const postsEndpoint = '/api/v1/forum/posts'

        it(
            'should return 200 for valid post creation',
            async () => {
                const mockUser = createMockUser()
                const mockPost = createMockPost()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.post.create
                    .mockResolvedValue(mockPost)

                const response = await supertest(App)
                    .post(postsEndpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send({
                        title: 'New Post',
                        body: 'Post content',
                        category: 'general',
                        tags: [
                            'tag1',
                            'tag2'
                        ]
                    })

                expect(response.status).toBe(200)
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

                expect(response.status).toBe(401)
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

                expect(response.status).toBe(401)
            }
        )

        it(
            'should return 403 for missing title',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await supertest(App)
                    .post(postsEndpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send({
                        body: 'Post content',
                        category: 'general',
                        tags: ['tag1']
                    })

                expect(response.status).toBe(403)
                expect(response.body.error[0].property)
                    .toBe('title')
            }
        )

        it(
            'should return 403 for missing body',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await supertest(App)
                    .post(postsEndpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send({
                        title: 'New Post',
                        category: 'general',
                        tags: ['tag1']
                    })

                expect(response.status).toBe(403)
                expect(response.body.error[0].property)
                    .toBe('body')
            }
        )

        it(
            'should return 403 for missing category',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await supertest(App)
                    .post(postsEndpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send({
                        title: 'New Post',
                        body: 'Post content',
                        tags: ['tag1']
                    })

                expect(response.status).toBe(403)
                expect(response.body.error[0].property)
                    .toBe('category')
            }
        )

        it(
            'should return 403 for missing tags',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await supertest(App)
                    .post(postsEndpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send({
                        title: 'New Post',
                        body: 'Post content',
                        category: 'general'
                    })

                expect(response.status).toBe(403)
                expect(response.body.error[0].property)
                    .toBe('tags')
            }
        )
    })

    // ==================== GET SINGLE POST ====================
    describe('GET /api/v1/forum/posts/:postId', () => {
        it('should return 200 and single post', async () => {
            const mockPost = createMockPost()
            prismaMock.post.findUnique
                .mockResolvedValue(mockPost)

            const response = await supertest(App)
                .get('/api/v1/forum/posts/test-post-id-123')

            expect(response.status).toBe(200)
            expect(response.body.data.id)
                .toBe('test-post-id-123')
        })

        it(
            'should return 404 for non-existent post',
            async () => {
                prismaMock.post.findUnique
                    .mockResolvedValue(null)

                const response = await supertest(App)
                    .get('/api/v1/forum/posts/non-existent-id')

                expect(response.status).toBe(404)
                expect(response.body.error[0].statusType)
                    .toBe('Not Found')
            }
        )
    })

    // ==================== UPDATE POST ====================
    describe('PUT /api/v1/forum/posts/:postId', () => {
        it(
            'should return 200 for valid update by owner',
            async () => {
                const mockUser = createMockUser()
                const mockPost = createMockPost({
                    authorId: mockUser.id
                })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.post.findUnique
                    .mockResolvedValue(mockPost)
                prismaMock.post.update.mockResolvedValue({
                    ...mockPost,
                    title: 'Updated Title'
                })
                prismaMock.tag.findMany
                    .mockResolvedValue([])

                const response = await supertest(App)
                    .put('/api/v1/forum/posts/test-post-id-123')
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send({
                        title: 'Updated Title'
                    })

                expect(response.status).toBe(200)
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .put('/api/v1/forum/posts/test-post-id-123')
                    .send({
                        title: 'Updated Title'
                    })

                expect(response.status).toBe(401)
            }
        )

        it('should return 401 for non-owner', async () => {
            const mockUser = createMockUser()
            const mockPost = createMockPost({
                authorId: 'different-user-id'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.post.findUnique
                .mockResolvedValue(mockPost)

            const response = await supertest(App)
                .put('/api/v1/forum/posts/test-post-id-123')
                .set('Cookie', [
                    `accessToken=${token}`,
                    `_csrf=${csrfSecret}`
                ])
                .set('x-csrf-token', csrfToken)
                .send({
                    title: 'Updated Title'
                })

            expect(response.status).toBe(401)
        })

        it(
            'should return 404 for non-existent post',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.post.findUnique
                    .mockResolvedValue(null)

                const response = await supertest(App)
                    .put('/api/v1/forum/posts/non-existent-id')
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send({
                        title: 'Updated Title'
                    })

                expect(response.status).toBe(404)
            }
        )
    })

    // ==================== DELETE POST ====================
    describe('DELETE /api/v1/forum/posts/:postId', () => {
        it(
            'should return 200 for valid delete by owner',
            async () => {
                const mockUser = createMockUser()
                const mockPost = createMockPost({
                    authorId: mockUser.id
                })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.post.findUnique
                    .mockResolvedValue(mockPost)
                prismaMock.post.delete
                    .mockResolvedValue(mockPost)

                const response = await supertest(App)
                    .delete(
                        '/api/v1/forum/posts/test-post-id-123'
                    )
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)

                expect(response.status).toBe(200)
                expect(response.body.message)
                    .toContain('deleted')
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .delete(
                        '/api/v1/forum/posts/test-post-id-123'
                    )

                expect(response.status).toBe(401)
            }
        )

        it('should return 401 for non-owner', async () => {
            const mockUser = createMockUser()
            const mockPost = createMockPost({
                authorId: 'different-user-id'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.post.findUnique
                .mockResolvedValue(mockPost)

            const response = await supertest(App)
                .delete(
                    '/api/v1/forum/posts/test-post-id-123'
                )
                .set('Cookie', [
                    `accessToken=${token}`,
                    `_csrf=${csrfSecret}`
                ])
                .set('x-csrf-token', csrfToken)

            expect(response.status).toBe(401)
        })
    })

    // ==================== GET REPLIES ====================
    describe('GET /api/v1/forum/posts/:postId/replies', () => {
        it('should return 200 and replies array', async () => {
            const mockPost = createMockPost()
            const mockReplies = [
                createMockReply(),
                createMockReply({id: 'reply-2'})
            ]
            prismaMock.post.findUnique
                .mockResolvedValue(mockPost)
            prismaMock.reply.findMany
                .mockResolvedValue(mockReplies)

            const response = await supertest(App)
                .get(
                    '/api/v1/forum/posts/test-post-id-123/replies'
                )

            expect(response.status).toBe(200)
            expect(response.body.data)
                .toBeInstanceOf(Array)
        })

        it(
            'should return 404 when post not found',
            async () => {
                prismaMock.post.findUnique
                    .mockResolvedValue(null)

                const response = await supertest(App)
                    .get(
                        '/api/v1/forum/posts/non-existent/replies'
                    )

                expect(response.status).toBe(404)
            }
        )
    })

    // ==================== CREATE REPLY ====================
    describe('POST /api/v1/forum/posts/:postId/replies', () => {
        it(
            'should return 200 for valid reply creation',
            async () => {
                const mockUser = createMockUser()
                const mockPost = createMockPost()
                const mockReply = createMockReply()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.post.findUnique
                    .mockResolvedValue(mockPost)
                prismaMock.reply.create
                    .mockResolvedValue(mockReply)

                const response = await supertest(App)
                    .post(
                        '/api/v1/forum/posts/test-post-id-123/replies'
                    )
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send({
                        body: 'This is a reply'
                    })

                expect(response.status).toBe(200)
                expect(response.body.message)
                    .toBe('Reply created successfully')
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .post(
                        '/api/v1/forum/posts/test-post-id-123/replies'
                    )
                    .send({
                        body: 'This is a reply'
                    })

                expect(response.status).toBe(401)
            }
        )

        it('should return 403 for missing body', async () => {
            const mockUser = createMockUser()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            const response = await supertest(App)
                .post(
                    '/api/v1/forum/posts/test-post-id-123/replies'
                )
                .set('Cookie', [
                    `accessToken=${token}`,
                    `_csrf=${csrfSecret}`
                ])
                .set('x-csrf-token', csrfToken)
                .send({})

            expect(response.status).toBe(403)
            expect(response.body.error[0].statusType)
                .toBe('Validation Error')
        })
    })

    // ==================== UPDATE REPLY ====================
    describe(
        'PUT /api/v1/forum/posts/:postId/replies/:replyId',
        () => {
            it(
                'should return 200 for valid update by owner',
                async () => {
                    const mockUser = createMockUser()
                    const mockReply = createMockReply({
                        authorId: mockUser.id
                    })
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } = createAuthenticatedRequest(mockUser)

                    prismaMock.reply.findUnique
                        .mockResolvedValue(mockReply)
                    prismaMock.reply.update.mockResolvedValue({
                        ...mockReply,
                        body: 'Updated reply'
                    })

                    const response = await supertest(App)
                        .put(
                            '/api/v1/forum/posts/test-post-id-123/replies/test-reply-id-123'
                        )
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set('x-csrf-token', csrfToken)
                        .send({
                            body: 'Updated reply'
                        })

                    expect(response.status).toBe(200)
                }
            )

            it(
                'should return 401 for non-owner',
                async () => {
                    const mockUser = createMockUser()
                    const mockReply = createMockReply({
                        authorId: 'different-user-id'
                    })
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } = createAuthenticatedRequest(mockUser)

                    prismaMock.reply.findUnique
                        .mockResolvedValue(mockReply)

                    const response = await supertest(App)
                        .put(
                            '/api/v1/forum/posts/test-post-id-123/replies/test-reply-id-123'
                        )
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set('x-csrf-token', csrfToken)
                        .send({
                            body: 'Updated reply'
                        })

                    expect(response.status).toBe(401)
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
                        .mockResolvedValue(null)

                    const response = await supertest(App)
                        .put(
                            '/api/v1/forum/posts/test-post-id-123/replies/non-existent-id'
                        )
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set('x-csrf-token', csrfToken)
                        .send({
                            body: 'Updated reply'
                        })

                    expect(response.status).toBe(404)
                }
            )
        }
    )

    // ==================== DELETE REPLY ====================
    describe(
        'DELETE /api/v1/forum/posts/:postId/replies/:replyId',
        () => {
            const deleteReplyEndpoint =
                '/api/v1/forum/posts/test-post-id-123/replies/test-reply-id-123'

            it(
                'should return 200 for valid delete by owner',
                async () => {
                    const mockUser = createMockUser()
                    const mockReply = createMockReply({
                        authorId: mockUser.id
                    })
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } = createAuthenticatedRequest(mockUser)

                    prismaMock.reply.findUnique
                        .mockResolvedValue(mockReply)
                    prismaMock.reply.delete
                        .mockResolvedValue(mockReply)

                    const response = await supertest(App)
                        .delete(deleteReplyEndpoint)
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set('x-csrf-token', csrfToken)

                    expect(response.status).toBe(200)
                    expect(response.body.message)
                        .toContain('deleted')
                }
            )

            it(
                'should return 401 for non-owner user',
                async () => {
                    const mockUser = createMockUser()
                    const otherUser = createMockUser({
                        id: 'other-user-id'
                    })
                    const mockReply = createMockReply({
                        authorId: otherUser.id
                    })
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } = createAuthenticatedRequest(mockUser)

                    prismaMock.reply.findUnique
                        .mockResolvedValue(mockReply)

                    const response = await supertest(App)
                        .delete(deleteReplyEndpoint)
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set('x-csrf-token', csrfToken)

                    expect(response.status).toBe(401)
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
                        .mockResolvedValue(null)

                    const response = await supertest(App)
                        .delete(deleteReplyEndpoint)
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set('x-csrf-token', csrfToken)

                    expect(response.status).toBe(404)
                }
            )

            it(
                'should return 401 for unauthenticated request',
                async () => {
                    const response = await supertest(App)
                        .delete(deleteReplyEndpoint)

                    expect(response.status).toBe(401)
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
                        .mockResolvedValue(mockReply)

                    const response = await supertest(App)
                        .delete(deleteReplyEndpoint)
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])

                    expect(response.status).toBe(401)
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
                        .mockResolvedValue(mockReply)

                    const response = await supertest(App)
                        .delete(deleteReplyEndpoint)
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set('x-csrf-token', 'invalid-token')

                    expect(response.status).toBe(401)
                    expect(response.body.error[0].error)
                        .toContain('CSRF')
                }
            )
        }
    )

    // ==================== GET TAGS ====================
    describe('GET /api/v1/forum/tags', () => {
        const tagsEndpoint = '/api/v1/forum/tags'

        it('should return 200 and tags array', async () => {
            const mockTags = [
                createMockTag(),
                createMockTag({
                    id: 'tag-2',
                    name: 'tag2'
                })
            ]
            prismaMock.tag.findMany
                .mockResolvedValue(mockTags)

            const response = await supertest(App)
                .get(tagsEndpoint)

            expect(response.status).toBe(200)
            expect(response.body.data)
                .toBeInstanceOf(Array)
        })

        it(
            'should return 200 with search filter',
            async () => {
                const mockTags = [
                    createMockTag({name: 'javascript'})
                ]
                prismaMock.tag.findMany
                    .mockResolvedValue(mockTags)

                const response = await supertest(App)
                    .get(tagsEndpoint)
                    .query({search: 'java'})

                expect(response.status).toBe(200)
            }
        )

        it(
            'should return 200 with popular filter',
            async () => {
                const mockTags = [createMockTag()]
                prismaMock.tag.findMany
                    .mockResolvedValue(mockTags)

                const response = await supertest(App)
                    .get(tagsEndpoint)
                    .query({filter: 'popular'})

                expect(response.status).toBe(200)
            }
        )

        it(
            'should return 200 with pagination',
            async () => {
                const mockTags = [createMockTag()]
                prismaMock.tag.findMany
                    .mockResolvedValue(mockTags)

                const response = await supertest(App)
                    .get(tagsEndpoint)
                    .query({
                        limit: 5,
                        page: 1
                    })

                expect(response.status).toBe(200)
            }
        )

        it(
            'should return 404 when no tags found',
            async () => {
                prismaMock.tag.findMany
                    .mockResolvedValue(null as unknown as never[])

                const response = await supertest(App)
                    .get(tagsEndpoint)

                expect(response.status).toBe(404)
            }
        )
    })

    // ==================== GET SINGLE TAG ====================
    describe('GET /api/v1/forum/tags/:tagId', () => {
        it('should return 200 and single tag', async () => {
            const mockTag = createMockTag()
            prismaMock.tag.findUnique
                .mockResolvedValue(mockTag)

            const response = await supertest(App)
                .get('/api/v1/forum/tags/test-tag-id-123')

            expect(response.status).toBe(200)
            expect(response.body.data.id)
                .toBe('test-tag-id-123')
        })

        it(
            'should return 404 for non-existent tag',
            async () => {
                prismaMock.tag.findUnique
                    .mockResolvedValue(null)

                const response = await supertest(App)
                    .get('/api/v1/forum/tags/non-existent-id')

                expect(response.status).toBe(404)
                expect(response.body.error[0].statusType)
                    .toBe('Not Found')
            }
        )
    })
})
