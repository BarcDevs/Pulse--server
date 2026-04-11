import {
    detectHighPain,
    detectLowMood,
    detectLowState,
    detectNegativeTrend
} from '../../../services/feedback/interventionEngine'
import type { CheckInType } from '../../../types/data/CheckInType'

const createMockCheckIn = (
    overrides?: Partial<CheckInType>
): CheckInType => ({
    id: 'check-in-1',
    profileId: 'profile-1',
    checkInDate: new Date('2026-04-10'),
    moodScore: 5,
    painLevel: 4,
    activities: ['walking'],
    notes: null,
    createdAt: new Date(),
    updatedAt: null,
    insights: [],
    ...overrides
})

describe('Intervention Engine - Detection Rules', () => {
    describe('detectLowMood', () => {
        it('should trigger when mood score is 3 (boundary)', () => {
            const checkIn = createMockCheckIn({ moodScore: 3 })
            const result = detectLowMood(checkIn)

            expect(result.triggered).toBe(true)
            expect(result.reason).toBe('LOW_MOOD')
            expect(result.weight).toBe(0.7)
        })

        it('should trigger when mood score is below 3', () => {
            const checkIn = createMockCheckIn({ moodScore: 1 })
            const result = detectLowMood(checkIn)

            expect(result.triggered).toBe(true)
            expect(result.reason).toBe('LOW_MOOD')
            expect(result.weight).toBeGreaterThan(0)
        })

        it('should not trigger when mood score is above 3', () => {
            const checkIn = createMockCheckIn({ moodScore: 4 })
            const result = detectLowMood(checkIn)

            expect(result.triggered).toBe(false)
            expect(result.reason).toBeUndefined()
            expect(result.weight).toBe(0)
        })

        it('should calculate weight correctly for severe low mood', () => {
            const checkIn = createMockCheckIn({ moodScore: 0 })
            const result = detectLowMood(checkIn)

            expect(result.triggered).toBe(true)
            expect(result.weight).toBe(1)
        })
    })

    describe('detectHighPain', () => {
        it('should trigger when pain level is 7 (boundary)', () => {
            const checkIn = createMockCheckIn({ painLevel: 7 })
            const result = detectHighPain(checkIn)

            expect(result.triggered).toBe(true)
            expect(result.reason).toBe('HIGH_PAIN')
            expect(result.weight).toBe(0.6)
        })

        it('should trigger when pain level is above 7', () => {
            const checkIn = createMockCheckIn({ painLevel: 9 })
            const result = detectHighPain(checkIn)

            expect(result.triggered).toBe(true)
            expect(result.reason).toBe('HIGH_PAIN')
            expect(result.weight).toBeGreaterThan(0)
        })

        it('should not trigger when pain level is below 7', () => {
            const checkIn = createMockCheckIn({ painLevel: 6 })
            const result = detectHighPain(checkIn)

            expect(result.triggered).toBe(false)
            expect(result.reason).toBeUndefined()
            expect(result.weight).toBe(0)
        })

        it('should calculate weight correctly for severe high pain', () => {
            const checkIn = createMockCheckIn({ painLevel: 10 })
            const result = detectHighPain(checkIn)

            expect(result.triggered).toBe(true)
            expect(result.weight).toBe(1)
        })
    })

    describe('detectNegativeTrend', () => {
        it('should skip trend when history is empty', () => {
            const current = createMockCheckIn()
            const result = detectNegativeTrend(current, [])

            expect(result.triggered).toBe(false)
            expect(result.weight).toBe(0)
        })

        it('should trigger on mood drop with sparse history (1-2 items)', () => {
            const current = createMockCheckIn({
                moodScore: 3,
                checkInDate: new Date('2026-04-10')
            })
            const history = [
                createMockCheckIn({
                    moodScore: 5,
                    checkInDate: new Date('2026-04-09')
                })
            ]

            const result = detectNegativeTrend(current, history)

            expect(result.triggered).toBe(true)
            expect(result.reason).toBe('NEGATIVE_TREND')
            expect(result.metadata?.moodDelta).toBe(2)
        })

        it('should trigger on pain increase with sparse history', () => {
            const current = createMockCheckIn({
                painLevel: 8,
                checkInDate: new Date('2026-04-10')
            })
            const history = [
                createMockCheckIn({
                    painLevel: 6,
                    checkInDate: new Date('2026-04-09')
                })
            ]

            const result = detectNegativeTrend(current, history)

            expect(result.triggered).toBe(true)
            expect(result.metadata?.painDelta).toBe(2)
        })

        it('should not trigger if delta < 2', () => {
            const current = createMockCheckIn({ moodScore: 4 })
            const history = [
                createMockCheckIn({ moodScore: 5 }),
                createMockCheckIn({ moodScore: 5 })
            ]

            const result = detectNegativeTrend(current, history)

            expect(result.triggered).toBe(false)
        })

        it('should calculate weight as 0.5 when trend delta is exactly 2 (boundary)', () => {
            const current = createMockCheckIn({
                moodScore: 3,
                checkInDate: new Date('2026-04-10')
            })
            const history = [
                createMockCheckIn({
                    moodScore: 5,
                    checkInDate: new Date('2026-04-09')
                })
            ]

            const result = detectNegativeTrend(current, history)

            expect(result.triggered).toBe(true)
            expect(result.weight).toBe(0.5)
        })

        it('should use rolling baseline (up to 10 items)', () => {
            const current = createMockCheckIn({
                moodScore: 3,
                checkInDate: new Date('2026-04-10')
            })
            // Create history with 15 items, should only use last 10
            const history: CheckInType[] = Array.from({ length: 15 }, (_, i) =>
                createMockCheckIn({
                    moodScore: 5,
                    checkInDate: new Date(
                        2026, 3, 9 - i
                    )
                })
            )

            const result = detectNegativeTrend(current, history)

            expect(result.triggered).toBe(true)
            expect(result.metadata?.trendDuration).toBeGreaterThan(0)
        })

        it('should calculate trendDuration when trend triggers', () => {
            const current = createMockCheckIn({
                moodScore: 2,
                painLevel: 9
            })
            const history: CheckInType[] = [
                createMockCheckIn({
                    moodScore: 5,
                    painLevel: 5
                }),
                createMockCheckIn({
                    moodScore: 5,
                    painLevel: 5
                }),
                createMockCheckIn({ moodScore: 5, painLevel: 5 })
            ]

            const result = detectNegativeTrend(current, history)

            expect(result.triggered).toBe(true)
            expect(result.metadata?.trendDuration).toBeGreaterThan(0)
        })
    })
})

describe('Intervention Engine - Orchestrator', () => {
    it('should return no low state when all checks pass', () => {
        const current = createMockCheckIn({
            moodScore: 5,
            painLevel: 4
        })
        const history = [
            createMockCheckIn({ moodScore: 5, painLevel: 4 })
        ]

        const { lowState } = detectLowState(current, history)

        expect(lowState.isLowState).toBe(false)
        expect(lowState.reasons).toHaveLength(0)
        expect(lowState.trendDuration).toBe(0)
    })

    it('should detect single reason: low mood', () => {
        const current = createMockCheckIn({ moodScore: 2 })
        const history: CheckInType[] = []

        const { lowState } = detectLowState(current, history)

        expect(lowState.isLowState).toBe(true)
        expect(lowState.reasons).toContain('LOW_MOOD')
        expect(lowState.reasons.length).toBe(1)
    })

    it('should detect single reason: high pain', () => {
        const current = createMockCheckIn({ painLevel: 8 })
        const history: CheckInType[] = []

        const { lowState } = detectLowState(current, history)

        expect(lowState.isLowState).toBe(true)
        expect(lowState.reasons).toContain('HIGH_PAIN')
        expect(lowState.reasons.length).toBe(1)
    })

    it('should detect multiple reasons', () => {
        const current = createMockCheckIn({
            moodScore: 2,
            painLevel: 8
        })
        const history: CheckInType[] = []

        const { lowState } = detectLowState(current, history)

        expect(lowState.isLowState).toBe(true)
        expect(lowState.reasons.length).toBeGreaterThan(1)
        expect(lowState.reasons).toContain('LOW_MOOD')
        expect(lowState.reasons).toContain('HIGH_PAIN')
    })

    it('should include rule results in output', () => {
        const current = createMockCheckIn({ moodScore: 2 })
        const { ruleResults } = detectLowState(current, [])

        expect(ruleResults).toHaveLength(3)
        expect(ruleResults.some(r => r.triggered)).toBe(true)
    })

    it('should return trendDuration of 1 by default', () => {
        const current = createMockCheckIn({ moodScore: 2 })
        const { lowState } = detectLowState(current, [])

        expect(lowState.trendDuration).toBe(1)
    })
})

describe('Intervention Engine - Edge Cases', () => {
    it('should handle first check-in gracefully (empty history)', () => {
        const current = createMockCheckIn()
        const { lowState } = detectLowState(current, [])

        expect(lowState.isLowState).toBe(false)
        expect(lowState.reasons).toHaveLength(0)
    })

    it('should handle null/undefined activity safely', () => {
        const current = createMockCheckIn({ activities: [] })
        const history = [createMockCheckIn({ activities: null as any })]

        const { lowState } = detectLowState(current, history)

        expect(lowState).toBeDefined()
    })

    it('should not throw on extreme values', () => {
        const current = createMockCheckIn({
            moodScore: 0,
            painLevel: 10
        })
        const history = [
            createMockCheckIn({
                moodScore: 10,
                painLevel: 0
            })
        ]

        expect(() => {
            detectLowState(current, history)
        }).not.toThrow()
    })

    it('should handle year boundaries', () => {
        const current = createMockCheckIn({
            moodScore: 2,
            checkInDate: new Date('2026-01-01')
        })
        const history = [
            createMockCheckIn({
                moodScore: 5,
                checkInDate: new Date('2025-12-31')
            })
        ]

        const { lowState } = detectLowState(current, history)

        expect(lowState.isLowState).toBe(true)
    })
})
