import type {
    NewUserType,
    ServerUserType
} from '../types/data/UserType'
import Prisma from '../utils/PrismaClient'

const getUserById = async (id: string): Promise<ServerUserType | null> => {
    const user = await Prisma.user.findUnique({
        where: {
            id,
            active: true
        }
    })

    if (!user) return null

    return user as ServerUserType
}

const getUserByEmail = async (
    email: string
): Promise<ServerUserType | null> => {
    const user = await Prisma.user.findUnique({
        where: {
            email,
            active: true
        }
    })

    if (!user) return null

    return user as ServerUserType
}

const createUser = (newUser: NewUserType): Promise<ServerUserType> =>
    Prisma.user.create({
        data: newUser
    }) as Promise<ServerUserType>

const updateUser = (
    userId: string,
    newUserData: Partial<NewUserType>
): Promise<ServerUserType> =>
    Prisma.user.update({
        where: {
            id: userId,
            active: true
        },
        data: newUserData
    }) as Promise<ServerUserType>

export const setUserOTP = (
    userId: string,
    data: {
        resetPasswordOTP: number | null
        resetPasswordExpiration: Date | null
        password_updated_at?: Date
    }
): Promise<ServerUserType> =>
    Prisma.user.update({
        where: {
            id: userId,
            active: true
        },
        data
    }) as Promise<ServerUserType>

const disableUser = (id: string): Promise<ServerUserType> =>
    Prisma.user.update({
        where: {
            id
        },
        data: {
            active: false
        }
    }) as Promise<ServerUserType>

const deleteUser = (id: string): Promise<ServerUserType> =>
    Prisma.user.delete({
        where: {
            id
        }
    }) as Promise<ServerUserType>

const getUserTimezone = async (
    userId: string
): Promise<string | null> => {
    const user = await Prisma.user.findUnique({
        where: {
            id: userId,
            active: true
        },
        select: {timezone: true}
    })
    return user?.timezone ?? null
}

export {
    createUser,
    deleteUser,
    disableUser,
    getUserByEmail,
    getUserById,
    getUserTimezone,
    updateUser
}
