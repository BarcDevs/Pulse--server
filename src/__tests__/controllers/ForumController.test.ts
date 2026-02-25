// @ts-nocheck
import type { Request, Response } from 'express'

import * as forumController from '../../controllers/ForumController'
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
    createPost: jest.fn(),
    updatePost: jest.fn(),
    deletePost: jest.fn(),
    validateOwner: jest.fn(),
    createReply: jest.fn(),
    getReplies: jest.fn(),
    updateReply: jest.fn(),
    deleteReply: jest.fn(),
    getTags: jest.fn(),
    getTag: jest.fn()
}))

describe('ForumController', () => {
    // ==================== GET POSTS ====================
    describe('getPosts', () => {
        it('should return posts array', async () => {
            const mockPosts = [createMockPost(), createMockPost({ id: 'post-2' })]
            ;(forumService.getPosts as jest.Mock).mockResolvedValue(mockPosts)

            const req = createMockRequest({
                query: {}
            }) as Request

            const res = createMockResponse() as Response

            await forumController.getPosts(req, res)

            expect(forumService.getPosts).toHaveBeenCalled()
            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('posts found'),
                    data: mockPosts
                })
            )
        })

        it('should pass query parameters to service', async () => {
            const mockPosts = [createMockPost()]
            ;(forumService.getPosts as jest.Mock).mockResolvedValue(mockPosts)

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
        })

        it('should throw not found error when no posts', async () => {
            ;(forumService.getPosts as jest.Mock).mockResolvedValue(null)

            const req = createMockRequest({
                query: {}
            }) as Request

            const res = createMockResponse() as Response

            await expect(
                forumController.getPosts(req, res)
            ).rejects.toThrow()
        })
    })

    // ==================== CREATE POST ====================
    describe('createPost', () => {
        it('should create post for authenticated user', async () => {
            const mockPost = createMockPost()
            ;(forumService.createPost as jest.Mock).mockResolvedValue(mockPost)

            const req = createMockRequest({
                userId: 'test-user-id-123',
                body: {
                    title: 'New Post',
                    body: 'Post content',
                    category: 'general',
                    tags: ['tag1', 'tag2']
                }
            }) as Request

            const res = createMockResponse() as Response

            await forumController.createPost(req, res)

            expect(forumService.createPost).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'New Post',
                    body: 'Post content',
                    category: 'general',
                    tags: ['tag1', 'tag2'],
                    authorId: 'test-user-id-123'
                })
            )
            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Post created successfully'
                })
            )
        })

        it('should throw unauthorized error for unauthenticated user', async () => {
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
        })

        it('should throw validation error for missing title', async () => {
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
        })
    })

    // ==================== GET SINGLE POST ====================
    describe('getPost', () => {
        it('should return single post', async () => {
            const mockPost = createMockPost()
            ;(forumService.getPosts as jest.Mock).mockResolvedValue(mockPost)

            const req = createMockRequest({
                params: { postId: 'test-post-id-123' }
            }) as Request

            const res = createMockResponse() as Response

            await forumController.getPost(req, res)

            expect(forumService.getPosts).toHaveBeenCalledWith(
                undefined,
                'test-post-id-123'
            )
            expect(res.status).toHaveBeenCalledWith(200)
        })

        it('should throw not found error for non-existent post', async () => {
            ;(forumService.getPosts as jest.Mock).mockResolvedValue(null)

            const req = createMockRequest({
                params: { postId: 'non-existent' }
            }) as Request

            const res = createMockResponse() as Response

            await expect(
                forumController.getPost(req, res)
            ).rejects.toThrow()
        })
    })

    // ==================== UPDATE POST ====================
    describe('updatePost', () => {
        it('should update post for owner', async () => {
            const mockPost = createMockPost({ title: 'Updated Title' })
            ;(forumService.validateOwner as jest.Mock).mockResolvedValue(undefined)
            ;(forumService.updatePost as jest.Mock).mockResolvedValue(mockPost)

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
            expect(res.status).toHaveBeenCalledWith(200)
        })

        it('should throw unauthorized error for unauthenticated user', async () => {
            const req = createMockRequest({
                userId: undefined,
                params: { postId: 'test-post-id-123' },
                body: { title: 'Updated Title' }
            }) as Request

            const res = createMockResponse() as Response

            await expect(
                forumController.updatePost(req, res)
            ).rejects.toThrow()
        })
    })

    // ==================== DELETE POST ====================
    describe('deletePost', () => {
        it('should delete post for owner', async () => {
            ;(forumService.validateOwner as jest.Mock).mockResolvedValue(undefined)
            ;(forumService.deletePost as jest.Mock).mockResolvedValue(undefined)

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
            expect(res.status).toHaveBeenCalledWith(200)
        })

        it('should throw unauthorized error for unauthenticated user', async () => {
            const req = createMockRequest({
                userId: undefined,
                params: { postId: 'test-post-id-123' }
            }) as Request

            const res = createMockResponse() as Response

            await expect(
                forumController.deletePost(req, res)
            ).rejects.toThrow()
        })
    })

    // ==================== CREATE REPLY ====================
    describe('createReply', () => {
        it('should create reply for authenticated user', async () => {
            const mockReply = createMockReply()
            ;(forumService.createReply as jest.Mock).mockResolvedValue(mockReply)

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
            expect(res.status).toHaveBeenCalledWith(200)
        })

        it('should throw unauthorized error for unauthenticated user', async () => {
            const req = createMockRequest({
                userId: undefined,
                params: { postId: 'test-post-id-123' },
                body: { body: 'Reply content' }
            }) as Request

            const res = createMockResponse() as Response

            await expect(
                forumController.createReply(req, res)
            ).rejects.toThrow()
        })
    })

    // ==================== GET REPLIES ====================
    describe('getReplies', () => {
        it('should return replies for post', async () => {
            const mockReplies = [createMockReply(), createMockReply({ id: 'reply-2' })]
            ;(forumService.getReplies as jest.Mock).mockResolvedValue(mockReplies)

            const req = createMockRequest({
                params: { postId: 'test-post-id-123' }
            }) as Request

            const res = createMockResponse() as Response

            await forumController.getReplies(req, res)

            expect(forumService.getReplies).toHaveBeenCalledWith(
                'test-post-id-123'
            )
            expect(res.status).toHaveBeenCalledWith(200)
        })

        it('should throw not found error when no replies', async () => {
            ;(forumService.getReplies as jest.Mock).mockResolvedValue(null)

            const req = createMockRequest({
                params: { postId: 'test-post-id-123' }
            }) as Request

            const res = createMockResponse() as Response

            await expect(
                forumController.getReplies(req, res)
            ).rejects.toThrow()
        })
    })

    // ==================== UPDATE REPLY ====================
    describe('updateReply', () => {
        it('should update reply for owner', async () => {
            const mockReply = createMockReply({ body: 'Updated reply' })
            ;(forumService.validateOwner as jest.Mock).mockResolvedValue(undefined)
            ;(forumService.updateReply as jest.Mock).mockResolvedValue(mockReply)

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
            expect(res.status).toHaveBeenCalledWith(200)
        })
    })

    // ==================== DELETE REPLY ====================
    describe('deleteReply', () => {
        it('should delete reply for owner', async () => {
            ;(forumService.validateOwner as jest.Mock).mockResolvedValue(undefined)
            ;(forumService.deleteReply as jest.Mock).mockResolvedValue(undefined)

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
            expect(res.status).toHaveBeenCalledWith(200)
        })
    })

    // ==================== GET TAGS ====================
    describe('getTags', () => {
        it('should return tags array', async () => {
            const mockTags = [createMockTag(), createMockTag({ id: 'tag-2', name: 'tag2' })]
            ;(forumService.getTags as jest.Mock).mockResolvedValue(mockTags)

            const req = createMockRequest({
                query: {}
            }) as Request

            const res = createMockResponse() as Response

            await forumController.getTags(req, res)

            expect(forumService.getTags).toHaveBeenCalled()
            expect(res.status).toHaveBeenCalledWith(200)
        })

        it('should throw not found error when no tags', async () => {
            ;(forumService.getTags as jest.Mock).mockResolvedValue(null)

            const req = createMockRequest({
                query: {}
            }) as Request

            const res = createMockResponse() as Response

            await expect(
                forumController.getTags(req, res)
            ).rejects.toThrow()
        })
    })

    // ==================== GET SINGLE TAG ====================
    describe('getTag', () => {
        it('should return single tag', async () => {
            const mockTag = createMockTag()
            ;(forumService.getTag as jest.Mock).mockResolvedValue(mockTag)

            const req = createMockRequest({
                params: { tagId: 'test-tag-id-123' }
            }) as Request

            const res = createMockResponse() as Response

            await forumController.getTag(req, res)

            expect(forumService.getTag).toHaveBeenCalledWith(
                'test-tag-id-123'
            )
            expect(res.status).toHaveBeenCalledWith(200)
        })

        it('should throw not found error for non-existent tag', async () => {
            ;(forumService.getTag as jest.Mock).mockResolvedValue(null)

            const req = createMockRequest({
                params: { tagId: 'non-existent' }
            }) as Request

            const res = createMockResponse() as Response

            await expect(
                forumController.getTag(req, res)
            ).rejects.toThrow()
        })
    })
})
