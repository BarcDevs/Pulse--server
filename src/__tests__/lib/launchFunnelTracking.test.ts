import type { Request, Response } from 'express'

import { launchFunnelCookieName } from '../../constants/launchFunnel'
import {
    trackLaunchGuest,
    trackLaunchRegistration
} from '../../lib/launchFunnelTracking'
import * as launchFunnelService from '../../services/launchFunnelService'
import {
    createMockRequest,
    createMockResponse
} from '../setup/testSetup'

jest.mock('../../services/launchFunnelService', () => ({
    recordGuest: jest.fn(),
    recordRegistered: jest.fn()
}))

const token = 'tok_AAAAAAAAAAAAAAAAAAAA'

const run = (cookies?: Record<string, string>) => {
    const req = createMockRequest({ cookies }) as Request
    const res = createMockResponse() as unknown as Response

    return { res, done: trackLaunchRegistration(req, res) }
}

describe('trackLaunchRegistration', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it.each([
        ['no cookies', undefined],
        ['no launch cookie', { other: 'x' }],
        ['a malformed launch cookie', { [launchFunnelCookieName]: 'a@b.com' }]
    ])('does nothing for %s', async (_name, cookies) => {
        const { res, done } = run(cookies)
        await done

        expect(launchFunnelService.recordRegistered).not.toHaveBeenCalled()
        expect(res.clearCookie).not.toHaveBeenCalled()
    })

    it('records the registration and clears the cookie', async () => {
        const { res, done } = run({ [launchFunnelCookieName]: token })
        await done

        expect(launchFunnelService.recordRegistered).toHaveBeenCalledWith(token)
        expect(res.clearCookie).toHaveBeenCalledWith(launchFunnelCookieName)
    })

    it('swallows a recording failure so signup still succeeds', async () => {
        ;(launchFunnelService.recordRegistered as jest.Mock)
            .mockRejectedValueOnce(new Error('db down'))

        const { res, done } = run({ [launchFunnelCookieName]: token })

        await expect(done).resolves.toBeUndefined()
        expect(res.clearCookie).not.toHaveBeenCalled()
    })
})

describe('trackLaunchGuest', () => {
    const runGuest = (cookies?: Record<string, string>) =>
        trackLaunchGuest(createMockRequest({ cookies }) as Request)

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it.each([
        ['no cookies', undefined],
        ['no launch cookie', { other: 'x' }],
        ['a malformed launch cookie', { [launchFunnelCookieName]: 'a@b.com' }]
    ])('does nothing for %s', async (_name, cookies) => {
        await runGuest(cookies)

        expect(launchFunnelService.recordGuest).not.toHaveBeenCalled()
    })

    it('records the guest stage and leaves the cookie for the later upgrade', async () => {
        await runGuest({ [launchFunnelCookieName]: token })

        expect(launchFunnelService.recordGuest).toHaveBeenCalledWith(token)
        expect(launchFunnelService.recordRegistered).not.toHaveBeenCalled()
    })

    it('swallows a recording failure so guest creation still succeeds', async () => {
        ;(launchFunnelService.recordGuest as jest.Mock)
            .mockRejectedValueOnce(new Error('db down'))

        await expect(runGuest({ [launchFunnelCookieName]: token }))
            .resolves.toBeUndefined()
    })
})
