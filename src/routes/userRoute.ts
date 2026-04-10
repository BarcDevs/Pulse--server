import { Router } from 'express'

import {
    deleteUser,
    updatePassword,
    updateUser
} from '../controllers/UserController'
import {
    csrfMiddleware,
    extractCsrfToken
} from '../middlewares/csrf'
import { isAuthenticated } from '../middlewares/isAuthenticated'

const router = Router()

/**
 * @swagger
 * /api/v1/users/me:
 *   patch:
 *     summary: Update user account information
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               lastName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: User updated successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email or username already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
    .route('/me')
    .patch(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        updateUser
    )

/**
 * @swagger
 * /api/v1/users/password:
 *   patch:
 *     summary: Update user password
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: Must contain letters and numbers
 *     responses:
 *       200:
 *         description: Password updated successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authenticated or invalid current password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
    .route('/password')
    .patch(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        updatePassword
    )

/**
 * @swagger
 * /api/v1/users/me:
 *   delete:
 *     summary: Deactivate user account
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     responses:
 *       204:
 *         description: User account deactivated successfully
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
    .route('/me')
    .delete(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        deleteUser
    )

export default router