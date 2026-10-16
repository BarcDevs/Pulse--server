import { z } from 'zod'

import { launchTokenPattern } from '../../constants/launchFunnel'

export const openLaunchLinkSchema = z.object({
    token: z.string('Token is required')
        .regex(launchTokenPattern, 'Token is invalid')
})

export type OpenLaunchLinkType = z.infer<typeof openLaunchLinkSchema>
