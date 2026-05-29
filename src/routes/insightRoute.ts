import { Router } from 'express'

import { getObservation } from '../controllers/insightsController'
import { isAuthenticated } from '../middlewares/isAuthenticated'

const router = Router()

/**
 * @swagger
 * /api/v1/insight/observation:
 *   get:
 *     summary: Get today's observation
 *     description: >
 *       Returns a daily AI-phrased observation about a detected pattern in the
 *       user's recent check-ins. Cached until midnight UTC. Returns null if no
 *       pattern is detected.
 *     tags: [Insight]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Today's observation or null if no pattern detected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   nullable: true
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                       example: Something noticed
 *                     type:
 *                       type: string
 *                       enum:
 *                         - activity_consistency
 *                         - checkin_consistency
 *                         - streak_consistency
 *                         - mood_stability
 *                         - pain_improvement
 *                         - better_days_pattern
 *                     observation:
 *                       type: string
 *                     supportiveDescription:
 *                       type: string
 *                     icon:
 *                       type: string
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
    .route('/observation')
    .get(isAuthenticated, getObservation)

export default router
