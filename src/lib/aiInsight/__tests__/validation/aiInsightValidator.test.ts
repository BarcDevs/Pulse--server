import {
    containsForbiddenMedicalContext,
    containsHardBlockPhrase,
    countSentences,
    getFallbackContent,
    normalizeContent,
    validateGeneratedInsight
} from '../../validation/aiInsightValidator'

describe('normalizeContent', () => {
    it('should trim whitespace', () => {
        expect(normalizeContent('  hello  ')).toBe(
            'hello'
        )
    })

    it('should normalize multiple spaces to single space', () => {
        expect(
            normalizeContent('hello    world')
        ).toBe('hello world')
    })

    it('should handle newlines and tabs', () => {
        expect(
            normalizeContent('hello\n\tworld')
        ).toBe('hello world')
    })
})

describe('containsHardBlockPhrase', () => {
    it('should detect "you may have"', () => {
        expect(
            containsHardBlockPhrase(
                'You may have depression'
            )
        ).toBe(true)
    })

    it('should detect "diagnosed with"', () => {
        expect(
            containsHardBlockPhrase(
                'You were diagnosed with anxiety'
            )
        ).toBe(true)
    })

    it('should detect "treatment plan"', () => {
        expect(
            containsHardBlockPhrase(
                'We recommend a treatment plan'
            )
        ).toBe(true)
    })

    it('should be case insensitive', () => {
        expect(
            containsHardBlockPhrase(
                'YOU MIGHT HAVE symptoms'
            )
        ).toBe(true)
    })

    it('should reject harmless content', () => {
        expect(
            containsHardBlockPhrase(
                'Your mood has shifted recently'
            )
        ).toBe(false)
    })
})

describe('containsForbiddenMedicalContext', () => {
    it('should detect "indicates depression"', () => {
        expect(
            containsForbiddenMedicalContext(
                'This indicates depression'
            )
        ).toBe(true)
    })

    it('should detect "you may have depression"', () => {
        expect(
            containsForbiddenMedicalContext(
                'You may have depression'
            )
        ).toBe(true)
    })

    it('should detect "symptoms of anxiety disorder"', () => {
        expect(
            containsForbiddenMedicalContext(
                'These are symptoms of anxiety disorder'
            )
        ).toBe(true)
    })

    it('should be case insensitive', () => {
        expect(
            containsForbiddenMedicalContext(
                'THIS SUGGESTS DEPRESSION'
            )
        ).toBe(true)
    })

    it('should NOT reject "depression" without diagnostic phrase', () => {
        expect(
            containsForbiddenMedicalContext(
                'Low mood can happen during recovery'
            )
        ).toBe(false)
    })

    it('should NOT reject diagnostic phrase without medical term', () => {
        expect(
            containsForbiddenMedicalContext(
                'This indicates your mood has shifted'
            )
        ).toBe(false)
    })

    it('should NOT reject when words appear separately', () => {
        expect(
            containsForbiddenMedicalContext(
                'Your recent pattern may have changed, and recovery can sometimes feel heavy. It\'s okay to notice depression when it feels genuine.'
            )
        ).toBe(false)
    })

    it('should detect "signs of disease"', () => {
        expect(
            containsForbiddenMedicalContext(
                'These are signs of disease'
            )
        ).toBe(true)
    })

    it('should detect "might have syndrome"', () => {
        expect(
            containsForbiddenMedicalContext(
                'You might have syndrome'
            )
        ).toBe(true)
    })
})

describe('countSentences', () => {
    it('should count sentences ending with periods', () => {
        expect(
            countSentences('Hello. World. Test.')
        ).toBe(3)
    })

    it('should count sentences ending with question marks', () => {
        expect(
            countSentences(
                'What is this? How are you?'
            )
        ).toBe(2)
    })

    it('should count sentences ending with exclamation marks', () => {
        expect(
            countSentences('Great! Amazing!')
        ).toBe(2)
    })

    it('should handle mixed punctuation', () => {
        expect(
            countSentences(
                'What is this? Great! Amazing.'
            )
        ).toBe(3)
    })

    it('should count single sentence without punctuation as 1', () => {
        expect(
            countSentences(
                'Keep noticing what helps and what feels heavier lately'
            )
        ).toBe(1)
    })

    it('should ignore trailing whitespace', () => {
        expect(
            countSentences('Hello. World.  ')
        ).toBe(2)
    })

    it('should handle multiple punctuation marks', () => {
        expect(
            countSentences('Hello!! World??')
        ).toBe(2)
    })
})

describe('validateGeneratedInsight', () => {
    describe('valid output', () => {
        it('should pass valid insight', () => {
            const result = validateGeneratedInsight(
                'Test Title',
                'This is a valid insight about your mood and progress.'
            )
            expect(result.isValid).toBe(true)
            expect(result.reason).toBeUndefined()
        })

        it('should pass insight with exactly min length', () => {
            const content = 'a'.repeat(20)
            const result = validateGeneratedInsight(
                'Title',
                content
            )
            expect(result.isValid).toBe(true)
        })

        it('should pass insight with exactly max length', () => {
            const content = 'a'.repeat(500)
            const result = validateGeneratedInsight(
                'Title',
                content
            )
            expect(result.isValid).toBe(true)
        })
    })

    describe('empty/missing content', () => {
        it('should reject empty title', () => {
            const result = validateGeneratedInsight(
                '',
                'Content here'
            )
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('Title is empty')
        })

        it('should reject whitespace-only title', () => {
            const result = validateGeneratedInsight(
                '   ',
                'Content here'
            )
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('Title is empty')
        })

        it('should reject empty content', () => {
            const result = validateGeneratedInsight(
                'Title',
                ''
            )
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain(
                'Content is empty'
            )
        })

        it('should reject whitespace-only content', () => {
            const result = validateGeneratedInsight(
                'Title',
                '   '
            )
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain(
                'Content is empty'
            )
        })
    })

    describe('length validation', () => {
        it('should reject content shorter than min', () => {
            const result = validateGeneratedInsight(
                'Title',
                'Too short'
            )
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('too short')
        })

        it('should reject content longer than max', () => {
            const longContent = 'a'.repeat(501)
            const result = validateGeneratedInsight(
                'Title',
                longContent
            )
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('too long')
        })
    })

    describe('hard block phrases', () => {
        it('should reject "you may have"', () => {
            const result = validateGeneratedInsight(
                'Title',
                'You may have depression or anxiety'
            )
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain(
                'prohibited diagnostic language'
            )
        })

        it('should reject "diagnosed with"', () => {
            const result = validateGeneratedInsight(
                'Title',
                'You have been diagnosed with a condition'
            )
            expect(result.isValid).toBe(false)
        })

        it('should reject "treatment plan"', () => {
            const result = validateGeneratedInsight(
                'Title',
                'Here is your treatment plan for recovery'
            )
            expect(result.isValid).toBe(false)
        })
    })

    describe('medical context phrases', () => {
        it('should reject "indicates depression"', () => {
            const result = validateGeneratedInsight(
                'Title',
                'Your low mood indicates depression and we recommend support'
            )
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain(
                'medical terms with diagnostic phrasing'
            )
        })

        it('should reject "symptoms of anxiety disorder"', () => {
            const result = validateGeneratedInsight(
                'Title',
                'You are showing symptoms of anxiety disorder'
            )
            expect(result.isValid).toBe(false)
        })

        it('should pass "depression" without diagnostic phrase', () => {
            const result = validateGeneratedInsight(
                'Title',
                'Many people experience low mood during difficult times. It\'s normal to feel this way.'
            )
            expect(result.isValid).toBe(true)
        })
    })

    describe('sentence count validation', () => {
        it('should reject content with > 4 sentences', () => {
            const result = validateGeneratedInsight(
                'Title',
                'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.'
            )
            expect(result.isValid).toBe(false)
            expect(result.reason).toContain(
                'too many sentences'
            )
        })

        it('should allow exactly 4 sentences', () => {
            const result = validateGeneratedInsight(
                'Title',
                'First sentence. Second sentence. Third sentence. Fourth sentence.'
            )
            expect(result.isValid).toBe(true)
        })

        it('should allow 1-3 sentences', () => {
            const result = validateGeneratedInsight(
                'Title',
                'Only one sentence here'
            )
            expect(result.isValid).toBe(true)
        })
    })
})

describe('getFallbackContent', () => {
    it('should return fallback for MOOD_DROP_ALERT', () => {
        const fallback = getFallbackContent(
            'MOOD_DROP_ALERT'
        )
        expect(fallback).toContain('lower recently')
        expect(fallback.length).toBeGreaterThan(20)
        expect(fallback.length).toBeLessThanOrEqual(500)
    })

    it('should return fallback for MOTIVATIONAL', () => {
        const fallback = getFallbackContent(
            'MOTIVATIONAL'
        )
        expect(fallback).toContain('Consistency')
        expect(fallback.length).toBeGreaterThan(20)
        expect(fallback.length).toBeLessThanOrEqual(500)
    })

    it('should return fallback for WEEKLY_SUMMARY', () => {
        const fallback = getFallbackContent(
            'WEEKLY_SUMMARY'
        )
        expect(fallback).toContain('week')
        expect(fallback.length).toBeGreaterThan(20)
        expect(fallback.length).toBeLessThanOrEqual(500)
    })

    it('all fallbacks should pass validation', () => {
        const types = [
            'MOOD_DROP_ALERT',
            'MOTIVATIONAL',
            'WEEKLY_SUMMARY'
        ] as const

        types.forEach((type) => {
            const fallback = getFallbackContent(type)
            const validation =
                validateGeneratedInsight(
                    'Test',
                    fallback
                )
            expect(validation.isValid).toBe(true)
        })
    })
})