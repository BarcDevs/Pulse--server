import type { Express } from 'express'

import { serverConfig } from '../../../config'
import { getServerStatus } from '../../controllers/ServerController'
import { errorHandler } from '../../middlewares/errorHandler'
import authRoute from '../AuthRoute'
import bulkRoute from '../bukActionsRoute'
import forumRoute from '../ForumRoute'

declare module 'express-serve-static-core' {
    interface Request {
        userId?: string
        csrfToken?: string
    }
}

const baseRoute = (route: string) => `/api/${serverConfig.apiVersion}/${route}`

export const declareRoutes = (app: Express) => {
    app.get('/api/status', getServerStatus)

    app.use(baseRoute('forum'), forumRoute)
    app.use(baseRoute('auth'), authRoute)

    app.use(`/api/${serverConfig.apiVersion}/bulk`, bulkRoute)

    app.use('*', errorHandler)
}
