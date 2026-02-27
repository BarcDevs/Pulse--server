import type {PostType} from './PostType'
import type {UserType} from './UserType'

export type TagType = {
    id: string
    name: string
    description?: string
    posts?: PostType[] | number
    followers?: Partial<UserType>[] | number
    createdAt: Date
}
