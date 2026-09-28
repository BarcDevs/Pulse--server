import type {
    NewUserType,
    ServerUserType
} from '../types/data/UserType'
import Prisma from '../utils/prismaClient'

export const getUserById = async (id: string):
    Promise<ServerUserType | null> => {
    const user = await Prisma.user.findUnique({
        where: {
            id
        },
        include: {
            profile: {
                select: {
                    id: true,
                    image: true,
                    timezone: true,
                    theme: true,
                    language: true,
                    lastCheckInAt: true
                }
            }
        }
    })

    if (!user || !user.active) return null

    return user as ServerUserType
}

// Includes deactivated (pending-deletion) accounts: login restores them and
// the email stays taken until the purge
export const getUserByEmailAnyStatus = async (
    email: string
): Promise<ServerUserType | null> =>
    await Prisma.user.findUnique({
        where: {
            email
        },
        include: {
            profile: {
                select: {
                    id: true,
                    image: true,
                    timezone: true,
                    theme: true,
                    language: true,
                    lastCheckInAt: true
                }
            }
        }
    }) as ServerUserType | null

export const getUserByEmail = async (
    email: string
): Promise<ServerUserType | null> => {
    const user = await getUserByEmailAnyStatus(email)

    return user?.active ? user : null
}

// Availability check only, so deactivated accounts still hold their username
export const getUserByUsername = async (
    username: string
): Promise<ServerUserType | null> =>
    await Prisma.user.findUnique({
        where: {
            username
        }
    }) as ServerUserType | null

export const createUser = async (
    newUser: NewUserType
): Promise<ServerUserType> => {
    const user =
        await Prisma.$transaction(
            async (tx) => {
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

export const updateUser = (
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
        resetPasswordAttempts?: number
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

export const incrementResetPasswordAttempts = (
    userId: string
): Promise<ServerUserType> =>
    Prisma.user.update({
        where: {
            id: userId,
            active: true
        },
        data: {
            resetPasswordAttempts: {
                increment: 1
            }
        }
    }) as Promise<ServerUserType>

export const setConfirmEmailOTP = (
    userId: string,
    data: {
        confirmEmailOTP: number | null
        confirmEmailExpiration: Date | null
        confirmEmailAttempts?: number
    }
): Promise<ServerUserType> =>
    Prisma.user.update({
        where: {
            id: userId,
            active: true
        },
        data
    }) as Promise<ServerUserType>

export const incrementConfirmEmailAttempts = (
    userId: string
): Promise<ServerUserType> =>
    Prisma.user.update({
        where: {
            id: userId,
            active: true
        },
        data: {
            confirmEmailAttempts: {
                increment: 1
            }
        }
    }) as Promise<ServerUserType>

export const updatePassword = (
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

export const markEmailVerified = (
    userId: string
): Promise<ServerUserType> =>
    Prisma.user.update({
        where: {
            id: userId,
            active: true
        },
        data: {
            emailVerifiedAt: new Date(Date.now())
        }
    }) as Promise<ServerUserType>

export const disableUser = (id: string): Promise<ServerUserType> =>
    Prisma.user.update({
        where: {
            id
        },
        data: {
            active: false,
            deletedAt: new Date(Date.now())
        }
    }) as Promise<ServerUserType>

// Cancels a pending deletion. Bumping passwordUpdatedAt keeps tokens issued
// before the deletion revoked (see getSessionUserId).
export const restoreUser = (id: string): Promise<ServerUserType> =>
    Prisma.user.update({
        where: {
            id
        },
        data: {
            active: true,
            deletedAt: null,
            passwordUpdatedAt: new Date(Date.now())
        }
    }) as Promise<ServerUserType>

export const deleteUser = (id: string): Promise<ServerUserType> =>
    Prisma.user.delete({
        where: {
            id
        }
    }) as Promise<ServerUserType>

export const setEmailChangeOTP = (
    userId: string,
    data: {
        pendingEmail: string | null
        emailChangeOTP: number | null
        emailChangeExpiration: Date | null
    }
): Promise<ServerUserType> =>
    Prisma.user.update({
        where: {
            id: userId,
            active: true
        },
        data
    }) as Promise<ServerUserType>

export const updateEmail = (
    userId: string,
    newEmail: string
): Promise<ServerUserType> =>
    Prisma.user.update({
        where: {
            id: userId,
            active: true
        },
        data: {
            email: newEmail,
            pendingEmail: null,
            emailChangeOTP: null,
            emailChangeExpiration: null,
            emailVerifiedAt: new Date(Date.now())
        }
    }) as Promise<ServerUserType>

export const linkGoogleId = (
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

export const getUserByGoogleIdAnyStatus = async (
    googleId: string
): Promise<ServerUserType | null> =>
    await Prisma.user.findUnique({
        where: {
            googleId
        }
    }) as ServerUserType | null

export const createGoogleUser = async (
    data: NewUserType & {
        googleId: string
        picture: string | null
    }
): Promise<ServerUserType> => {
    const user = await Prisma.$transaction(
        async (tx) => {
            const createdUser = await tx.user.create({
                data: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    username: data.username,
                    email: data.email,
                    password: data.password,
                    googleId: data.googleId,
                    emailVerifiedAt: new Date(Date.now())
                }
            })

            await tx.profile.create({
                data: {
                    userId: createdUser.id,
                    image: data.picture
                }
            })

            return createdUser
        }
    )

    return user as ServerUserType
}

export const linkGoogleAccount = async (
    userId: string,
    googleId: string,
    picture: string | null
): Promise<ServerUserType> => {
    const user = await Prisma.$transaction(
        async (tx) => {
            const updatedUser = await tx.user.update({
                where: {
                    id: userId,
                    active: true
                },
                data: {
                    googleId,
                    emailVerifiedAt: new Date(Date.now())
                }
            })

            if (picture) {
                const profile =
                    await tx.profile.findUnique({
                        where: { userId },
                        select: { image: true }
                    })

                if (!profile?.image) {
                    await tx.profile.update({
                        where: { userId },
                        data: { image: picture }
                    })
                }
            }

            return updatedUser
        }
    )

    return user as ServerUserType
}

export const getUserTimezone = async (
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

export const getUserLanguage = async (
    userId: string
): Promise<string> => {
    const profile = await Prisma.profile.findUnique({
        where: {
            userId
        },
        select: {
            language: true
        }
    })
    return profile?.language ?? 'he'
}