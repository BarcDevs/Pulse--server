import type { PostType } from './PostType'
import type { UserType } from './UserType'

export type ReplyType = {
    id: string
    body: string
    author: Partial<UserType>
    authorId: string
    createdAt: Date
    updatedAt?: Date
    post?: PostType
    postId?: string
}

export type NewReplyType = {
    body: string
    authorId: string
    postId: string
}

export type UpdateReplyType = Partial<
    Omit<NewReplyType, 'authorId'>
>
