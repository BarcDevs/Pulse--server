import { Router } from 'express'

import {
    changeEmail,
    confirmEmail,
    confirmEmailChange,
    forgotPassword,
    getCsrfToken,
    googleCallback,
    googleSignIn,
    login,
    logout,
    me,
    resetPassword,
    signup
} from '../controllers/authController'
import {
    csrfMiddleware,
    extractCsrfToken
} from '../middlewares/csrf'
import { isAuthenticated } from '../middlewares/isAuthenticated'
import { otpRateLimiter } from '../middlewares/rateLimiting'

const router = Router()

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               remember:
 *                 type: boolean
 *                 description: Extend session cookie lifetime
 *     responses:
 *       200:
 *         description: Login successful. Sets accessToken and _csrf cookies.
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
 *                     token:
 *                       type: string
 *                     _csrf:
 *                       type: string
 *                       description: CSRF token to include as x-csrf-token header on subsequent mutation requests
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/login').post(login)

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               username:
 *                 type: string
 *                 description: Optional - auto-generated if omitted
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       201:
 *         description: User created successfully
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
 *         description: Validation error or email already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/signup').post(signup)

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Initiate Google OAuth sign-in flow
 *     description: Generates a state parameter, stores it in an httpOnly cookie, and redirects the user to Google's authorization page.
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects to Google OAuth consent screen
 */
router.route('/google').get(googleSignIn)

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Handle Google OAuth callback
 *     description: Validates the state parameter, exchanges the authorization code for tokens, finds or creates the user, sets auth cookies, and redirects to the client application.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: State parameter for CSRF protection
 *     responses:
 *       302:
 *         description: Redirects to CLIENT_URL with accessToken and _csrf cookies set
 *       401:
 *         description: Invalid state, missing code, unverified email, or authentication failure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
    .route('/google/callback')
    .get(googleCallback)

/**
 * @swagger
 * /auth/confirm-email:
 *   post:
 *     summary: Verify OTP to confirm ownership of the email address
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, OTP]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               OTP:
 *                 type: integer
 *                 description: One-time password received via email
 *     responses:
 *       201:
 *         description: Email confirmed successfully
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
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
    .route('/confirm-email')
    .post(
        otpRateLimiter,
        confirmEmail
    )

/**
 * @swagger
 * /auth/refresh:
 *   get:
 *     summary: Generate a new CSRF token
 *     description: Returns a fresh CSRF token and sets the _csrf cookie. Use the returned token as the x-csrf-token header on mutation requests.
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: CSRF token generated
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
 *                     _csrf:
 *                       type: string
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/refresh').get(
    isAuthenticated,
    getCsrfToken
)

/**
 * @swagger
 * /auth/logout:
 *   get:
 *     summary: Logout and clear authentication cookies
 *     description: Clears both the accessToken and _csrf cookies
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully. Clears accessToken and _csrf cookies.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 */
router.route('/logout').get(logout)

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get the current authenticated user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user info
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
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/me').get(
    isAuthenticated,
    me
)

/**
 * @swagger
 * /auth/forgot-password/{email}:
 *   get:
 *     summary: Request a password reset OTP via email
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: The account email address to send the OTP to
 *     responses:
 *       200:
 *         description: OTP sent to email
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
 *       404:
 *         description: Email not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// OTP-based endpoints don't require CSRF - stateless validation via OTP
router
    .route('/forgot-password/:email')
    .get(
        otpRateLimiter,
        forgotPassword
    )

/**
 * @swagger
 * /auth/reset-password:
 *   put:
 *     summary: Reset password using a verified OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, newPassword, userOTP]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *               userOTP:
 *                 type: integer
 *                 description: OTP received via email
 *     responses:
 *       200:
 *         description: Password reset successfully
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
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// OTP-based endpoints don't require CSRF - stateless validation via OTP
router
    .route('/reset-password')
    .put(
        otpRateLimiter,
        resetPassword
    )

/**
 * @swagger
 * /auth/change-email:
 *   post:
 *     summary: Request an email address change
 *     description: Verifies the user's current password, then sends an OTP to the new email address.
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newEmail, password]
 *             properties:
 *               newEmail:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 description: Current account password for verification
 *     responses:
 *       200:
 *         description: OTP sent to the new email address
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
 *       401:
 *         description: Invalid password or not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
    .route('/change-email')
    .post(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        otpRateLimiter,
        changeEmail
    )

/**
 * @swagger
 * /auth/confirm-email-change:
 *   post:
 *     summary: Confirm the new email address with OTP
 *     description: Verifies the OTP sent to the new email and updates the account email address.
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [OTP]
 *             properties:
 *               OTP:
 *                 type: integer
 *                 description: One-time password received at the new email address
 *     responses:
 *       200:
 *         description: Email updated successfully
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
 *         description: Invalid or expired OTP, or no pending email change
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
 */
router
    .route('/confirm-email-change')
    .post(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        otpRateLimiter,
        confirmEmailChange
    )

export default router
