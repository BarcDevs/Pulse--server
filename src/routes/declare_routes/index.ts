import type { Express } from 'express'
import swaggerUi from 'swagger-ui-express'

import { env, serverConfig } from '../../../config'
import { getServerStatus } from '../../controllers/serverController'
import { swagger } from '../../controllers/swaggerController'
import { errorHandler } from '../../middlewares/errorHandler'
import { swaggerSpec } from '../../utils/swagger'
import authRoute from '../authRoute'
import checkInRoute from '../checkInRoute'
import devRoute from '../devRoute'
import forumRoute from '../forumRoute'
import profileRoute from '../profileRoute'
import recommendationsRoute from '../recommendationsRoute'
import recoveryGoalRoute from '../recoveryGoalRoute'
import userRoute from '../userRoute'

declare module 'express-serve-static-core' {
    interface Request {
        userId?: string
        csrfToken?: string
    }
}

const baseRoute = (route: string) =>
    `/api/${serverConfig.apiVersion}/${route}`

export const declareRoutes = (app: Express) => {
    app.get('/api/status', getServerStatus)

    if (env !== 'production') {
        app.use(
            '/api-docs',
            swagger,
            swaggerUi.serve,
            swaggerUi.setup(swaggerSpec)
        )

        app.use('/dev', devRoute)
    }

    app.use(baseRoute('auth'), authRoute)
    app.use(baseRoute('check-in'), checkInRoute)
    app.use(baseRoute('forum'), forumRoute)
    app.use(baseRoute('profile'), profileRoute)
    app.use(baseRoute('recommendations'), recommendationsRoute)
    app.use(baseRoute('recovery-goals'), recoveryGoalRoute)
    app.use(baseRoute('users'), userRoute)

    app.use(errorHandler)
}
