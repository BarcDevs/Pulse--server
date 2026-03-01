// @ts-nocheck
import {newPostSchema} from '../../schemas/forum/newPostSchema'
import {newReplySchema} from '../../schemas/forum/newReplySchema'
import {postQuerySchema} from '../../schemas/forum/postQuerySchema'
import {tagQuerySchema} from '../../schemas/forum/tagQuerySchema'
import {updatePostSchema} from '../../schemas/forum/updatePostSchema'
import {updateReplySchema} from '../../schemas/forum/updateReplySchema'

describe('Forum Schemas', () => {
    // ==================== NEW POST SCHEMA ====================
    describe('newPostSchema', () => {
        it('should validate correct post data', () => {
            const result = newPostSchema.validate({
                title: 'Test Post',
                body: 'Post content',
                category: 'general',
                tags: [
                    'tag1',
                    'tag2'
                ]
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject missing title', () => {
            const result = newPostSchema.validate({
                body: 'Post content',
                category: 'general',
                tags: ['tag1']
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path)
                .toContain('title')
        })

        it('should reject missing body', () => {
            const result = newPostSchema.validate({
                title: 'Test Post',
                category: 'general',
                tags: ['tag1']
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path)
                .toContain('body')
        })

        it('should reject missing category', () => {
            const result = newPostSchema.validate({
                title: 'Test Post',
                body: 'Post content',
                tags: ['tag1']
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path)
                .toContain('category')
        })

        it('should reject missing tags', () => {
            const result = newPostSchema.validate({
                title: 'Test Post',
                body: 'Post content',
                category: 'general'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path)
                .toContain('tags')
        })

        it('should accept empty tags array', () => {
            const result = newPostSchema.validate({
                title: 'Test Post',
                body: 'Post content',
                category: 'general',
                tags: []
            })

            expect(result.error).toBeUndefined()
        })

        it('should accept multiple tags', () => {
            const result = newPostSchema.validate({
                title: 'Test Post',
                body: 'Post content',
                category: 'general',
                tags: [
                    'tag1',
                    'tag2',
                    'tag3',
                    'tag4'
                ]
            })

            expect(result.error).toBeUndefined()
            expect(result.value.tags).toHaveLength(4)
        })
    })

    // ==================== UPDATE POST SCHEMA ====================
    describe('updatePostSchema', () => {
        it('should validate with only title', () => {
            const result = updatePostSchema.validate({
                title: 'Updated Title'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with only body', () => {
            const result = updatePostSchema.validate({
                body: 'Updated body'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with only category', () => {
            const result = updatePostSchema.validate({
                category: 'health'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with only tags', () => {
            const result = updatePostSchema.validate({
                tags: [
                    'newTag1',
                    'newTag2'
                ]
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with vote object', () => {
            const result = updatePostSchema.validate({
                vote: {
                    userId: 'user-123',
                    vote: 'up'
                }
            })

            expect(result.error).toBeUndefined()
        })

        it('should accept vote down', () => {
            const result = updatePostSchema.validate({
                vote: {
                    userId: 'user-123',
                    vote: 'down'
                }
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject invalid vote value', () => {
            const result = updatePostSchema.validate({
                vote: {
                    userId: 'user-123',
                    vote: 'invalid'
                }
            })

            expect(result.error).toBeDefined()
        })

        it('should reject vote without userId', () => {
            const result = updatePostSchema.validate({
                vote: {
                    vote: 'up'
                }
            })

            expect(result.error).toBeDefined()
        })

        it('should reject vote without vote value', () => {
            const result = updatePostSchema.validate({
                vote: {
                    userId: 'user-123'
                }
            })

            expect(result.error).toBeDefined()
        })

        it('should validate empty object', () => {
            const result = updatePostSchema.validate({})

            expect(result.error).toBeUndefined()
        })

        it('should validate multiple fields', () => {
            const result = updatePostSchema.validate({
                title: 'Updated Title',
                body: 'Updated body',
                category: 'health',
                tags: ['tag1']
            })

            expect(result.error).toBeUndefined()
        })
    })

    // ==================== NEW REPLY SCHEMA ====================
    describe('newReplySchema', () => {
        it('should validate correct reply data', () => {
            const result = newReplySchema.validate({
                body: 'Reply content'
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject missing body', () => {
            const result = newReplySchema.validate({})

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path)
                .toContain('body')
        })

        it('should reject empty body string', () => {
            const result = newReplySchema.validate({
                body: ''
            })

            expect(result.error).toBeDefined()
        })
    })

    // ==================== UPDATE REPLY SCHEMA ====================
    describe('updateReplySchema', () => {
        it('should validate with body', () => {
            const result = updateReplySchema.validate({
                body: 'Updated reply'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with vote', () => {
            const result = updateReplySchema.validate({
                vote: {
                    userId: 'user-123',
                    vote: 'up'
                }
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate empty object', () => {
            const result = updateReplySchema.validate({})

            expect(result.error).toBeUndefined()
        })

        it('should reject invalid vote value', () => {
            const result = updateReplySchema.validate({
                vote: {
                    userId: 'user-123',
                    vote: 'invalid'
                }
            })

            expect(result.error).toBeDefined()
        })
    })

    // ==================== POST QUERY SCHEMA ====================
    describe('postQuerySchema', () => {
        it('should validate empty query', () => {
            const result = postQuerySchema.validate({})

            expect(result.error).toBeUndefined()
        })

        it('should validate with limit', () => {
            const result = postQuerySchema.validate({
                limit: 10
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with page', () => {
            const result = postQuerySchema.validate({
                page: 1
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with filter newest', () => {
            const result = postQuerySchema.validate({
                filter: 'newest'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with filter popular', () => {
            const result = postQuerySchema.validate({
                filter: 'popular'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with filter hot', () => {
            const result = postQuerySchema.validate({
                filter: 'hot'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with filter unanswered', () => {
            const result = postQuerySchema.validate({
                filter: 'unanswered'
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject invalid filter', () => {
            const result = postQuerySchema.validate({
                filter: 'invalid'
            })

            expect(result.error).toBeDefined()
        })

        it('should validate with search', () => {
            const result = postQuerySchema.validate({
                search: 'test query'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with tag', () => {
            const result = postQuerySchema.validate({
                tag: 'javascript'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with category', () => {
            const result = postQuerySchema.validate({
                category: 'health'
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject limit over 100', () => {
            const result = postQuerySchema.validate({
                limit: 200
            })

            expect(result.error).toBeDefined()
        })

        it('should validate with multiple query params', () => {
            const result = postQuerySchema.validate({
                limit: 10,
                page: 1,
                filter: 'newest',
                category: 'health',
                tag: 'wellness'
            })

            expect(result.error).toBeUndefined()
        })
    })

    // ==================== TAG QUERY SCHEMA ====================
    describe('tagQuerySchema', () => {
        it('should validate empty query', () => {
            const result = tagQuerySchema.validate({})

            expect(result.error).toBeUndefined()
        })

        it('should validate with limit', () => {
            const result = tagQuerySchema.validate({
                limit: 10
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with page', () => {
            const result = tagQuerySchema.validate({
                page: 1
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with filter popular', () => {
            const result = tagQuerySchema.validate({
                filter: 'popular'
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject invalid filter', () => {
            const result = tagQuerySchema.validate({
                filter: 'newest'
            })

            expect(result.error).toBeDefined()
        })

        it('should validate with search', () => {
            const result = tagQuerySchema.validate({
                search: 'java'
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject limit over 100', () => {
            const result = tagQuerySchema.validate({
                limit: 150
            })

            expect(result.error).toBeDefined()
        })

        it('should validate with multiple query params', () => {
            const result = tagQuerySchema.validate({
                limit: 20,
                page: 2,
                filter: 'popular',
                search: 'health'
            })

            expect(result.error).toBeUndefined()
        })
    })
})
