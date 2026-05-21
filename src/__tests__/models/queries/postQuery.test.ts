// @ts-nocheck
import { postQueryBuilder } from '../../../models/queries/postQuery'

describe('postQueryBuilder', () => {
    describe('search', () => {
        it('omits OR clause when no search param', () => {
            const result = postQueryBuilder()
            expect(result.where).not.toHaveProperty('OR')
        })

        it('omits OR clause for whitespace-only search', () => {
            const result = postQueryBuilder({ search: '   ' })
            expect(result.where).not.toHaveProperty('OR')
        })

        it('builds OR clause with all searchable fields', () => {
            const result = postQueryBuilder({ search: 'diabetes' })
            expect(result.where.OR).toBeDefined()
            expect(result.where.OR).toHaveLength(7)
        })

        it('searches post title', () => {
            const result = postQueryBuilder({ search: 'diabetes' })
            expect(result.where.OR).toContainEqual({
                title: { contains: 'diabetes', mode: 'insensitive' }
            })
        })

        it('searches post body', () => {
            const result = postQueryBuilder({ search: 'diabetes' })
            expect(result.where.OR).toContainEqual({
                body: { contains: 'diabetes', mode: 'insensitive' }
            })
        })

        it('searches tag names', () => {
            const result = postQueryBuilder({ search: 'diabetes' })
            expect(result.where.OR).toContainEqual({
                tags: { some: { name: { contains: 'diabetes', mode: 'insensitive' } } }
            })
        })

        it('searches category', () => {
            const result = postQueryBuilder({ search: 'health' })
            expect(result.where.OR).toContainEqual({
                category: { contains: 'health', mode: 'insensitive' }
            })
        })

        it('searches author username', () => {
            const result = postQueryBuilder({ search: 'john' })
            expect(result.where.OR).toContainEqual({
                author: { user: { username: { contains: 'john', mode: 'insensitive' } } }
            })
        })

        it('searches author firstName', () => {
            const result = postQueryBuilder({ search: 'john' })
            expect(result.where.OR).toContainEqual({
                author: { user: { firstName: { contains: 'john', mode: 'insensitive' } } }
            })
        })

        it('searches author lastName', () => {
            const result = postQueryBuilder({ search: 'doe' })
            expect(result.where.OR).toContainEqual({
                author: { user: { lastName: { contains: 'doe', mode: 'insensitive' } } }
            })
        })

        it('trims search text before building query', () => {
            const result = postQueryBuilder({ search: '  health  ' })
            expect(result.where.OR).toContainEqual({
                title: { contains: 'health', mode: 'insensitive' }
            })
        })

        it('preserves tag filter alongside search', () => {
            const result = postQueryBuilder({ search: 'diabetes', tag: 'nutrition' })
            expect(result.where.OR).toBeDefined()
            expect(result.where.tags).toEqual({
                some: { slug: 'nutrition' }
            })
        })

        it('preserves category filter alongside search', () => {
            const result = postQueryBuilder({ search: 'diabetes', category: 'health' })
            expect(result.where.OR).toBeDefined()
            expect(result.where.category).toBe('health')
        })
    })
})
