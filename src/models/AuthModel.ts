import type {
    NewUserType,
    ServerUserType
} from '../types/data/UserType'
import Prisma from '../utils/PrismaClient'

const getUserById = async (id: string):
    Promise<ServerUserType | null> => {
    const user = await Prisma.user.findUnique({
        where: {
            id
        }
    })

    if (!user || !user.active) return null

    return user as ServerUserType
}

const getUserByEmail = async (
    email: string
): Promise<ServerUserType | null> => {
    const user = await Prisma.user.findUnique({
        where: {
            email
        }
    })

    if (!user || !user.active) return null

    return user as ServerUserType
}

const getUserByUsername = async (
    username: string
): Promise<ServerUserType | null> => {
    const user =
        await Prisma.user.findUnique({
            where: {
                username
            }
        })

    if (!user || !user.active) return null

    return user as ServerUserType
}

const createUser = async (
    newUser: NewUserType
): Promise<ServerUserType> => {
    const user =
        await Prisma.$transaction(
            async (tx: typeof Prisma) => {
                const createdUser =
                    await tx.user.create({
                        data: newUser
                    })

                await tx.profile.create({
                    data: {
                        userId: createdUser.id
                    }
                })

                return createdUser
            }
        )

    return user as ServerUserType
}

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
        passwordUpdatedAt?: Date
    }
): Promise<ServerUserType> =>
    Prisma.user.update({
        where: {
            id: userId,
            active: true
        },
        data
    }) as Promise<ServerUserType>

const updatePassword = (
    userId: string,
    hashedPassword: string
): Promise<ServerUserType> =>
    Prisma.user.update({
        where: {
            id: userId,
            active: true
        },
        data: {
            password: hashedPassword,
            passwordUpdatedAt: new Date(Date.now())
        }
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

const linkGoogleId = (
    userId: string,
    googleId: string
): Promise<ServerUserType> =>
    Prisma.user.update({
        where: {
            id: userId,
            active: true
        },
        data: {
            googleId
        }
    }) as Promise<ServerUserType>

const getUserTimezone = async (
    userId: string
): Promise<string | null> => {
    const profile = await Prisma.profile.findUnique({
        where: {
            userId
        },
        select: {
            timezone: true
        }
    })
    return profile?.timezone ?? null
}

export {
    createUser,
    deleteUser,
    disableUser,
    getUserByEmail,
    getUserById,
    getUserByUsername,
    getUserTimezone,
    linkGoogleId,
    updatePassword,
    updateUser
}
