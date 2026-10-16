import { Router } from 'express'

import {
    getLaunchFunnel,
    openLaunchLink
} from '../controllers/launchFunnelController'
import { launchFunnelAuth } from '../middlewares/launchFunnelAuth'
import { launchFunnelOpenRateLimiter } from '../middlewares/rateLimiting'

const router = Router()

/**
 * @swagger
 * /launch-funnel/open:
 *   post:
 *     summary: Record that a visitor arrived from a Launch Mailer link
 *     description: Public, no CSRF (the visitor has no session yet). Stores the opaque `lm` token and sets an httpOnly cookie so a later signup, by email or Google, is attributed to it.
 *     tags: [Launch Funnel]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 description: The `lm` query param (16-128 chars of A-Z a-z 0-9 _ -)
 *     responses:
 *       204:
 *         description: Recorded
 *       400:
 *         description: Invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/open').post(
    launchFunnelOpenRateLimiter,
    openLaunchLink
)

/**
 * @swagger
 * /launch-funnel:
 *   get:
 *     summary: Launch Mailer funnel counts for preflight
 *     description: Server-to-server. Requires `Authorization Bearer` with the shared secret. Every registered token is also in opened.
 *     tags: [Launch Funnel]
 *     responses:
 *       200:
 *         description: Distinct tokens, no PII
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 opened:
 *                   type: array
 *                   items:
 *                     type: string
 *                 registered:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Missing or wrong secret
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/').get(
    launchFunnelAuth,
    getLaunchFunnel
)

export default router
