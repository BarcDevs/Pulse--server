import type { Request, Response } from 'express'

import {
    launchFunnelCookieName,
    launchTokenPattern
} from '../constants/launchFunnel'
import * as launchFunnelService from '../services/launchFunnelService'
import { toLoggableError } from '../utils/loggableError'
import logger from '../utils/logger'

// Never lets a funnel failure break signup
export const trackLaunchRegistration = async (
    req: Request,
    res: Response
): Promise<void> => {
    const token: unknown = req.cookies?.[launchFunnelCookieName]

    if (typeof token !== 'string' || !launchTokenPattern.test(token))
        return

    try {
        await launchFunnelService.recordRegistered(token)
        res.clearCookie(launchFunnelCookieName)
    } catch (error) {
        logger.warn(
            'Launch funnel registration not recorded',
            toLoggableError(error)
        )
    }
}

// A visitor from a launch email who starts as a guest. The cookie stays, so
// the later upgrade is still recorded as the registration
export const trackLaunchGuest = async (
    req: Request
): Promise<void> => {
    const token: unknown = req.cookies?.[launchFunnelCookieName]

    if (
        typeof token !== 'string'
        || !launchTokenPattern.test(token)
    )
        return

    try {
        await launchFunnelService.recordGuest(token)
    } catch (error) {
        logger.warn(
            'Launch funnel guest not recorded',
            toLoggableError(error)
        )
    }
}
