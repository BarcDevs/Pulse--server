import { Router } from 'express'

import {
    getActivityPreferences,
    getHealthInterests,
    getProfile,
    updateProfile
} from '../controllers/profileController'
import {
    csrfMiddleware,
    extractCsrfToken
} from '../middlewares/csrf'
import { isAuthenticated } from '../middlewares/isAuthenticated'

const router = Router()

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       401:
 *         description: Not authenticated
 *   patch:
 *     summary: Update user profile
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 nullable: true
 *               bio:
 *                 type: string
 *                 nullable: true
 *               location:
 *                 type: string
 *                 nullable: true
 *               timezone:
 *                 type: string
 *                 nullable: true
 *               theme:
 *                 type: string
 *                 enum: [light, dark]
 *               language:
 *                 type: string
 *               dailyReminder:
 *                 type: boolean
 *               communityAlerts:
 *                 type: boolean
 *               profileVisibility:
 *                 type: string
 *                 enum: [onlyMe, friends, public]
 *               anonymousParticipation:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Not authenticated
 */
router
    .route('/')
    .get(isAuthenticated, getProfile)
    .patch(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        updateProfile
    )

/**
 * @swagger
 * /health-interests:
 *   get:
 *     summary: List all available health interests
 *     tags: [Profile]
 *     responses:
 *       200:
 *         description: List of health interests
 * /activities:
 *   get:
 *     summary: List all available activity preferences
 *     tags: [Profile]
 *     responses:
 *       200:
 *         description: List of activity preferences
 */
router
    .route('/list/health-interests')
    .get(getHealthInterests)

router
    .route('/list/activities')
    .get(getActivityPreferences)

export default router