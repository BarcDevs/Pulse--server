// @ts-nocheck
import { selectDiversePosts } from '../../../lib/recommendations/diversitySelector'

const makePost = (id: string, overrides: Record<string, unknown> = {}) => ({
    post: {
        id,
        title: 'test post',
        body: 'test body',
        tags: [],
        _count: { replies: 0 },
        authorId: `author-${id}`
    },
    score: 0.5,
    breakdown: {
        condition: 0.3,
        semantic: 0.3,
        stage: 0.2,
        engagement: 0.1,
        recency: 0.1
    },
    contentType: 'practical_advice',
    ...overrides
})

describe('selectDiversePosts', () => {
    it('returns all posts when fewer than 5', () => {
        const posts = [makePost('1'), makePost('2'), makePost('3')]
        const result = selectDiversePosts(posts, 5)
        expect(result).toHaveLength(3)
    })

    it('returns posts sorted by score when fewer than 5', () => {
        const posts = [
            makePost('1', { score: 0.3 }),
            makePost('2', { score: 0.9 }),
            makePost('3', { score: 0.6 })
        ]
        const result = selectDiversePosts(posts, 3)
        expect(result[0].score).toBe(0.9)
        expect(result[1].score).toBe(0.6)
    })

    it('returns at most n posts', () => {
        const posts = Array.from({ length: 10 }, (_, i) => makePost(`${i}`))
        const result = selectDiversePosts(posts, 3)
        expect(result.length).toBeLessThanOrEqual(3)
    })

    it('selects diverse content types from large pool', () => {
        const posts = [
            makePost('1', {
                score: 0.9,
                post: {
                    id: '1',
                    title: 'support help',
                    body: 'struggle and coping',
                    tags: [],
                    _count: { replies: 0 },
                    authorId: 'a1'
                }
            }),
            makePost('2', {
                score: 0.8,
                post: {
                    id: '2',
                    title: 'milestone achieved',
                    body: 'breakthrough success story',
                    tags: [],
                    _count: { replies: 0 },
                    authorId: 'a2'
                }
            }),
            makePost('3', {
                score: 0.7,
                post: {
                    id: '3',
                    title: 'practical tips guide',
                    body: 'step by step advice',
                    tags: [],
                    _count: { replies: 0 },
                    authorId: 'a3'
                }
            }),
            makePost('4', {
                score: 0.6,
                post: {
                    id: '4',
                    title: 'social discussion',
                    body: 'community discussion',
                    tags: [],
                    _count: { replies: 6 },
                    authorId: 'a4'
                }
            }),
            makePost('5', {
                score: 0.5,
                post: {
                    id: '5',
                    title: 'similar journey',
                    body: 'similar experience shared',
                    tags: [],
                    _count: { replies: 0 },
                    authorId: 'a5'
                },
                breakdown: {
                    condition: 0.8,
                    semantic: 0.1,
                    stage: 0.05,
                    engagement: 0.03,
                    recency: 0.02
                }
            }),
            makePost('6', {
                score: 0.4,
                post: {
                    id: '6',
                    title: 'post 6',
                    body: 'body 6',
                    tags: [],
                    _count: { replies: 0 },
                    authorId: 'a6'
                }
            })
        ]

        const result = selectDiversePosts(posts, 5)
        expect(result.length).toBeGreaterThan(0)
        expect(result.length).toBeLessThanOrEqual(5)

        const ids = result.map((p) => p.post.id)
        const unique = new Set(ids)
        expect(unique.size).toBe(ids.length)
    })

    it('does not include duplicate post ids', () => {
        const posts = Array.from({ length: 8 }, (_, i) => makePost(`${i}`))
        const result = selectDiversePosts(posts, 5)
        const ids = result.map((p) => p.post.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('respects the n limit', () => {
        const posts = Array.from({ length: 20 }, (_, i) =>
            makePost(`${i}`, { score: 1 - i * 0.01 })
        )
        const result = selectDiversePosts(posts, 4)
        expect(result.length).toBeLessThanOrEqual(4)
    })
})
