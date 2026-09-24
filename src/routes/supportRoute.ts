import { Router } from 'express'

import { contactSupport } from '../controllers/supportController'
import { optionalAuthentication } from '../middlewares/optionalAuthentication'
import { supportRateLimiter } from '../middlewares/rateLimiting'

const router = Router()

/**
 * @swagger
 * /support/contact:
 *   post:
 *     summary: Send a message to the support team
 *     description: >
 *       Public endpoint - no authentication or CSRF token required.
 *       If a valid accessToken cookie is present, the signed-in user's
 *       account email is used as the sender and `email` is ignored.
 *       Rate limited to 5 requests per 15 minutes per IP.
 *     tags: [Support]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [topic, message]
 *             properties:
 *               topic:
 *                 type: string
 *                 enum: [account, billing, technical, privacy, careTeam, feedback, other]
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Required when the user is not signed in
 *     responses:
 *       200:
 *         description: Support message sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many support messages from this IP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Email delivery failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/contact').post(
    supportRateLimiter,
    optionalAuthentication,
    contactSupport
)

export default router
