// @ts-nocheck
import { newPostSchema } from '../../schemas/forum/newPostSchema'
import { newReplySchema } from '../../schemas/forum/newReplySchema'
import { postQuerySchema } from '../../schemas/forum/postQuerySchema'
import { tagQuerySchema } from '../../schemas/forum/tagQuerySchema'
import { updatePostSchema } from '../../schemas/forum/updatePostSchema'
import { updateReplySchema } from '../../schemas/forum/updateReplySchema'

describe('Forum Schemas', () => {
    // ==================== NEW POST SCHEMA ====================
    describe('newPostSchema', () => {
        it('should validate correct post data', () => {
            const result = newPostSchema.safeParse({
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
            const result = newPostSchema.safeParse({
                body: 'Post content',
                category: 'general',
                tags: ['tag1']
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('title')
        })

        it('should reject missing body', () => {
            const result = newPostSchema.safeParse({
                title: 'Test Post',
                category: 'general',
                tags: ['tag1']
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('body')
        })

        it('should reject missing category', () => {
            const result = newPostSchema.safeParse({
                title: 'Test Post',
                body: 'Post content',
                tags: ['tag1']
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('category')
        })

        it('should accept missing tags', () => {
            const result = newPostSchema.safeParse({
                title: 'Test Post',
                body: 'Post content',
                category: 'general'
            })

            expect(result.error).toBeUndefined()
        })

        it('should accept empty tags array', () => {
            const result = newPostSchema.safeParse({
                title: 'Test Post',
                body: 'Post content',
                category: 'general',
                tags: []
            })

            expect(result.error).toBeUndefined()
        })

        it('should accept multiple tags', () => {
            const result = newPostSchema.safeParse({
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
            expect(result.data.tags).toHaveLength(4)
        })
    })

    // ==================== UPDATE POST SCHEMA ====================
    describe('updatePostSchema', () => {
        it('should validate with only title', () => {
            const result = updatePostSchema.safeParse({
                title: 'Updated Title'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with only body', () => {
            const result = updatePostSchema.safeParse({
                body: 'Updated body'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with only category', () => {
            const result = updatePostSchema.safeParse({
                category: 'health'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with only tags', () => {
            const result = updatePostSchema.safeParse({
                tags: [
                    'newTag1',
                    'newTag2'
                ]
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate empty object', () => {
            const result = updatePostSchema.safeParse({})

            expect(result.error).toBeUndefined()
        })

        it('should validate multiple fields', () => {
            const result = updatePostSchema.safeParse({
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
            const result = newReplySchema.safeParse({
                body: 'Reply content'
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject missing body', () => {
            const result = newReplySchema.safeParse({})

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('body')
        })

        it('should reject empty body string', () => {
            const result = newReplySchema.safeParse({
                body: ''
            })

            expect(result.error).toBeDefined()
        })
    })

    // ==================== UPDATE REPLY SCHEMA ====================
    describe('updateReplySchema', () => {
        it('should validate with body', () => {
            const result = updateReplySchema.safeParse({
                body: 'Updated reply'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate empty object', () => {
            const result = updateReplySchema.safeParse({})

            expect(result.error).toBeUndefined()
        })
    })

    // ==================== POST QUERY SCHEMA ====================
    describe('postQuerySchema', () => {
        it('should validate empty query', () => {
            const result = postQuerySchema.safeParse({})

            expect(result.error).toBeUndefined()
        })

        it('should validate with limit', () => {
            const result = postQuerySchema.safeParse({
                limit: 10
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with page', () => {
            const result = postQuerySchema.safeParse({
                page: 1
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with filter newest', () => {
            const result = postQuerySchema.safeParse({
                filter: 'newest'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with filter popular', () => {
            const result = postQuerySchema.safeParse({
                filter: 'popular'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with filter hot', () => {
            const result = postQuerySchema.safeParse({
                filter: 'hot'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with filter unanswered', () => {
            const result = postQuerySchema.safeParse({
                filter: 'unanswered'
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject invalid filter', () => {
            const result = postQuerySchema.safeParse({
                filter: 'invalid'
            })

            expect(result.error).toBeDefined()
        })

        it('should validate with search', () => {
            const result = postQuerySchema.safeParse({
                search: 'test query'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with tag', () => {
            const result = postQuerySchema.safeParse({
                tag: 'javascript'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with category', () => {
            const result = postQuerySchema.safeParse({
                category: 'health'
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject limit over 100', () => {
            const result = postQuerySchema.safeParse({
                limit: 200
            })

            expect(result.error).toBeDefined()
        })

        it('should validate with multiple query params', () => {
            const result = postQuerySchema.safeParse({
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
            const result = tagQuerySchema.safeParse({})

            expect(result.error).toBeUndefined()
        })

        it('should validate with limit', () => {
            const result = tagQuerySchema.safeParse({
                limit: 10
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with page', () => {
            const result = tagQuerySchema.safeParse({
                page: 1
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with filter popular', () => {
            const result = tagQuerySchema.safeParse({
                filter: 'popular'
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject invalid filter', () => {
            const result = tagQuerySchema.safeParse({
                filter: 'newest'
            })

            expect(result.error).toBeDefined()
        })

        it('should validate with search', () => {
            const result = tagQuerySchema.safeParse({
                search: 'java'
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject limit over 100', () => {
            const result = tagQuerySchema.safeParse({
                limit: 150
            })

            expect(result.error).toBeDefined()
        })

        it('should validate with multiple query params', () => {
            const result = tagQuerySchema.safeParse({
                limit: 20,
                page: 2,
                filter: 'popular',
                search: 'health'
            })

            expect(result.error).toBeUndefined()
        })
    })
})
