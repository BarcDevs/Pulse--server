export type TagLabel = { en: string; he: string | null }

export type TagType = {
    id: string
    label: TagLabel
    slug: string
    description?: string
    createdAt?: Date
    _count?: {
        posts: number
        followers: number
    }
}

export type PostTagType = {
    id: string
    name: string
    nameHe: string
    slug: string
}
