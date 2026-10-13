import { postQuerySchema, savedPostQuerySchema } from '../../schemas/forum/postQuerySchema'
import { replyQuerySchema } from '../../schemas/forum/replyQuerySchema'

describe('forum list query schemas', () => {
    it('accepts a cursor on its own', () => {
        expect(postQuerySchema.safeParse({ cursor: 'p1', limit: '5' }).success)
            .toBe(true)
        expect(replyQuerySchema.safeParse({ cursor: 'r1' }).success).toBe(true)
    })

    it('rejects cursor together with page', () => {
        expect(postQuerySchema.safeParse({ cursor: 'p1', page: '2' }).success)
            .toBe(false)
        expect(replyQuerySchema.safeParse({ cursor: 'r1', page: '2' }).success)
            .toBe(false)
    })

    it('rejects a cursor on the hot and popular filters', () => {
        expect(postQuerySchema.safeParse({ cursor: 'p1', filter: 'hot' }).success)
            .toBe(false)
        expect(postQuerySchema.safeParse({ cursor: 'p1', filter: 'popular' }).success)
            .toBe(false)
        expect(postQuerySchema.safeParse({ cursor: 'p1', filter: 'newest' }).success)
            .toBe(true)
    })

    it('still allows page with hot and popular', () => {
        expect(postQuerySchema.safeParse({ page: '2', filter: 'hot' }).success)
            .toBe(true)
    })

    it('drops the cursor for saved posts', () => {
        const parsed = savedPostQuerySchema.parse({ cursor: 'p1', page: '2' })
        expect(parsed).not.toHaveProperty('cursor')
        expect(parsed.page).toBe(2)
    })
})
