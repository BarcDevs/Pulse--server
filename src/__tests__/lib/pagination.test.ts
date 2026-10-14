import { buildPagination } from '../../lib/pagination'

describe('buildPagination', () => {
    const items = [
        { id: 'a' },
        { id: 'b' }
    ]

    it('page mode: hasMore comes from the total', () => {
        expect(buildPagination(items, 5, 1, 2)).toEqual({
            total: 5,
            page: 1,
            limit: 2,
            hasMore: true,
            nextCursor: 'b'
        })
    })

    it('page mode: last page has no next cursor', () => {
        expect(buildPagination(items, 4, 2, 2)).toMatchObject({
            hasMore: false,
            nextCursor: null
        })
    })

    it('cursor mode: a full page means there may be more', () => {
        expect(buildPagination(items, 9, 1, 2, 'x')).toMatchObject({
            hasMore: true,
            nextCursor: 'b'
        })
    })

    it('cursor mode: a short page is the end', () => {
        expect(buildPagination([{ id: 'a' }], 9, 1, 2, 'x')).toMatchObject({
            hasMore: false,
            nextCursor: null
        })
    })

    it('cursor mode: an empty page has no next cursor', () => {
        expect(buildPagination([], 0, 1, 2, 'x')).toMatchObject({
            hasMore: false,
            nextCursor: null
        })
    })
})
