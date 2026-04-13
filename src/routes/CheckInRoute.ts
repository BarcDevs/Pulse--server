import { Router } from 'express'

import {
    createCheckIn,
    getCheckIns,
    getCheckInStats,
    getProgressInsights,
    updateCheckIn
} from '../controllers/CheckInController'
import {
    csrfMiddleware,
    extractCsrfToken
} from '../middlewares/csrf'
import { isAuthenticated } from '../middlewares/isAuthenticated'

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
 *     summary: Create or update today's check-in
 *     description: >
 *       Creates a new check-in for today (based on the user's timezone).
 *       If a check-in already exists for today, updates it instead (idempotent).
 *       Returns 201 if created, 200 if updated.
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
 *         description: Check-in created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/CheckIn'
 *       200:
 *         description: Check-in updated successfully (already existed for today)
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
 *   patch:
 *     summary: Update today's check-in
 *     description: >
 *       Updates the existing check-in for today (based on the user's timezone).
 *       At least one field must be provided. Returns 404 if no check-in exists for today.
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
 *             minProperties: 1
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
 *                 minItems: 1
 *               notes:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Check-in updated successfully
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
 *       404:
 *         description: No check-in found for today - use POST to create one
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
    .route('/')
    .get(
        isAuthenticated,
        getCheckIns
    )
    .post(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        createCheckIn
    )
    .patch(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        updateCheckIn
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
    .get(
        isAuthenticated,
        getCheckInStats
    )

/**
 * @swagger
 * /api/v1/check-in/progress-insights:
 *   get:
 *     summary: Get weekly progress insights
 *     description: >
 *       Generates a weekly progress narrative by comparing the last 7 days
 *       with the previous 7 days. Returns trend classification, key
 *       improvements/regressions, and a generated summary.
 *     tags: [Check-In]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Progress insights generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/ProgressInsight'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
    .route('/progress-insights')
    .get(
        isAuthenticated,
        getProgressInsights
    )

export default router
