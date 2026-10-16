import Prisma from '../utils/prismaClient'

export const markOpened = async (token: string): Promise<void> => {
    await Prisma.launchFunnelToken.upsert({
        where: { token },
        create: { token },
        update: {}
    })
}

// Creates the row when the visitor never hit the open call, so a registered
// token is always also an opened one
export const markRegistered = async (token: string): Promise<void> => {
    await Prisma.launchFunnelToken.upsert({
        where: { token },
        create: {
            token,
            registeredAt: new Date()
        },
        update: { registeredAt: new Date() }
    })
}

export const getAllTokens = () =>
    Prisma.launchFunnelToken.findMany({
        select: {
            token: true,
            registeredAt: true
        }
    })
