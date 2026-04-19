export type TagType = {
    id: string
    name: string
    slug: string
    description?: string
    createdAt: Date
    _count?: {
        posts: number
        followers: number
    }
}
