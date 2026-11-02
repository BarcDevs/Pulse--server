import * as launchFunnelModel from '../models/launchFunnelModel'

export type LaunchFunnel = {
    opened: string[]
    guests: string[]
    registered: string[]
}

export const recordOpened = (token: string) =>
    launchFunnelModel.markOpened(token)

export const recordGuest = (token: string) =>
    launchFunnelModel.markGuest(token)

export const recordRegistered = (token: string) =>
    launchFunnelModel.markRegistered(token)

// Guest and registered tokens are each a subset of opened ones. A guest who
// upgrades is in both lists; a visitor who signs up directly is only registered
export const getFunnel = async (): Promise<LaunchFunnel> => {
    const rows = await launchFunnelModel.getAllTokens()

    return {
        opened: rows.map(({ token }) => token),
        guests: rows
            .filter(({ guestAt }) => guestAt)
            .map(({ token }) => token),
        registered: rows
            .filter(({ registeredAt }) => registeredAt)
            .map(({ token }) => token)
    }
}
