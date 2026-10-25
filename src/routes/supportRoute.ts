import { Router } from 'express'

import {
    contactSupport,
    getSupportTicketById,
    getSupportTickets,
    getTicketsForReader
} from '../controllers/supportController'
import { isAdmin } from '../middlewares/isAdmin'
import { isAuthenticated } from '../middlewares/isAuthenticated'
import { optionalAuthentication } from '../middlewares/optionalAuthentication'
import {
    supportRateLimiter,
    supportReaderFailedAuthLimiter,
    supportReaderRateLimiter
} from '../middlewares/rateLimiting'
import { supportReaderAuth } from '../middlewares/supportReaderAuth'

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

/**
 * @swagger
 * /support/tickets:
 *   get:
 *     summary: List stored support tickets (admin)
 *     description: >
 *       Admin only (role ADMIN). Newest first, cursor paginated.
 *       Tickets hold personal data (sender email, message).
 *     tags: [Support]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [NEW, ANSWERED, CLOSED]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: The `nextCursor` of the previous page
 *     responses:
 *       200:
 *         description: A page of tickets and the cursor of the next page (null on the last)
 *       400:
 *         description: Invalid query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not an admin
 *       404:
 *         description: Unknown cursor
 */
router.route('/tickets').get(
    isAuthenticated,
    isAdmin,
    getSupportTickets
)

/**
 * @swagger
 * /support/tickets/{ticketId}:
 *   get:
 *     summary: Get one support ticket with its replies (admin)
 *     tags: [Support]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The ticket and its replies, oldest reply first
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not an admin
 *       404:
 *         description: Ticket not found
 */
router.route('/tickets/:ticketId').get(
    isAuthenticated,
    isAdmin,
    getSupportTicketById
)

/**
 * @swagger
 * /support/claude/tickets:
 *   get:
 *     summary: List support tickets for the Claude reader
 *     description: >
 *       Server-to-server. Requires `Authorization Bearer` with
 *       SUPPORT_READER_SECRET (min 16 chars), accepted on this route only.
 *       Returns id, topic, createdAt, status, a short excerpt and a masked
 *       sender email. No user id. Valid reads are limited to 30 per 15
 *       minutes in total; failed attempts are limited to 10 per 15 minutes
 *       per IP.
 *     tags: [Support]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [NEW, ANSWERED, CLOSED]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A page of ticket summaries and the next cursor
 *       400:
 *         description: Invalid query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or wrong secret
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many valid reads, or too many failed attempts from this IP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/claude/tickets').get(
    supportReaderFailedAuthLimiter,
    supportReaderAuth,
    supportReaderRateLimiter,
    getTicketsForReader
)

export default router
