export type PaginatedType<T> = {
    items: T[]
    pagination: {
        total: number
        page: number
        limit: number
        hasMore: boolean
        nextCursor: string | null
    }
}
