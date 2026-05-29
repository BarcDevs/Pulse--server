import { Router } from 'express'

import { getRecommendations } from '../controllers/recommendationsController'
import { isAuthenticated } from '../middlewares/isAuthenticated'

const router = Router()

/**
 * @swagger
 * /api/v1/forum/recommendations:
 *   get:
 *     summary: Get post recommendations for the current user
 *     description: >
 *       Returns the 5 most relevant forum posts based on the user's latest
 *       check-in. Recommendations are pre-computed and stored as a snapshot.
 *       The status field indicates whether recommendations are ready or still
 *       being generated.
 *     tags: [Recommendations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [feed]
 *         description: Recommendation type (currently only 'feed' is supported)
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [ready, processing]
 *                     isStale:
 *                       type: boolean
 *                     posts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Post'
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                     basedOnCheckInId:
 *                       type: string
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
    .route('/')
    .get(
        isAuthenticated,
        getRecommendations
    )

export default router
