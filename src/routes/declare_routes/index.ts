import type {Express} from 'express'
import swaggerUi from 'swagger-ui-express'

import {env, serverConfig} from '../../../config'
import {getServerStatus} from '../../controllers/ServerController'
import {swagger} from '../../controllers/swaggerController'
import {errorHandler} from '../../middlewares/errorHandler'
import {swaggerSpec} from '../../utils/swagger'
import authRoute from '../AuthRoute'
import checkInRoute from '../CheckInRoute'
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

    if ( env !== 'production' ) {
        app.use(
            '/api-docs',
            swagger,
            swaggerUi.serve,
            swaggerUi.setup(swaggerSpec)
        )
    }

    app.use(baseRoute('auth'), authRoute)
    app.use(baseRoute('check-in'), checkInRoute)
    app.use(baseRoute('forum'), forumRoute)

    app.use('*', errorHandler)
}
