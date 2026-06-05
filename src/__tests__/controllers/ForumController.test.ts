// @ts-nocheck
import type { Request, Response } from 'express'

import { FORUM_PAGINATION } from '../../constants/forum/pagination'
import * as forumController from '../../controllers/forumController'
import * as forumService from '../../services/forumService'
import {
    createMockPost,
    createMockReply,
    createMockRequest,
    createMockResponse,
    createMockTag
} from '../setup/testSetup'

jest.mock('../../services/forumService', () => ({
    getPosts: jest.fn(),
    getPost: jest.fn(),
    createPost: jest.fn(),
    updatePost: jest.fn(),
    deletePost: jest.fn(),
    validateOwner: jest.fn(),
    createReply: jest.fn(),
    getReplies: jest.fn(),
    updateReply: jest.fn(),
    deleteReply: jest.fn(),
    getTags: jest.fn(),
    getTag: jest.fn(),
    togglePostLike: jest.fn(),
    toggleReplyLike: jest.fn(),
    toggleSavePost: jest.fn(),
    getSavedPosts: jest.fn(),
    reportUnknownTag: jest.fn(),
    getUnknownTagAttempts: jest.fn(),
    getCategoryStats: jest.fn()
}))

describe('ForumController', () => {
    // ==================== GET POSTS ====================
    describe('getPosts', () => {
        it('should return posts array', async () => {
            const mockPosts = [
                createMockPost(),
                createMockPost({ id: 'post-2' })
            ]
            ;(forumService.getPosts as jest.Mock)
                .mockResolvedValue(mockPosts)

            const req = createMockRequest({
                query: {}
            }) as Request

            const res = createMockResponse() as Response

            await forumController.getPosts(req, res)

            expect(forumService.getPosts).toHaveBeenCalled()
            expect(res.status)
                .toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('posts found'),
                    data: mockPosts
                })
            )
        })

        it(
            'should pass query parameters to service',
            async () => {
                const mockPosts = [createMockPost()]
                ;(forumService.getPosts as jest.Mock)
                    .mockResolvedValue(mockPosts)

                const req = createMockRequest({
                    query: {
                        limit: '10',
                        page: '1',
                        filter: 'newest',
                        category: 'health'
                    }
                }) as Request

                const res = createMockResponse() as Response

                await forumController.getPosts(req, res)

                expect(forumService.getPosts).toHaveBeenCalledWith(
                    expect.objectContaining({
                        limit: 10,
                        page: 1,
                        filter: 'newest',
                        category: 'health'
                    })
                )
            }
        )

        it(
            'should throw not found error when no posts',
            async () => {
                ;(forumService.getPosts as jest.Mock)
                    .mockResolvedValue(null)

                const req = createMockRequest({
                    query: {}
                }) as Request

                const res = createMockResponse() as Response

                await expect(
                    forumController.getPosts(req, res)
                ).rejects.toThrow()
            }
        )
    })

    // ==================== CREATE POST ====================
    describe('createPost', () => {
        it(
            'should create post for authenticated user',
            async () => {
                const mockPost = createMockPost()
                ;(forumService.createPost as jest.Mock)
                    .mockResolvedValue(mockPost)

                const req = createMockRequest({
                    userId: 'test-user-id-123',
                    body: {
                        title: 'New Post',
                        body: 'Post content',
                        category: 'general',
                        tags: [
                            'tag1',
                            'tag2'
                        ]
                    }
                }) as Request

                const res = createMockResponse() as Response

                await forumController.createPost(req, res)

                expect(forumService.createPost).toHaveBeenCalledWith(
                    expect.objectContaining({
                        title: 'New Post',
                        body: 'Post content',
                        category: 'general',
                        tags: [
                            'tag1',
                            'tag2'
                        ],
                        authorId: 'test-user-id-123'
                    })
                )
                expect(res.status)
                    .toHaveBeenCalledWith(201)
                expect(res.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Post created successfully'
                    })
                )
            }
        )

        it(
            'should throw unauthorized error for unauthenticated user',
            async () => {
                const req = createMockRequest({
                    userId: undefined,
                    body: {
                        title: 'New Post',
                        body: 'Post content',
                        category: 'general',
                        tags: ['tag1']
                    }
                }) as Request

                const res = createMockResponse() as Response

                await expect(
                    forumController.createPost(req, res)
                ).rejects.toThrow()
            }
        )

        it(
            'should throw validation error for missing title',
            async () => {
                const req = createMockRequest({
                    userId: 'test-user-id-123',
                    body: {
                        body: 'Post content',
                        category: 'general',
                        tags: ['tag1']
                    }
                }) as Request

                const res = createMockResponse() as Response

                await expect(
                    forumController.createPost(req, res)
                ).rejects.toThrow()
            }
        )
    })

    // ==================== GET SINGLE POST ====================
    describe('getPost', () => {
        it('should return single post', async () => {
            const mockPost = createMockPost()
            ;(forumService.getPost as jest.Mock)
                .mockResolvedValue(mockPost)

            const req = createMockRequest({
                params: { postId: 'test-post-id-123' }
            }) as Request

            const res = createMockResponse() as Response

            await forumController.getPost(req, res)

            expect(forumService.getPost).toHaveBeenCalledWith(
                'test-post-id-123',
                FORUM_PAGINATION.DEFAULT_REPLY_LIMIT
            )
            expect(res.status)
                .toHaveBeenCalledWith(200)
        })

        it('should pass limit query to service', async () => {
            const mockPost = createMockPost()
            ;(forumService.getPost as jest.Mock)
                .mockResolvedValue(mockPost)

            const req = createMockRequest({
                params: { postId: 'test-post-id-123' },
                query: { limit: '5' }
            }) as Request

            const res = createMockResponse() as Response

            await forumController.getPost(req, res)

            expect(forumService.getPost).toHaveBeenCalledWith(
                'test-post-id-123',
                5
            )
        })

        it(
            'should throw not found error for non-existent post',
            async () => {
                ;(forumService.getPost as jest.Mock)
                    .mockResolvedValue(null)

                const req = createMockRequest({
                    params: { postId: 'non-existent' }
                }) as Request

                const res = createMockResponse() as Response

                await expect(
                    forumController.getPost(req, res)
                ).rejects.toThrow()
            }
        )
    })

    // ==================== UPDATE POST ====================
    describe('updatePost', () => {
        it('should update post for owner', async () => {
            const mockPost = createMockPost({
                title: 'Updated Title'
            })
            ;(forumService.validateOwner as jest.Mock)
                .mockResolvedValue(undefined)
            ;(forumService.updatePost as jest.Mock)
                .mockResolvedValue(mockPost)

            const req = createMockRequest({
                userId: 'test-user-id-123',
                params: { postId: 'test-post-id-123' },
                body: { title: 'Updated Title' }
            }) as Request

            const res = createMockResponse() as Response

            await forumController.updatePost(req, res)

            expect(forumService.validateOwner).toHaveBeenCalledWith(
                'post',
                'test-post-id-123',
                'test-user-id-123'
            )
            expect(forumService.updatePost).toHaveBeenCalledWith(
                'test-post-id-123',
                { title: 'Updated Title' }
            )
            expect(res.status)
                .toHaveBeenCalledWith(200)
        })

        it(
            'should throw unauthorized error for unauthenticated user',
            async () => {
                const req = createMockRequest({
                    userId: undefined,
                    params: { postId: 'test-post-id-123' },
                    body: { title: 'Updated Title' }
                }) as Request

                const res = createMockResponse() as Response

                await expect(
                    forumController.updatePost(req, res)
                ).rejects.toThrow()
            }
        )
    })

    // ==================== DELETE POST ====================
    describe('deletePost', () => {
        it('should delete post for owner', async () => {
            ;(forumService.validateOwner as jest.Mock)
                .mockResolvedValue(undefined)
            ;(forumService.deletePost as jest.Mock)
                .mockResolvedValue(undefined)

            const req = createMockRequest({
                userId: 'test-user-id-123',
                params: { postId: 'test-post-id-123' }
            }) as Request

            const res = createMockResponse() as Response

            await forumController.deletePost(req, res)

            expect(forumService.validateOwner).toHaveBeenCalledWith(
                'post',
                'test-post-id-123',
                'test-user-id-123'
            )
            expect(forumService.deletePost).toHaveBeenCalledWith(
                'test-post-id-123'
            )
            expect(res.status)
                .toHaveBeenCalledWith(200)
        })

        it(
            'should throw unauthorized error for unauthenticated user',
            async () => {
                const req = createMockRequest({
                    userId: undefined,
                    params: { postId: 'test-post-id-123' }
                }) as Request

                const res = createMockResponse() as Response

                await expect(
                    forumController.deletePost(req, res)
                ).rejects.toThrow()
            }
        )
    })

    // ==================== CREATE REPLY ====================
    describe('createReply', () => {
        it(
            'should create reply for authenticated user',
            async () => {
                const mockReply = createMockReply()
                ;(forumService.createReply as jest.Mock)
                    .mockResolvedValue(mockReply)

                const req = createMockRequest({
                    userId: 'test-user-id-123',
                    params: { postId: 'test-post-id-123' },
                    body: { body: 'Reply content' }
                }) as Request

                const res = createMockResponse() as Response

                await forumController.createReply(req, res)

                expect(forumService.createReply).toHaveBeenCalledWith(
                    expect.objectContaining({
                        body: 'Reply content',
                        postId: 'test-post-id-123',
                        authorId: 'test-user-id-123'
                    })
                )
                expect(res.status)
                    .toHaveBeenCalledWith(200)
            }
        )

        it(
            'should throw unauthorized error for unauthenticated user',
            async () => {
                const req = createMockRequest({
                    userId: undefined,
                    params: { postId: 'test-post-id-123' },
                    body: { body: 'Reply content' }
                }) as Request

                const res = createMockResponse() as Response

                await expect(
                    forumController.createReply(req, res)
                ).rejects.toThrow()
            }
        )
    })

    // ==================== GET REPLIES ====================
    describe('getReplies', () => {
        it('should return replies for post', async () => {
            const mockReplies = [
                createMockReply(),
                createMockReply({ id: 'reply-2' })
            ]
            ;(forumService.getReplies as jest.Mock)
                .mockResolvedValue(mockReplies)

            const req = createMockRequest({
                params: { postId: 'test-post-id-123' }
            }) as Request

            const res = createMockResponse() as Response

            await forumController.getReplies(req, res)

            expect(forumService.getReplies).toHaveBeenCalledWith(
                'test-post-id-123',
                FORUM_PAGINATION.DEFAULT_REPLY_LIMIT,
                undefined
            )
            expect(res.status)
                .toHaveBeenCalledWith(200)
        })

        it('should pass limit and page to service', async () => {
            const mockReplies = [createMockReply()]
            ;(forumService.getReplies as jest.Mock)
                .mockResolvedValue(mockReplies)

            const req = createMockRequest({
                params: { postId: 'test-post-id-123' },
                query: { limit: '10', page: '2' }
            }) as Request

            const res = createMockResponse() as Response

            await forumController.getReplies(req, res)

            expect(forumService.getReplies).toHaveBeenCalledWith(
                'test-post-id-123',
                10,
                2
            )
        })

        it('should return empty array when no replies', async () => {
            ;(forumService.getReplies as jest.Mock)
                .mockResolvedValue([])

            const req = createMockRequest({
                params: { postId: 'test-post-id-123' }
            }) as Request

            const res = createMockResponse() as Response

            await forumController.getReplies(req, res)

            expect(res.status).toHaveBeenCalledWith(200)
        })
    })

    // ==================== UPDATE REPLY ====================
    describe('updateReply', () => {
        it('should update reply for owner', async () => {
            const mockReply = createMockReply({
                body: 'Updated reply'
            })
            ;(forumService.validateOwner as jest.Mock)
                .mockResolvedValue(undefined)
            ;(forumService.updateReply as jest.Mock)
                .mockResolvedValue(mockReply)

            const req = createMockRequest({
                userId: 'test-user-id-123',
                params: {
                    postId: 'test-post-id-123',
                    replyId: 'test-reply-id-123'
                },
                body: { body: 'Updated reply' }
            }) as Request

            const res = createMockResponse() as Response

            await forumController.updateReply(req, res)

            expect(forumService.validateOwner).toHaveBeenCalledWith(
                'reply',
                'test-post-id-123',
                'test-user-id-123',
                'test-reply-id-123'
            )
            expect(forumService.updateReply).toHaveBeenCalledWith(
                'test-reply-id-123',
                'test-post-id-123',
                { body: 'Updated reply' }
            )
            expect(res.status)
                .toHaveBeenCalledWith(200)
        })
    })

    // ==================== DELETE REPLY ====================
    describe('deleteReply', () => {
        it('should delete reply for owner', async () => {
            ;(forumService.validateOwner as jest.Mock)
                .mockResolvedValue(undefined)
            ;(forumService.deleteReply as jest.Mock)
                .mockResolvedValue(undefined)

            const req = createMockRequest({
                userId: 'test-user-id-123',
                params: {
                    postId: 'test-post-id-123',
                    replyId: 'test-reply-id-123'
                }
            }) as Request

            const res = createMockResponse() as Response

            await forumController.deleteReply(req, res)

            expect(forumService.validateOwner).toHaveBeenCalledWith(
                'reply',
                'test-post-id-123',
                'test-user-id-123',
                'test-reply-id-123'
            )
            expect(forumService.deleteReply).toHaveBeenCalledWith(
                'test-reply-id-123',
                'test-post-id-123'
            )
            expect(res.status)
                .toHaveBeenCalledWith(200)
        })
    })

    // ==================== LIKE POST ====================
    describe('likePost', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest({
                params: { postId: 'test-post-id-123' }
            }) as Request
            const res = createMockResponse() as Response
            await expect(forumController.likePost(req, res)).rejects.toThrow()
        })

        it('toggles post like and returns liked=true', async () => {
            ;(forumService.togglePostLike as jest.Mock).mockResolvedValue({ liked: true })
            const req = createMockRequest({
                userId: 'test-user-id-123',
                params: { postId: 'test-post-id-123' }
            }) as Request
            const res = createMockResponse() as Response
            await forumController.likePost(req, res)
            expect(forumService.togglePostLike).toHaveBeenCalledWith('test-post-id-123', 'test-user-id-123')
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Post liked' }))
        })

        it('toggles post like and returns liked=false', async () => {
            ;(forumService.togglePostLike as jest.Mock).mockResolvedValue({ liked: false })
            const req = createMockRequest({
                userId: 'test-user-id-123',
                params: { postId: 'test-post-id-123' }
            }) as Request
            const res = createMockResponse() as Response
            await forumController.likePost(req, res)
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Post unliked' }))
        })

        it('propagates service error', async () => {
            ;(forumService.togglePostLike as jest.Mock).mockRejectedValue(new Error('DB error'))
            const req = createMockRequest({
                userId: 'test-user-id-123',
                params: { postId: 'test-post-id-123' }
            }) as Request
            const res = createMockResponse() as Response
            await expect(forumController.likePost(req, res)).rejects.toThrow('DB error')
        })
    })

    // ==================== LIKE REPLY ====================
    describe('likeReply', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest({
                params: { postId: 'test-post-id-123', replyId: 'test-reply-id-123' }
            }) as Request
            const res = createMockResponse() as Response
            await expect(forumController.likeReply(req, res)).rejects.toThrow()
        })

        it('toggles reply like and returns liked state', async () => {
            ;(forumService.toggleReplyLike as jest.Mock).mockResolvedValue({ liked: true })
            const req = createMockRequest({
                userId: 'test-user-id-123',
                params: { postId: 'test-post-id-123', replyId: 'test-reply-id-123' }
            }) as Request
            const res = createMockResponse() as Response
            await forumController.likeReply(req, res)
            expect(forumService.toggleReplyLike).toHaveBeenCalledWith('test-post-id-123', 'test-reply-id-123', 'test-user-id-123')
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Reply liked' }))
        })

        it('propagates service error', async () => {
            ;(forumService.toggleReplyLike as jest.Mock).mockRejectedValue(new Error('DB error'))
            const req = createMockRequest({
                userId: 'test-user-id-123',
                params: { postId: 'test-post-id-123', replyId: 'test-reply-id-123' }
            }) as Request
            const res = createMockResponse() as Response
            await expect(forumController.likeReply(req, res)).rejects.toThrow('DB error')
        })
    })

    // ==================== SAVE POST ====================
    describe('savePost', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest({
                params: { postId: 'test-post-id-123' }
            }) as Request
            const res = createMockResponse() as Response
            await expect(forumController.savePost(req, res)).rejects.toThrow()
        })

        it('toggles save and returns saved=true', async () => {
            ;(forumService.toggleSavePost as jest.Mock).mockResolvedValue({ saved: true })
            const req = createMockRequest({
                userId: 'test-user-id-123',
                params: { postId: 'test-post-id-123' }
            }) as Request
            const res = createMockResponse() as Response
            await forumController.savePost(req, res)
            expect(forumService.toggleSavePost).toHaveBeenCalledWith('test-post-id-123', 'test-user-id-123')
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Post saved' }))
        })

        it('toggles save and returns saved=false', async () => {
            ;(forumService.toggleSavePost as jest.Mock).mockResolvedValue({ saved: false })
            const req = createMockRequest({
                userId: 'test-user-id-123',
                params: { postId: 'test-post-id-123' }
            }) as Request
            const res = createMockResponse() as Response
            await forumController.savePost(req, res)
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Post unsaved' }))
        })

        it('propagates service error', async () => {
            ;(forumService.toggleSavePost as jest.Mock).mockRejectedValue(new Error('DB error'))
            const req = createMockRequest({
                userId: 'test-user-id-123',
                params: { postId: 'test-post-id-123' }
            }) as Request
            const res = createMockResponse() as Response
            await expect(forumController.savePost(req, res)).rejects.toThrow('DB error')
        })
    })

    // ==================== GET SAVED POSTS ====================
    describe('getSavedPosts', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest() as Request
            const res = createMockResponse() as Response
            await expect(forumController.getSavedPosts(req, res)).rejects.toThrow()
        })

        it('returns saved posts for user', async () => {
            const mockPosts = [createMockPost()]
            ;(forumService.getSavedPosts as jest.Mock).mockResolvedValue(mockPosts)
            const req = createMockRequest({ userId: 'test-user-id-123' }) as Request
            const res = createMockResponse() as Response
            await forumController.getSavedPosts(req, res)
            expect(forumService.getSavedPosts).toHaveBeenCalledWith('test-user-id-123', expect.anything())
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockPosts }))
        })

        it('returns empty array when no saved posts', async () => {
            ;(forumService.getSavedPosts as jest.Mock).mockResolvedValue(null)
            const req = createMockRequest({ userId: 'test-user-id-123' }) as Request
            const res = createMockResponse() as Response
            await forumController.getSavedPosts(req, res)
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [] }))
        })
    })

    // ==================== REPORT UNKNOWN TAG ====================
    describe('reportUnknownTag', () => {
        it('calls service with tagName', async () => {
            ;(forumService.reportUnknownTag as jest.Mock).mockResolvedValue(undefined)
            const req = createMockRequest({ body: { tagName: 'unknown-tag' } }) as Request
            const res = createMockResponse() as Response
            await forumController.reportUnknownTag(req, res)
            expect(forumService.reportUnknownTag).toHaveBeenCalledWith('unknown-tag')
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Tag attempt recorded' }))
        })

        it('throws validation error when tagName missing', async () => {
            const req = createMockRequest({ body: {} }) as Request
            const res = createMockResponse() as Response
            await expect(forumController.reportUnknownTag(req, res)).rejects.toThrow()
        })

        it('propagates service error', async () => {
            ;(forumService.reportUnknownTag as jest.Mock).mockRejectedValue(new Error('DB error'))
            const req = createMockRequest({ body: { tagName: 'unknown-tag' } }) as Request
            const res = createMockResponse() as Response
            await expect(forumController.reportUnknownTag(req, res)).rejects.toThrow('DB error')
        })
    })

    // ==================== GET UNKNOWN TAG ATTEMPTS ====================
    describe('getUnknownTagAttempts', () => {
        it('returns list of unknown tag attempts', async () => {
            const attempts = [{ tagName: 'foo', count: 3 }, { tagName: 'bar', count: 1 }]
            ;(forumService.getUnknownTagAttempts as jest.Mock).mockResolvedValue(attempts)
            const req = createMockRequest() as Request
            const res = createMockResponse() as Response
            await forumController.getUnknownTagAttempts(req, res)
            expect(forumService.getUnknownTagAttempts).toHaveBeenCalled()
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: attempts }))
        })

        it('propagates service error', async () => {
            ;(forumService.getUnknownTagAttempts as jest.Mock).mockRejectedValue(new Error('DB error'))
            const req = createMockRequest() as Request
            const res = createMockResponse() as Response
            await expect(forumController.getUnknownTagAttempts(req, res)).rejects.toThrow('DB error')
        })
    })

    // ==================== GET CATEGORY STATS ====================
    describe('getCategoryStats', () => {
        it('returns category stats', async () => {
            const stats = [{ category: 'health', count: 5 }]
            ;(forumService.getCategoryStats as jest.Mock).mockResolvedValue(stats)
            const req = createMockRequest() as Request
            const res = createMockResponse() as Response
            await forumController.getCategoryStats(req, res)
            expect(forumService.getCategoryStats).toHaveBeenCalled()
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: stats }))
        })

        it('propagates service error', async () => {
            ;(forumService.getCategoryStats as jest.Mock).mockRejectedValue(new Error('DB error'))
            const req = createMockRequest() as Request
            const res = createMockResponse() as Response
            await expect(forumController.getCategoryStats(req, res)).rejects.toThrow('DB error')
        })
    })

    // ==================== validateOwner throw paths ====================
    describe('validateOwner error propagation', () => {
        it('updatePost throws when validateOwner rejects', async () => {
            ;(forumService.validateOwner as jest.Mock).mockRejectedValue(new Error('not owner'))
            const req = createMockRequest({
                userId: 'test-user-id-123',
                params: { postId: 'test-post-id-123' },
                body: { title: 'Updated' }
            }) as Request
            const res = createMockResponse() as Response
            await expect(forumController.updatePost(req, res)).rejects.toThrow('not owner')
        })

        it('updateReply throws when validateOwner rejects', async () => {
            ;(forumService.validateOwner as jest.Mock).mockRejectedValue(new Error('not owner'))
            const req = createMockRequest({
                userId: 'test-user-id-123',
                params: { postId: 'test-post-id-123', replyId: 'test-reply-id-123' },
                body: { body: 'Updated' }
            }) as Request
            const res = createMockResponse() as Response
            await expect(forumController.updateReply(req, res)).rejects.toThrow('not owner')
        })

        it('deleteReply throws when validateOwner rejects', async () => {
            ;(forumService.validateOwner as jest.Mock).mockRejectedValue(new Error('not owner'))
            const req = createMockRequest({
                userId: 'test-user-id-123',
                params: { postId: 'test-post-id-123', replyId: 'test-reply-id-123' }
            }) as Request
            const res = createMockResponse() as Response
            await expect(forumController.deleteReply(req, res)).rejects.toThrow('not owner')
        })
    })

    // ==================== GET TAGS ====================
    describe('getTags', () => {
        it('should return tags array', async () => {
            const mockTags = [
                createMockTag(),
                createMockTag({ id: 'tag-2', label: { en: 'tag2', he: 'תג2' } })
            ]
            ;(forumService.getTags as jest.Mock)
                .mockResolvedValue(mockTags)

            const req = createMockRequest({
                query: {}
            }) as Request

            const res = createMockResponse() as Response

            await forumController.getTags(req, res)

            expect(forumService.getTags).toHaveBeenCalled()
            expect(res.status)
                .toHaveBeenCalledWith(200)
        })

        it(
            'should throw not found error when no tags',
            async () => {
                ;(forumService.getTags as jest.Mock)
                    .mockResolvedValue(null)

                const req = createMockRequest({
                    query: {}
                }) as Request

                const res = createMockResponse() as Response

                await expect(
                    forumController.getTags(req, res)
                ).rejects.toThrow()
            }
        )
    })

    // ==================== GET SINGLE TAG ====================
    describe('getTag', () => {
        it('should return single tag', async () => {
            const mockTag = createMockTag()
            ;(forumService.getTag as jest.Mock)
                .mockResolvedValue(mockTag)

            const req = createMockRequest({
                params: { tagId: 'test-tag-id-123' }
            }) as Request

            const res = createMockResponse() as Response

            await forumController.getTag(req, res)

            expect(forumService.getTag).toHaveBeenCalledWith(
                'test-tag-id-123'
            )
            expect(res.status)
                .toHaveBeenCalledWith(200)
        })

        it(
            'should throw not found error for non-existent tag',
            async () => {
                ;(forumService.getTag as jest.Mock)
                    .mockResolvedValue(null)

                const req = createMockRequest({
                    params: { tagId: 'non-existent' }
                }) as Request

                const res = createMockResponse() as Response

                await expect(
                    forumController.getTag(req, res)
                ).rejects.toThrow()
            }
        )
    })
})
