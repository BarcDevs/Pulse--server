import * as launchFunnelModel from '../models/launchFunnelModel'

export type LaunchFunnel = {
    opened: string[]
    registered: string[]
}

export const recordOpened = (token: string) =>
    launchFunnelModel.markOpened(token)

export const recordRegistered = (token: string) =>
    launchFunnelModel.markRegistered(token)

// Registered tokens are a subset of opened ones
export const getFunnel = async (): Promise<LaunchFunnel> => {
    const rows = await launchFunnelModel.getAllTokens()

    return {
        opened: rows.map(({ token }) => token),
        registered: rows
            .filter(({ registeredAt }) => registeredAt)
            .map(({ token }) => token)
    }
}
