import type { Express } from 'express'
import swaggerUi from 'swagger-ui-express'

import { env, serverConfig } from '../../../config'
import {
    getServerReadiness,
    getServerStatus
} from '../../controllers/serverController'
import { swagger } from '../../controllers/swaggerController'
import { errorFactory } from '../../errors/factory/ErrorFactory'
import { errorHandler } from '../../middlewares/errorHandler'
import { swaggerSpec } from '../../utils/swagger'
import authRoute from '../authRoute'
import checkInRoute from '../checkInRoute'
import devRoute from '../devRoute'
import forumRoute from '../forumRoute'
import insightRoute from '../insightRoute'
import profileRoute from '../profileRoute'
import recoveryGoalRoute from '../recoveryGoalRoute'
import supportRoute from '../supportRoute'
import userRoute from '../userRoute'

declare module 'express-serve-static-core' {
    interface Request {
        userId?: string
        csrfToken?: string
        requestId?: string
    }
}

const baseRoute = (route: string) =>
    `/api/${serverConfig.apiVersion}/${route}`

export const declareRoutes = (app: Express) => {
    app.get('/api/status', getServerStatus)

    /**
     * @swagger
     * /api/ready:
     *   get:
     *     summary: Readiness probe — confirms the app can reach the database
     *     tags: [Server]
     *     responses:
     *       200:
     *         description: Database reachable
     *       503:
     *         description: Database unreachable
     */
    app.get('/api/ready', getServerReadiness)

    if (env !== 'production') {
        app.use(
            '/api-docs',
            swagger,
            swaggerUi.serve,
            swaggerUi.setup(swaggerSpec)
        )
    }

    // Under /api so it's reachable through the client's /api proxy
    if (env !== 'production') {
        app.use(baseRoute('dev'), devRoute)
    }


    app.use(baseRoute('auth'), authRoute)
    app.use(baseRoute('check-in'), checkInRoute)
    app.use(baseRoute('forum'), forumRoute)
    app.use(baseRoute('insight'), insightRoute)
    app.use(baseRoute('profile'), profileRoute)
    app.use(baseRoute('recovery-goals'), recoveryGoalRoute)
    app.use(baseRoute('support'), supportRoute)
    app.use(baseRoute('users'), userRoute)

    app.use(() => {
        throw errorFactory.generic.notFound('Route')
    })

    app.use(errorHandler)
}
