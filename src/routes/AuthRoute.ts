import { Router } from 'express'

import {
    confirmEmail,
    forgotPassword,
    getCsrfToken,
    login,
    logout,
    me,
    resetPassword,
    signup
} from '../controllers/AuthController'
import { cacheMiddleware } from '../middlewares/cache'
import {
    csrfMiddleware,
    extractCsrfToken
} from '../middlewares/csrf'
import { isAuthenticated } from '../middlewares/isAuthenticated'

const router = Router()

router.route('/login').post(login)

router.route('/signup').post(signup)

router.route('/csrf').get(isAuthenticated, getCsrfToken)

router.route('/logout').get(logout)

router.route('/me').get(isAuthenticated, cacheMiddleware, me)

router.route('/forget-password/:email').get(forgotPassword)

router
    .route('/confirm-email')
    .post(extractCsrfToken, csrfMiddleware, confirmEmail)

router
    .route('/reset-password')
    .put(extractCsrfToken, csrfMiddleware, resetPassword)

export default router
