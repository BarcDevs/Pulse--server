import { Router } from 'express'

import {
    createPost,
    createReply,
    deletePost,
    deleteReply,
    getPost,
    getPosts,
    getReplies,
    getTag,
    getTags,
    updatePost,
    updateReply
} from '../controllers/ForumController'
import {
    csrfMiddleware,
    extractCsrfToken
} from '../middlewares/csrf'
import { isAuthenticated } from '../middlewares/isAuthenticated'

const router = Router()

router
    .route('/posts')
    .get(getPosts)
    .post(isAuthenticated, extractCsrfToken, csrfMiddleware, createPost)

router
    .route('/posts/:postId')
    .get(getPost)
    .put(isAuthenticated, extractCsrfToken, csrfMiddleware, updatePost)
    .delete(isAuthenticated, extractCsrfToken, csrfMiddleware, deletePost)

router
    .route('/posts/:postId/reply')
    .get(getReplies)
    .post(isAuthenticated, extractCsrfToken, csrfMiddleware, createReply)

router
    .route('/posts/:postId/reply/:replyId')
    .put(isAuthenticated, extractCsrfToken, csrfMiddleware, updateReply)
    .delete(isAuthenticated, extractCsrfToken, csrfMiddleware, deleteReply)

router.route('/tags').get(getTags)

router.route('/tags/:tagId').get(getTag)

export default router
