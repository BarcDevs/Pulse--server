import {
    activeReplyAuthorWhere,
    anonymizeAuthor,
    postInclude,
    postQueryBuilder
} from '../../../models/queries/postQuery'
import { PostFilter } from '../../../types/query'

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
            expect(result.where.OR).toHaveLength(5)
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

        it('searches author username, excluding anonymous posts', () => {
            const result = postQueryBuilder({ search: 'john' })
            expect(result.where.OR).toContainEqual({
                isAnonymous: false,
                author: {
                    user: {
                        username: { contains: 'john', mode: 'insensitive' }
                    }
                }
            })
        })

        it('does not search author firstName/lastName (identity leak)', () => {
            const result = postQueryBuilder({ search: 'john' })
            expect(result.where.OR).not.toContainEqual(
                expect.objectContaining({
                    author: { user: expect.objectContaining({ firstName: expect.anything() }) }
                })
            )
            expect(result.where.OR).not.toContainEqual(
                expect.objectContaining({
                    author: { user: expect.objectContaining({ lastName: expect.anything() }) }
                })
            )
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

describe('anonymizeAuthor', () => {
    const baseAuthor = {
        id: 'profile-1',
        image: 'pic.jpg',
        user: {
            id: 'user-1',
            username: 'johndoe',
            firstName: 'John',
            lastName: 'Doe'
        }
    }

    it('returns undefined author unchanged', () => {
        expect(anonymizeAuthor(undefined, true)).toBeUndefined()
    })

    it('replaces a purged (null) author with the deleted-user placeholder', () => {
        expect(anonymizeAuthor(null, false)).toEqual({
            id: '',
            image: null,
            user: {
                id: '',
                username: 'deleted-user',
                firstName: '',
                lastName: ''
            }
        })
    })

    it('keeps real identity when the item is not anonymous', () => {
        const result = anonymizeAuthor(baseAuthor, false)
        expect(result?.user).toEqual({
            id: 'user-1',
            username: 'johndoe',
            firstName: 'John',
            lastName: 'Doe'
        })
    })

    it('masks id/username/firstName/lastName when the item is anonymous', () => {
        const result = anonymizeAuthor(baseAuthor, true)
        expect(result?.user.id).toBe('profile-1')
        expect(result?.user.username).toBe('anonymous-profile-')
        expect(result?.user.firstName).toBe('Anonymous')
        expect(result?.user.lastName).toBe('')
    })

    it('shows the placeholder for a purged author whatever the flag', () => {
        expect(anonymizeAuthor(null, true)).toEqual(anonymizeAuthor(null, false))
    })

    it('hides the profile image of anonymous items only', () => {
        expect(anonymizeAuthor(baseAuthor, true)?.image).toBeNull()
        expect(anonymizeAuthor(baseAuthor, false)?.image).toBe('pic.jpg')
    })
})

describe('reply visibility with purged authors', () => {
    it('treats a null author as visible next to active authors', () => {
        expect(activeReplyAuthorWhere.OR).toContainEqual({ authorId: null })
        expect(activeReplyAuthorWhere.OR).toContainEqual({
            author: { user: { active: true } }
        })
    })

    it('uses the reply-aware filter for the reply count and single-post replies', () => {
        expect(postInclude('multiple')._count.select.replies.where)
            .toBe(activeReplyAuthorWhere)
        expect(postInclude('single').replies).toMatchObject({
            where: activeReplyAuthorWhere
        })
    })

    it('uses the reply-aware filter for the unanswered filter', () => {
        const result = postQueryBuilder({ filter: PostFilter.UNANSWERED })
        expect(result.where.replies).toEqual({ none: activeReplyAuthorWhere })
    })
})

describe('hot sort', () => {
    it('orders by the stored reply count', () => {
        const result = postQueryBuilder({ filter: PostFilter.HOT })
        expect(result.orderBy).toEqual({ replyCount: 'desc' })
    })
})

