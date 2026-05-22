import type { ReplyType } from './ReplyType'
import type { PostTagType } from './TagType'
import type { UserType } from './UserType'

export type PostType = {
    id: string
    title: string
    body: string
    author?: Partial<UserType>
    authorId?: string
    createdAt: Date
    updatedAt?: Date
    replies: ReplyType[]
    views: number
    category: string
    tags: PostTagType[]
    _count?: {
        replies: number
        likes: number
    }
}

export type NewPostType = {
    title: string
    body: string
    category: string
    authorId: string
    tags?: string[]
}

export type UpdatePostType = Partial<
    Omit<NewPostType, 'authorId'> & {
        removeTags?: string[]
    }
>
