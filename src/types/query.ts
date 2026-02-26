export enum PostFilter {
    NEWEST = 'newest',
    POPULAR = 'popular',
    HOT = 'hot',
    UNANSWERED = 'unanswered'
}

export type PostQuery = {
    filter?: PostFilter | undefined
    tag?: string
    category?: string
    search?: string
    page?: number
    limit?: number
}

export type TagQuery = {
    filter?: 'popular'
    search?: string
    limit?: number
    page?: number
}

export type CheckInQuery = {
    limit?: number
}
