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

        it('searches author username, excluding anonymous authors', () => {
            const result = postQueryBuilder({ search: 'john' })
            expect(result.where.OR).toContainEqual({
                author: {
                    user: {
                        username: { contains: 'john', mode: 'insensitive' },
                        profile: { anonymousParticipation: false }
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
            lastName: 'Doe',
            profile: { anonymousParticipation: false }
        }
    }

    it('returns undefined author unchanged', () => {
        expect(anonymizeAuthor(undefined)).toBeUndefined()
    })

    it('replaces a purged (null) author with the deleted-user placeholder', () => {
        expect(anonymizeAuthor(null)).toEqual({
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

    it('strips the profile key and keeps real identity when not anonymous', () => {
        const result = anonymizeAuthor(baseAuthor)
        expect(result?.user).toEqual({
            id: 'user-1',
            username: 'johndoe',
            firstName: 'John',
            lastName: 'Doe'
        })
    })

    it('masks id/username/firstName/lastName when anonymousParticipation is true', () => {
        const anonAuthor = {
            ...baseAuthor,
            user: { ...baseAuthor.user, profile: { anonymousParticipation: true } }
        }
        const result = anonymizeAuthor(anonAuthor)
        expect(result?.user.id).toBe('profile-1')
        expect(result?.user.username).toBe('anonymous-profile-')
        expect(result?.user.firstName).toBe('Anonymous')
        expect(result?.user.lastName).toBe('')
        expect(result?.user).not.toHaveProperty('profile')
    })

    it('hides the profile image of anonymous authors only', () => {
        const anonAuthor = {
            ...baseAuthor,
            user: { ...baseAuthor.user, profile: { anonymousParticipation: true } }
        }
        expect(anonymizeAuthor(anonAuthor)?.image).toBeNull()
        expect(anonymizeAuthor(baseAuthor)?.image).toBe('pic.jpg')
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

