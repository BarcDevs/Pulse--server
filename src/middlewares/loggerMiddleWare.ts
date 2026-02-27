import type {Handler} from 'express'
import ExpressWinston from 'express-winston'

import logger from '../utils/logger'

export const loggerMiddleware: Handler = ExpressWinston.logger({
    winstonInstance: logger,
    statusLevels: true,
})
