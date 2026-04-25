import { Router } from 'express'

import {
    completeGoal,
    completeMilestone,
    createGoal,
    createMilestones,
    deleteGoal,
    deleteMilestone,
    getGoal,
    getGoals,
    updateGoal,
    updateMilestone
} from '../controllers/recoveryGoalController'
import {
    csrfMiddleware,
    extractCsrfToken
} from '../middlewares/csrf'
import { isAuthenticated } from '../middlewares/isAuthenticated'

const router = Router()

/**
 * @swagger
 * /api/v1/recovery-goals:
 *   post:
 *     summary: Create a new recovery goal
 *     tags: [Recovery Goals]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 150
 *                 description: Goal title
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Optional goal description
 *     responses:
 *       201:
 *         description: Goal created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: Get all recovery goals for the current user
 *     tags: [Recovery Goals]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of goals with milestones
 *       401:
 *         description: Unauthorized
 */
router
    .route('/')
    .post(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        createGoal
    )
    .get(isAuthenticated, getGoals)

/**
 * @swagger
 * /api/v1/recovery-goals/{goalId}:
 *   get:
 *     summary: Get a single recovery goal with all milestones
 *     tags: [Recovery Goals]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *         description: The goal ID
 *     responses:
 *       200:
 *         description: Goal details with milestones
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Goal not found
 *   patch:
 *     summary: Update a recovery goal
 *     tags: [Recovery Goals]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *         description: The goal ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 150
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Goal updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Goal not found
 *   delete:
 *     summary: Delete a recovery goal and all its milestones
 *     tags: [Recovery Goals]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *         description: The goal ID
 *     responses:
 *       200:
 *         description: Goal deleted successfully (cascades to milestones)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Goal not found
 */
router
    .route('/:goalId')
    .get(isAuthenticated, getGoal)
    .patch(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        updateGoal
    )
    .delete(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        deleteGoal
    )

/**
 * @swagger
 * /api/v1/recovery-goals/{goalId}/milestones:
 *   post:
 *     summary: Create milestones for a recovery goal
 *     tags: [Recovery Milestones]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *         description: The goal ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [milestones]
 *             properties:
 *               milestones:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 8
 *                 items:
 *                   type: object
 *                   required: [title, order]
 *                   properties:
 *                     title:
 *                       type: string
 *                       maxLength: 150
 *                       description: Milestone title
 *                     description:
 *                       type: string
 *                       maxLength: 1000
 *                       description: Optional milestone description
 *                     order:
 *                       type: integer
 *                       minimum: 1
 *                       description: Milestone order (required, client-provided)
 *     responses:
 *       201:
 *         description: Milestones created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Goal not found
 *       409:
 *         description: Goal not active or maximum 8 milestones per goal exceeded
 */
router
    .route('/:goalId/milestones')
    .post(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        createMilestones
    )

/**
 * @swagger
 * /api/v1/recovery-goals/{goalId}/milestones/{milestoneId}:
 *   patch:
 *     summary: Update a milestone (title, description, and/or order)
 *     tags: [Recovery Milestones]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *         description: The goal ID
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema:
 *           type: string
 *         description: The milestone ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 150
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               order:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Milestone updated successfully
 *       401:
 *         description: Unauthorized or milestone belongs to different user
 *       404:
 *         description: Milestone not found
 *       409:
 *         description: Cannot modify completed milestones
 *   delete:
 *     summary: Delete a milestone
 *     tags: [Recovery Milestones]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *         description: The goal ID
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema:
 *           type: string
 *         description: The milestone ID
 *     responses:
 *       200:
 *         description: Milestone deleted successfully
 *       401:
 *         description: Unauthorized or milestone belongs to different user
 *       404:
 *         description: Milestone not found
 */
router
    .route('/:goalId/milestones/:milestoneId')
    .patch(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        updateMilestone
    )
    .delete(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        deleteMilestone
    )

/**
 * @swagger
 * /api/v1/recovery-goals/{goalId}/milestones/{milestoneId}/complete:
 *   patch:
 *     summary: Mark milestone as completed and advance to next
 *     tags: [Recovery Milestones]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *         description: The goal ID
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema:
 *           type: string
 *         description: The milestone ID
 *     responses:
 *       200:
 *         description: Milestone completed, next advanced
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Milestone or goal not found
 *       409:
 *         description: Goal not active or milestone cannot be completed
 */
router
    .route('/:goalId/milestones/:milestoneId/complete')
    .patch(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        completeMilestone
    )

/**
 * @swagger
 * /api/v1/recovery-goals/{goalId}/complete:
 *   patch:
 *     summary: Manually mark goal as completed
 *     tags: [Recovery Goals]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *         description: The goal ID
 *     responses:
 *       200:
 *         description: Goal completed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Goal not found
 *       409:
 *         description: Cannot complete goal with incomplete milestones
 */
router
    .route('/:goalId/complete')
    .patch(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        completeGoal
    )

export default router
