import Prisma from '../utils/prismaClient'

// Deleting the user cascades to the profile and everything under it
export const deleteAccountsDeletedBefore = (
    cutoff: Date
) =>
    Prisma.user.deleteMany({
        where: {
            active: false,
            deletedAt: {
                lte: cutoff
            }
        }
    })
