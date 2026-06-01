// @ts-nocheck
import {
    createPost,
    createReply,
    deletePost,
    deleteReply,
    getPost,
    getPosts,
    getPostsCount,
    getReplies,
    getTag,
    getTags,
    updatePost,
    updateReply,
    validateOwner
} from '../../services/forumService'
import { prismaMock } from '../setup/jestSetup'
import {
    createMockPost,
    createMockReply,
    createMockTag,
    createRawMockTag
} from '../setup/testSetup'

describe('Forum Service', () => {
    // ==================== validateOwner ====================
    describe('validateOwner', () => {
        it(
            'should not throw for valid post owner',
            async () => {
                const mockPost = createMockPost({
                    authorId: 'profile-123'
                })
                prismaMock.profile.findUnique
                    .mockResolvedValue({
                        id: 'profile-123',
                        userId: 'user-123'
                    } as any)
                prismaMock.post.findUnique
                    .mockResolvedValue(mockPost)

                await expect(
                    validateOwner('post', 'post-id', 'user-123')
                ).resolves.not.toThrow()
            }
        )

        it(
            'should throw error for non-owner of post',
            async () => {
                const mockPost = createMockPost({
                    authorId: 'different-profile'
                })
                prismaMock.profile.findUnique
                    .mockResolvedValue({
                        id: 'profile-123',
                        userId: 'user-123'
                    } as any)
                prismaMock.post.findUnique
                    .mockResolvedValue(mockPost)

                await expect(
                    validateOwner('post', 'post-id', 'user-123')
                ).rejects.toThrow('you are not the author of this post!')
            }
        )

        it(
            'should throw error for non-existent post',
            async () => {
                prismaMock.profile.findUnique
                    .mockResolvedValue({
                        id: 'profile-123',
                        userId: 'user-123'
                    } as any)
                prismaMock.post.findUnique
                    .mockResolvedValue(null)

                await expect(
                    validateOwner('post', 'post-id', 'user-123')
                ).rejects.toThrow('not found')
            }
        )

        it(
            'should not throw for valid reply owner',
            async () => {
                const mockReply = createMockReply({
                    authorId: 'profile-123'
                })
                prismaMock.profile.findUnique
                    .mockResolvedValue({
                        id: 'profile-123',
                        userId: 'user-123'
                    } as any)
                prismaMock.reply.findUnique
                    .mockResolvedValue(mockReply)

                await expect(
                    validateOwner(
                        'reply',
                        'post-id',
                        'user-123',
                        'reply-id'
                    )
                ).resolves.not.toThrow()
            }
        )

        it(
            'should throw error for non-owner of reply',
            async () => {
                const mockReply = createMockReply({
                    authorId: 'different-profile'
                })
                prismaMock.profile.findUnique
                    .mockResolvedValue({
                        id: 'profile-123',
                        userId: 'user-123'
                    } as any)
                prismaMock.reply.findUnique
                    .mockResolvedValue(mockReply)

                await expect(
                    validateOwner(
                        'reply',
                        'post-id',
                        'user-123',
                        'reply-id'
                    )
                )
                    .rejects
                    .toThrow(
                        'you are not the author of this reply!'
                    )
            }
        )

        it(
            'should throw error for missing replyId when validating reply',
            async () => {
                prismaMock.profile.findUnique
                    .mockResolvedValue({
                        id: 'profile-123',
                        userId: 'user-123'
                    } as any)

                await expect(
                    validateOwner('reply', 'post-id', 'user-123')
                )
                    .rejects
                    .toThrow('replyId is missing')
            }
        )
    })

    // ==================== getPosts ====================
    describe('getPosts', () => {
        it('should return posts array', async () => {
            const mockPosts = [
                createMockPost(),
                createMockPost({ id: 'post-2' })
            ]
            prismaMock.post.findMany
                .mockResolvedValue(mockPosts)

            const result = await getPosts()

            expect(result).toEqual(mockPosts)
            expect(prismaMock.post.findMany)
                .toHaveBeenCalled()
        })

        it(
            'should return single post when id provided',
            async () => {
                const mockPost = createMockPost()
                prismaMock.post.findUnique
                    .mockResolvedValue(mockPost)

                const result = await getPosts(
                    undefined,
                    'post-id'
                )

                expect(result).toEqual(mockPost)
                expect(prismaMock.post.findUnique)
                    .toHaveBeenCalled()
            }
        )

        it('should pass query parameters', async () => {
            const mockPosts = [createMockPost()]
            prismaMock.post.findMany
                .mockResolvedValue(mockPosts)

            await getPosts({
                limit: 5,
                page: 1,
                filter: 'newest'
            })

            expect(prismaMock.post.findMany)
                .toHaveBeenCalled()
        })
    })

    // ==================== getPostsCount ====================
    describe('getPostsCount', () => {
        it('should return count object', async () => {
            prismaMock.post.count.mockResolvedValue(10)

            const result = await getPostsCount()

            expect(result).toEqual({ count: 10 })
        })

        it('should filter by query', async () => {
            prismaMock.post.count.mockResolvedValue(5)

            const result = await getPostsCount({
                category: 'health'
            })

            expect(result).toEqual({ count: 5 })
        })
    })

    // ==================== createPost ====================
    describe('createPost', () => {
        it('should create post with tags', async () => {
            const mockPost = createMockPost()
            const mockProfile = {
                id: 'profile-id',
                userId: 'user-id'
            }
            prismaMock.profile.findUnique
                .mockResolvedValue(mockProfile as never)
            prismaMock.tag.findMany
                .mockResolvedValue([])
            prismaMock.post.create
                .mockResolvedValue(mockPost)

            const result = await createPost({
                title: 'New Post',
                body: 'Post body',
                category: 'general',
                authorId: 'user-id',
                tags: [
                    'tag1',
                    'tag2'
                ]
            })

            expect(result).toEqual(mockPost)
            expect(prismaMock.post.create)
                .toHaveBeenCalled()
        })
    })

    // ==================== updatePost ====================
    describe('updatePost', () => {
        it('should update post', async () => {
            const mockPost = createMockPost({
                title: 'Updated Title'
            })
            prismaMock.tag.findMany.mockResolvedValue([])
            prismaMock.post.update
                .mockResolvedValue(mockPost)

            const result = await updatePost(
                'post-id',
                { title: 'Updated Title' }
            )

            expect(result.title).toBe('Updated Title')
        })

        it('should handle tag changes', async () => {
            const mockPost = createMockPost()
            const existingTags = [
                createMockTag({
                    label: {
                        en: 'old-tag',
                        he: 'תג-ישן'
                    }
                })
            ]
            prismaMock.tag.findMany
                .mockResolvedValue(existingTags)
            prismaMock.post.update
                .mockResolvedValue(mockPost)

            await updatePost('post-id', { tags: ['new-tag'] })

            expect(prismaMock.post.update)
                .toHaveBeenCalled()
        })
    })

    // ==================== deletePost ====================
    describe('deletePost', () => {
        it('should delete post', async () => {
            const mockPost = createMockPost()
            prismaMock.post.delete
                .mockResolvedValue(mockPost)

            await deletePost('post-id')

            expect(prismaMock.post.delete).toHaveBeenCalledWith({
                where: { id: 'post-id' }
            })
        })
    })

    // ==================== getTags ====================
    describe('getTags', () => {
        it('should return tags array', async () => {
            const fixedDate = new Date('2026-01-01')
            const rawTags = [
                createRawMockTag({ createdAt: fixedDate }),
                createRawMockTag({
                    id: 'tag-2',
                    name: 'tag2',
                    nameHe: 'תג 2',
                    createdAt: fixedDate
                })
            ]
            prismaMock.tag.findMany
                .mockResolvedValue(rawTags)

            const result = await getTags({})

            expect(result).toEqual([
                createMockTag({ createdAt: fixedDate }),
                createMockTag({
                    id: 'tag-2',
                    label: {
                        en: 'tag2',
                        he: 'תג 2'
                    },
                    createdAt: fixedDate
                })
            ])
        })

        it(
            'label.he is null when nameHe missing (client falls back to en)',
            async () => {
                prismaMock.tag.findMany
                    .mockResolvedValue([createRawMockTag({
                        nameHe: null as unknown as string
                    })])

                const result = await getTags({})

                expect(result[0].label.he).toBeNull()
            })

        it(
            'should return popular tags when filter is popular',
            async () => {
                const fixedDate = new Date('2026-01-01')
                prismaMock.tag.findMany
                    .mockResolvedValue([createRawMockTag({
                        createdAt: fixedDate
                    })])

                const result = await getTags({
                    filter: 'popular',
                    limit: 10
                })

                expect(result).toEqual([createMockTag({
                    createdAt: fixedDate
                })])
            }
        )

        it('should filter by search', async () => {
            const fixedDate = new Date('2026-01-01')
            prismaMock.tag.findMany

                .mockResolvedValue([createRawMockTag({
                    name: 'javascript',
                    nameHe: `ג'אווהסקריפט`,
                    createdAt: fixedDate
                })])

            const result = await getTags({ search: 'java' })

            expect(result).toEqual([createMockTag({
                label: {
                    en: 'javascript',
                    he: `ג'אווהסקריפט`
                }, createdAt: fixedDate
            })])
        })
    })

    // ==================== getTag ====================
    describe('getTag', () => {
        it('should return single tag', async () => {
            const fixedDate = new Date('2026-01-01')
            prismaMock.tag.findUnique
                .mockResolvedValue(createRawMockTag({
                    createdAt: fixedDate
                }))

            const result = await getTag('tag-id')

            expect(result).toEqual(createMockTag({
                createdAt: fixedDate
            }))
        })

        it(
            'should return null for non-existent tag',
            async () => {
                prismaMock.tag.findUnique
                    .mockResolvedValue(null)

                const result = await getTag('non-existent')

                expect(result).toBeNull()
            }
        )
    })

    // ==================== createReply ====================
    describe('createReply', () => {
        it('should create reply', async () => {
            const mockPost = createMockPost()
            const mockReply = createMockReply()
            const mockProfile = {
                id: 'profile-id',
                userId: 'user-id'
            }
            prismaMock.post.findUnique
                .mockResolvedValue(mockPost)
            prismaMock.profile.findUnique
                .mockResolvedValue(mockProfile as never)
            prismaMock.reply.create
                .mockResolvedValue(mockReply)

            const result = await createReply({
                body: 'Reply content',
                authorId: 'user-id',
                postId: 'post-id'
            })

            expect(result).toEqual(mockReply)
            expect(prismaMock.reply.create)
                .toHaveBeenCalled()
        })

        it(
            'should throw NotFoundError when post not found',
            async () => {
                prismaMock.post.findUnique
                    .mockResolvedValue(null)

                await expect(
                    createReply({
                        body: 'Reply content',
                        authorId: 'user-id',
                        postId: 'non-existent'
                    })
                ).rejects.toThrow('Post not found')
            }
        )
    })

    // ==================== getPost ====================
    describe('getPost', () => {
        it('should return post by id', async () => {
            const mockPost = createMockPost()
            prismaMock.post.findUnique
                .mockResolvedValue(mockPost)

            const result = await getPost('post-id')

            expect(result).toBeDefined()
        })

        it('should return null for non-existent post', async () => {
            prismaMock.post.findUnique
                .mockResolvedValue(null)

            const result = await getPost('non-existent')

            expect(result).toBeNull()
        })
    })

    // ==================== getReplies ====================
    describe('getReplies', () => {
        it('should return replies for post', async () => {
            const mockPost = createMockPost()
            const mockReplies = [
                createMockReply(),
                createMockReply({ id: 'reply-2' })
            ]
            prismaMock.post.findUnique
                .mockResolvedValue(mockPost)
            prismaMock.reply.findMany
                .mockResolvedValue(mockReplies)

            const result = await getReplies('post-id')

            expect(result).toEqual(mockReplies)
        })

        it('should pass limit and page to model', async () => {
            const mockPost = createMockPost()
            const mockReplies = [createMockReply()]
            prismaMock.post.findUnique
                .mockResolvedValue(mockPost)
            prismaMock.reply.findMany
                .mockResolvedValue(mockReplies)

            const result = await getReplies('post-id', 10, 2)

            expect(result).toEqual(mockReplies)
            expect(prismaMock.reply.findMany)
                .toHaveBeenCalledWith(
                    expect.objectContaining({
                        take: 10,
                        skip: 10
                    })
                )
        })

        it(
            'should throw NotFoundError when post not found',
            async () => {
                prismaMock.post.findUnique
                    .mockResolvedValue(null)

                await expect(
                    getReplies('non-existent')
                ).rejects.toThrow('Post not found')
            }
        )
    })

    // ==================== updateReply ====================
    describe('updateReply', () => {
        it('should update reply', async () => {
            const mockReply = createMockReply({
                body: 'Updated reply'
            })
            prismaMock.reply.update
                .mockResolvedValue(mockReply)

            const result = await updateReply(
                'reply-id',
                'post-id',
                { body: 'Updated reply' }
            )

            expect(result.body).toBe('Updated reply')
        })
    })

    // ==================== deleteReply ====================
    describe('deleteReply', () => {
        it('should delete reply', async () => {
            const mockReply = createMockReply()
            prismaMock.reply.delete
                .mockResolvedValue(mockReply)

            await deleteReply('reply-id', 'post-id')

            expect(prismaMock.reply.delete).toHaveBeenCalledWith({
                where: {
                    id: 'reply-id',
                    postId: 'post-id'
                }
            })
        })
    })
})
