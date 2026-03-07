import {Router} from 'express'

import {
    addActivityPreferences,
    addHealthInterests,
    getActivityPreferences,
    getHealthInterests,
    getProfile,
    removeActivityPreference,
    removeHealthInterest,
    updateProfile
} from '../controllers/ProfileController'
import {
    csrfMiddleware,
    extractCsrfToken
} from '../middlewares/csrf'
import {isAuthenticated} from '../middlewares/isAuthenticated'

const router = Router()

/**
 * @swagger
 * /api/v1/profile:
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
 * /api/v1/profile/health-interests:
 *   post:
 *     summary: Add health interests
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slugs]
 *             properties:
 *               slugs:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Health interests added
 *       401:
 *         description: Not authenticated
 * /api/v1/profile/health-interests/{slug}:
 *   delete:
 *     summary: Remove health interest
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Health interest removed
 *       401:
 *         description: Not authenticated
 */
router
    .route('/health-interests')
    .post(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        addHealthInterests
    )

router
    .route('/health-interests/:slug')
    .delete(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        removeHealthInterest
    )

/**
 * @swagger
 * /api/v1/profile/activities:
 *   post:
 *     summary: Add activity preferences
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slugs]
 *             properties:
 *               slugs:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Activity preferences added
 *       401:
 *         description: Not authenticated
 * /api/v1/profile/activities/{slug}:
 *   delete:
 *     summary: Remove activity preference
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Activity preference removed
 *       401:
 *         description: Not authenticated
 */
router
    .route('/activities')
    .post(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        addActivityPreferences
    )

router
    .route('/activities/:slug')
    .delete(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        removeActivityPreference
    )

/**
 * @swagger
 * /api/v1/health-interests:
 *   get:
 *     summary: List all available health interests
 *     tags: [Profile]
 *     responses:
 *       200:
 *         description: List of health interests
 * /api/v1/activities:
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