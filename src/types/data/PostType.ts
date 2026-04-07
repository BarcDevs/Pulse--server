import type {ReplyType} from './ReplyType'
import type {TagType} from './TagType'
import type {UserType} from './UserType'
import type {Votes} from './Votes'

export type PostType = {
    id: string
    title: string
    body: string
    author?: Partial<UserType>
    authorId?: string
    createdAt: Date
    updatedAt?: Date
    votes: Votes | string
    replies: ReplyType[]
    views: number
    category: string
    tags: TagType[]
    _count?: {
        replies: number
    }
}

export type NewPostType = {
    title: string
    body: string
    category: string
    authorId: string
    tags: string[]
}

export type UpdatePostType = Partial<
    Omit<NewPostType, 'authorId'> & {
        vote?: {
            userId: string
            vote: 'up'
        }
        removeTags?: string[]
    }
>
