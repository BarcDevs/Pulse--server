import {Router} from 'express'

import {
    createCheckIn,
    getCheckIns,
    getCheckInStats
} from '../controllers/CheckInController'
import {
    csrfMiddleware,
    extractCsrfToken
} from '../middlewares/csrf'
import {isAuthenticated} from '../middlewares/isAuthenticated'

const router = Router()

/**
 * @swagger
 * /api/v1/check-in:
 *   get:
 *     summary: Get check-ins for the current user
 *     tags: [Check-In]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of check-ins to return
 *     responses:
 *       200:
 *         description: List of check-ins
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CheckIn'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Create a daily check-in
 *     tags: [Check-In]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [moodScore, painLevel, activities]
 *             properties:
 *               moodScore:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *               painLevel:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *               activities:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Check-in created with AI-generated insights
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/CheckIn'
 *       401:
 *         description: Not authenticated or invalid CSRF token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
    .route('/')
    .get(isAuthenticated, getCheckIns)
    .post(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        createCheckIn
    )

/**
 * @swagger
 * /api/v1/check-in/stats:
 *   get:
 *     summary: Get aggregated check-in statistics for the current user
 *     tags: [Check-In]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Check-in statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/CheckInStats'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
    .route('/stats')
    .get(isAuthenticated, getCheckInStats)

export default router
