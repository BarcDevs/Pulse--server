import type { ServerUserType } from './UserType'

export type ResolvedGuestType = {
    user: ServerUserType
    created: boolean
}
