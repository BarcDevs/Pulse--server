import type { PaginatedType } from '../types/PaginatedType'

// With a cursor the page is "full" or not; the last full page is followed by
// one empty page. With page paging the total tells.
export const buildPagination = (
    items: { id: string }[],
    total: number,
    page: number,
    limit: number,
    cursor?: string
): PaginatedType<unknown>['pagination'] => {
    const hasMore = cursor
        ? items.length === limit
        : page * limit < total

    return {
        total,
        page,
        limit,
        hasMore,
        nextCursor: hasMore ? items.at(-1)?.id ?? null : null
    }
}
