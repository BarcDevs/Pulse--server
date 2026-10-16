import type { Request, Response } from 'express'

import { isDev } from '../../config'
import { HttpStatusCodes } from '../constants/httpStatusCodes'
import {
    launchFunnelCookieMaxAgeMs,
    launchFunnelCookieName
} from '../constants/launchFunnel'
import type { OpenLaunchLinkType } from '../schemas/launchFunnel/openLaunchLinkSchema'
import { openLaunchLinkSchema } from '../schemas/launchFunnel/openLaunchLinkSchema'
import * as launchFunnelService from '../services/launchFunnelService'
import { validateAndExtract } from '../utils/controllerHelpers'

export const openLaunchLink = async (
    req: Request,
    res: Response
) => {
    const { token } = validateAndExtract<OpenLaunchLinkType>(
        openLaunchLinkSchema,
        req.body
    )

    await launchFunnelService.recordOpened(token)

    // Kept until signup (email or Google) so a later visit still counts
    res.cookie(launchFunnelCookieName, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: !isDev,
        maxAge: launchFunnelCookieMaxAgeMs
    })

    res.status(HttpStatusCodes.NO_CONTENT).end()
}

export const getLaunchFunnel = async (
    _req: Request,
    res: Response
) => {
    const funnel = await launchFunnelService.getFunnel()

    res.status(HttpStatusCodes.OK).json(funnel)
}
