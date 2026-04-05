import type {Role} from '../../../prisma/generated/prisma/enums'
import type {Prettify} from '../index'

import type {PostType} from './PostType'
import type {ReplyType} from './ReplyType'
import type {TagType} from './TagType'

export type UserType = {
    id: string
    firstName: string
    lastName: string
    username: string
    email: string
    googleId?: string | null
    role: Role
    posts?: PostType[]
    replies?: ReplyType[]
    followedTags?: Partial<TagType>[]
}

export type ServerUserType = Prettify<
    UserType & {
        password: string
        resetPasswordOTP?: number
        resetPasswordExpiration?: Date
        passwordUpdatedAt: Date
        createdAt: Date
        active: boolean
        deletedAt?: Date
    }
>

export type NewUserType = {
    firstName: string
    lastName: string
    username: string
    email: string
    password: string
}
