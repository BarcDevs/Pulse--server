import type {
    Request,
    Response
} from 'express'

import { env, serverConfig } from '../../config'
import { HttpStatusCodes } from '../constants/httpStatusCodes'

export const getServerStatus = (
    _req: Request,
    res: Response
) => {
    res
        .status(HttpStatusCodes.OK)
        .json({
            message: `Server is running! use /api/${serverConfig.apiVersion}/ for api requests`,
            config: {
                CORS_Origin: serverConfig.origin,
                NODE_ENV: env
            }
        })
}