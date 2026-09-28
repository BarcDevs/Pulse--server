import Prisma from '../utils/prismaClient'

export const getSessionState = (
    userId: string
) =>
    Prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            active: true,
            passwordUpdatedAt: true
        }
    })
