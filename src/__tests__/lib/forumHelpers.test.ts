// @ts-nocheck
import { ensurePostExists, extractRemovedTags, validateOwnerHelper } from '../../lib/forumHelpers'
import * as forumModel from '../../models/forumModel'

jest.mock('../../models/forumModel')
jest.mock('../../errors/factory/ErrorFactory', () => ({
    errorFactory: {
        generic: {
            notFound: jest.fn((name) => new Error(`${name} not found`))
        },
        auth: {
            unauthorized: jest.fn((msg) => new Error(msg))
        },
        validation: {
            generic: jest.fn((msg) => new Error(msg))
        }
    }
}))
jest.mock('../../utils/capitalizeText', () => ({
    capitalizeText: jest.fn((s) => s.charAt(0).toUpperCase() + s.slice(1))
}))

const mockGetPost = forumModel.getPost as jest.Mock
const mockGetReply = forumModel.getReply as jest.Mock

beforeEach(() => jest.clearAllMocks())

// ==================== ensurePostExists ====================
describe('ensurePostExists', () => {
    it('returns post when found', async () => {
        const post = { id: 'post-1', authorId: 'user-1', title: 'Hello' }
        mockGetPost.mockResolvedValue(post)

        const result = await ensurePostExists('post-1')

        expect(result).toEqual(post)
    })

    it('throws when post not found', async () => {
        mockGetPost.mockResolvedValue(null)

        await expect(ensurePostExists('missing')).rejects.toThrow('Post not found')
    })

    it('propagates model error', async () => {
        mockGetPost.mockRejectedValue(new Error('DB error'))

        await expect(ensurePostExists('post-1')).rejects.toThrow('DB error')
    })
})

// ==================== extractRemovedTags ====================
describe('extractRemovedTags', () => {
    const makeTags = (labels: string[]) =>
        labels.map((l) => ({ id: l, label: { en: l } }))

    it('returns undefined when prevTags is undefined', () => {
        expect(extractRemovedTags(undefined, ['tag1'])).toBeUndefined()
    })

    it('returns undefined when newTagNames is undefined', () => {
        expect(extractRemovedTags(makeTags(['tag1']), undefined)).toBeUndefined()
    })

    it('returns all prevTags when newTagNames is empty', () => {
        const tags = makeTags(['tag1', 'tag2'])
        expect(extractRemovedTags(tags, [])).toEqual(tags)
    })

    it('returns empty array when prevTags is empty', () => {
        expect(extractRemovedTags([], ['tag1'])).toEqual([])
    })

    it('returns tags not present in newTagNames', () => {
        const tags = makeTags(['tag1', 'tag2', 'tag3'])
        const result = extractRemovedTags(tags, ['tag1'])
        expect(result).toHaveLength(2)
        expect(result!.map((t) => t.label.en)).toEqual(['tag2', 'tag3'])
    })

    it('returns empty when all prevTags retained in newTagNames', () => {
        const tags = makeTags(['tag1', 'tag2'])
        expect(extractRemovedTags(tags, ['tag1', 'tag2'])).toEqual([])
    })

    it('handles single-element arrays', () => {
        const tags = makeTags(['only'])
        expect(extractRemovedTags(tags, ['other'])).toEqual(tags)
        expect(extractRemovedTags(tags, ['only'])).toEqual([])
    })

    it('handles large arrays (N=50)', () => {
        const labels = Array.from({ length: 50 }, (_, i) => `tag${i}`)
        const tags = makeTags(labels)
        const keeping = labels.slice(0, 25)
        const result = extractRemovedTags(tags, keeping)
        expect(result).toHaveLength(25)
    })
})

// ==================== validateOwnerHelper ====================
describe('validateOwnerHelper', () => {
    const postId = 'post-1'
    const userId = 'user-1'
    const replyId = 'reply-1'

    it('throws when post not found', async () => {
        mockGetPost.mockResolvedValue(null)

        await expect(
            validateOwnerHelper('post', postId, userId)
        ).rejects.toThrow('Post not found')
    })

    it('throws when user is not post author', async () => {
        mockGetPost.mockResolvedValue({ id: postId, authorId: 'other-user' })

        await expect(
            validateOwnerHelper('post', postId, userId)
        ).rejects.toThrow()
    })

    it('resolves when user is post author', async () => {
        mockGetPost.mockResolvedValue({ id: postId, authorId: userId })

        await expect(
            validateOwnerHelper('post', postId, userId)
        ).resolves.toBeUndefined()
    })

    it('throws when reply schema used without replyId', async () => {
        await expect(
            validateOwnerHelper('reply', postId, userId, undefined)
        ).rejects.toThrow()
        expect(mockGetReply).not.toHaveBeenCalled()
    })

    it('throws when reply not found', async () => {
        mockGetReply.mockResolvedValue(null)

        await expect(
            validateOwnerHelper('reply', postId, userId, replyId)
        ).rejects.toThrow('Reply not found')
    })

    it('throws when user is not reply author', async () => {
        mockGetReply.mockResolvedValue({ id: replyId, authorId: 'other-user' })

        await expect(
            validateOwnerHelper('reply', postId, userId, replyId)
        ).rejects.toThrow()
    })

    it('resolves when user is reply author', async () => {
        mockGetReply.mockResolvedValue({ id: replyId, authorId: userId })

        await expect(
            validateOwnerHelper('reply', postId, userId, replyId)
        ).resolves.toBeUndefined()
    })
})
