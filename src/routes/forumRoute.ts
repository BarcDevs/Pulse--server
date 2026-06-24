import { Router } from 'express'

import {
    createPost,
    createReply,
    deletePost,
    deleteReply,
    getCategoryStats,
    getPost,
    getPosts,
    getReplies,
    getSavedPosts,
    getTag,
    getTags,
    getUnknownTagAttempts,
    likePost,
    likeReply,
    reportUnknownTag,
    savePost,
    sharePost,
    updatePost,
    updateReply
} from '../controllers/forumController'
import {
    csrfMiddleware,
    extractCsrfToken
} from '../middlewares/csrf'
import { isAdmin } from '../middlewares/isAdmin'
import { isAuthenticated } from '../middlewares/isAuthenticated'
import { sharePostRateLimiter } from '../middlewares/rateLimiting'

import recommendationsRoute from './recommendationsRoute'

const router = Router()

/**
 * @swagger
 * /forum/posts:
 *   get:
 *     summary: Get a paginated list of posts
 *     tags: [Forum]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 100
 *         description: Number of posts to return
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [newest, popular, hot, unanswered]
 *         description: Sort / filter preset
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title, body, category, tag name, or author name (case-insensitive)
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter by tag name
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: List of posts
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
 *                     $ref: '#/components/schemas/Post'
 *       404:
 *         description: No posts found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Create a new forum post
 *     tags: [Forum]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, body, category, tags]
 *             properties:
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 *       401:
 *         description: Not authenticated or invalid CSRF token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /forum/posts/categories:
 *   get:
 *     summary: Get post count grouped by category
 *     tags: [Forum]
 *     responses:
 *       200:
 *         description: Category appearance counts
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
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                       count:
 *                         type: integer
 */
router
    .route('/posts/categories')
    .get(getCategoryStats)

/**
 * @swagger
 * /forum/posts/saved:
 *   get:
 *     summary: Get current user's saved posts
 *     tags: [Forum]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of saved posts
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
 *                     $ref: '#/components/schemas/Post'
 *       401:
 *         description: Not authenticated
 */
router
    .route('/posts/saved')
    .get(isAuthenticated, getSavedPosts)

router
    .route('/posts')
    .get(getPosts)
    .post(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        createPost
    )

/**
 * @swagger
 * /forum/posts/{postId}:
 *   get:
 *     summary: Get a single post by ID
 *     tags: [Forum]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Max number of replies to include inline. Defaults to 10
 *     responses:
 *       200:
 *         description: Post found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 *       404:
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: Update a post (owner only)
 *     tags: [Forum]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               vote:
 *                 type: object
 *                 required: [userId, vote]
 *                 properties:
 *                   userId:
 *                     type: string
 *                   vote:
 *                     type: string
 *                     enum: [up]
 *     responses:
 *       200:
 *         description: Post updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 *       401:
 *         description: Not authenticated or invalid CSRF token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not the post owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Delete a post (owner only)
 *     tags: [Forum]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       401:
 *         description: Not authenticated or invalid CSRF token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not the post owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
    .route('/posts/:postId')
    .get(getPost)
    .put(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        updatePost
    )
    .delete(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        deletePost
    )

/**
 * @swagger
 * /forum/posts/{postId}/like:
 *   post:
 *     summary: Toggle like on a post
 *     tags: [Forum]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like toggled
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
 *                     liked:
 *                       type: boolean
 *                     likes:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Post not found
 */
router.route('/posts/:postId/like').post(
    isAuthenticated,
    extractCsrfToken,
    csrfMiddleware,
    likePost
)

/**
 * @swagger
 * /forum/posts/{postId}/save:
 *   post:
 *     summary: Toggle save on a post
 *     tags: [Forum]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Save toggled
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
 *                     saved:
 *                       type: boolean
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Post not found
 */
router.route('/posts/:postId/save').post(
    isAuthenticated,
    extractCsrfToken,
    csrfMiddleware,
    savePost
)

/**
 * @swagger
 * /forum/posts/{postId}/share:
 *   post:
 *     summary: Increment a post's share count
 *     description: Rate limited to 1 request per IP per post per hour.
 *     tags: [Forum]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Share count incremented
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
 *                     shareCount:
 *                       type: integer
 *       404:
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
    .route('/posts/:postId/share')
    .post(sharePostRateLimiter, sharePost)

/**
 * @swagger
 * /forum/posts/{postId}/replies:
 *   get:
 *     summary: Get replies for a post with pagination
 *     tags: [Forum]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of replies per page. Defaults to 10
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (requires limit)
 *     responses:
 *       200:
 *         description: List of replies
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
 *                     $ref: '#/components/schemas/Reply'
 *       404:
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Create a reply on a post
 *     tags: [Forum]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body]
 *             properties:
 *               body:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reply created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Reply'
 *       401:
 *         description: Not authenticated or invalid CSRF token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
    .route('/posts/:postId/replies')
    .get(getReplies)
    .post(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        createReply
    )

/**
 * @swagger
 * /forum/posts/{postId}/replies/{replyId}:
 *   put:
 *     summary: Update a reply (owner only)
 *     tags: [Forum]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: replyId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               body:
 *                 type: string
 *               vote:
 *                 type: object
 *                 required: [userId, vote]
 *                 properties:
 *                   userId:
 *                     type: string
 *                   vote:
 *                     type: string
 *                     enum: [up]
 *     responses:
 *       200:
 *         description: Reply updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Reply'
 *       401:
 *         description: Not authenticated or invalid CSRF token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not the reply owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Delete a reply (owner only)
 *     tags: [Forum]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: replyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reply deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       401:
 *         description: Not authenticated or invalid CSRF token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not the reply owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
    .route('/posts/:postId/replies/:replyId')
    .put(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        updateReply
    )
    .delete(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        deleteReply
    )

/**
 * @swagger
 * /forum/posts/{postId}/replies/{replyId}/like:
 *   post:
 *     summary: Toggle like on a reply
 *     tags: [Forum]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: replyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like toggled
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
 *                     liked:
 *                       type: boolean
 *                     likes:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Reply not found
 */
router.route('/posts/:postId/replies/:replyId/like').post(
    isAuthenticated,
    extractCsrfToken,
    csrfMiddleware,
    likeReply
)

/**
 * @swagger
 * /forum/tags:
 *   get:
 *     summary: Get a list of tags
 *     tags: [Forum]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 100
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [popular]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of tags
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
 *                     $ref: '#/components/schemas/Tag'
 *       404:
 *         description: No tags found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/tags').get(getTags)

/**
 * @swagger
 * /forum/tags/unknown:
 *   get:
 *     summary: Get unknown tag attempts (admin only)
 *     tags: [Forum]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of unknown tag attempts ordered by count
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       tagName:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       lastSeenAt:
 *                         type: string
 *                         format: date-time
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not an admin
 */
/**
 * @swagger
 * /forum/tags/unknown:
 *   post:
 *     summary: Report an unknown tag attempt
 *     tags: [Forum]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tagName]
 *             properties:
 *               tagName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Attempt recorded
 *       401:
 *         description: Not authenticated
 */
router
    .route('/tags/unknown')
    .get(
        isAuthenticated,
        isAdmin,
        getUnknownTagAttempts
    )
    .post(
        isAuthenticated,
        extractCsrfToken,
        csrfMiddleware,
        reportUnknownTag
    )

/**
 * @swagger
 * /forum/tags/{tagId}:
 *   get:
 *     summary: Get a single tag by ID
 *     tags: [Forum]
 *     parameters:
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tag found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Tag'
 *       404:
 *         description: Tag not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/tags/:tagId').get(getTag)

router.use('/recommendations', recommendationsRoute)

export default router
