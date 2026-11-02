import Prisma from '../utils/prismaClient'

export const markOpened = async (token: string): Promise<void> => {
    await Prisma.launchFunnelToken.upsert({
        where: { token },
        create: { token },
        update: {}
    })
}

// Same as markRegistered for the guest stage, and leaves registeredAt alone
// so a guest who later upgrades still counts as registered
export const markGuest = async (token: string): Promise<void> => {
    await Prisma.launchFunnelToken.upsert({
        where: { token },
        create: {
            token,
            guestAt: new Date()
        },
        update: {
            guestAt: new Date()
        }
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
            guestAt: true,
            registeredAt: true
        }
    })
