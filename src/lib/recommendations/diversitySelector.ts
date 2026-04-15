import type { ScoredPost } from '../../types/data/RecommendationType'

type ContentType =
    | 'emotional_support'
    | 'success_story'
    | 'practical_advice'
    | 'similar_experience'
    | 'social_engaging'

const EMOTIONAL_SUPPORT_KEYWORDS = [
    'support', 'struggle', 'feeling', 'vent', 'help', 'coping'
]

const SUCCESS_STORY_KEYWORDS = [
    'success', 'milestone', 'achieved', 'progress', 'breakthrough'
]

const PRACTICAL_ADVICE_KEYWORDS = [
    'tips', 'advice', 'guide', 'how', 'tutorial', 'steps'
]

const classifyContentType = (
    post: ScoredPost
): ContentType => {
    const text = (
        `${post.post.title} ${post.post.body}`
    ).toLowerCase()

    const tagNames = (post.post.tags || [])
        .map((tag) => tag.name.toLowerCase())
        .join(' ')

    const fullText = `${text} ${tagNames}`

    const replyCount = post.post._count?.replies ?? 0

    if (
        EMOTIONAL_SUPPORT_KEYWORDS.some((kw) =>
            fullText.includes(kw)
        )
    ) return 'emotional_support'

    if (
        SUCCESS_STORY_KEYWORDS.some((kw) =>
            fullText.includes(kw)
        )
    ) return 'success_story'

    if (
        PRACTICAL_ADVICE_KEYWORDS.some((kw) =>
            fullText.includes(kw)
        )
    ) return 'practical_advice'

    if (replyCount >= 5)
        return 'social_engaging'

    if (post.breakdown.condition > 0.5)
        return 'similar_experience'

    return 'practical_advice'
}

export const selectDiversePosts = (
    scoredPosts: ScoredPost[],
    n: number = 5
): ScoredPost[] => {
    if (scoredPosts.length < 5)
        return scoredPosts.slice(0, n).sort(
            (a, b) => b.score - a.score
        )

    const top15 = scoredPosts.slice(0, 15)

    const classified = top15.map((post) => ({
        ...post,
        contentType: classifyContentType(post)
    }))

    const buckets: Partial<Record<ContentType, ScoredPost[]>> = {
        emotional_support: [],
        success_story: [],
        practical_advice: [],
        similar_experience: [],
        social_engaging: []
    }

    classified.forEach((post) => {
        const bucket = buckets[post.contentType as ContentType]
        if (bucket) bucket.push(post)
    })

    const selected: ScoredPost[] = []
    const authorSet = new Set<string>()

    const contentTypes: ContentType[] = [
        'emotional_support',
        'success_story',
        'practical_advice',
        'similar_experience',
        'social_engaging'
    ]

    for (const contentType of contentTypes) {
        const bucket = buckets[contentType] || []
        for (const post of bucket) {
            const authorId = post.post.authorId || ''
            if (
                selected.length < n
                && !authorSet.has(authorId)
            ) {
                selected.push(post)
                if (authorId)
                    authorSet.add(authorId)
                break
            }
        }
    }

    const top3Score = classified.length >= 3
        ? classified[2].score
        : 0

    const allowPriorityOverride = classified.length >= 4
        && classified[3].score < top3Score - 0.2

    if (
        selected.length < n && allowPriorityOverride
        && selected.length === 3
    ) {
        for (const post of classified) {
            if (selected.length >= n) break
            if (!selected.some((s) =>
                s.post.id === post.post.id
            )) {
                selected.push(post)
                break
            }
        }
    }

    for (const post of classified) {
        if (
            selected.length >= n
            || selected.some((s) => s.post.id === post.post.id)
        ) continue

        if (post.post.authorId) {
            const authorCount = selected.filter(
                (s) => s.post.authorId === post.post.authorId
            ).length

            if (authorCount < 2)
                selected.push(post)
        } else
            selected.push(post)
    }

    return selected.slice(0, n)
}
