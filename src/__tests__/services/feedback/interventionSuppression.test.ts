import { calculateInterventionMode } from '../../../services/feedback/interventionSuppression'
import type { AIInsightType } from '../../../types/data/CheckInType'
import type {
    InterventionMetadata,
    LowStateResult
} from '../../../types/feedback'

const createMockLowState = (
    overrides?: Partial<LowStateResult>
): LowStateResult => ({
    isLowState: true,
    reasons: ['LOW_MOOD'],
    trendDuration: 1,
    ...overrides
})

const createMockIntervention = (
    metadata?: Partial<InterventionMetadata>
): AIInsightType => ({
    id: 'insight-1',
    userId: 'user-1',
    checkInId: 'check-in-1',
    type: 'BAD_DAY_SUPPORT',
    classification: 'intervention',
    priority: 'high',
    title: 'Support',
    content: 'Message',
    metadata: {
        reasons: ['LOW_MOOD'],
        primaryReason: 'LOW_MOOD',
        mode: 'FULL',
        trendDuration: 1,
        consecutiveOccurrences: 1,
        ...metadata
    } as InterventionMetadata,
    createdAt: new Date()
})

describe('Intervention Suppression (Mode Degradation)', () => {
    describe('Mode Calculation', () => {
        it('should return FULL when no previous intervention', () => {
            const lowState = createMockLowState()
            const mode = calculateInterventionMode(lowState, undefined)

            expect(mode).toBe('FULL')
        })

        it('should return FULL for different reason', () => {
            const lowState = createMockLowState({
                reasons: ['HIGH_PAIN']
            })
            const previous = createMockIntervention({
                primaryReason: 'LOW_MOOD'
            })

            const mode = calculateInterventionMode(lowState, previous)

            expect(mode).toBe('FULL')
        })

        it(
            'should return SOFT on second consecutive occurrence (consecutiveCount=2)',
            () => {
                const lowState = createMockLowState({
                    reasons: ['LOW_MOOD']
                })

                // First intervention: consecutiveOccurrences = 1
                // Second time: consecutiveCount = 1 + 1 = 2 → SOFT
                const previous = createMockIntervention({
                    primaryReason: 'LOW_MOOD',
                    consecutiveOccurrences: 1
                })

                const mode = calculateInterventionMode(lowState, previous)

                expect(mode).toBe('SOFT')
            })

        it('should return SILENT on third+ consecutive occurrence (consecutiveCount>=3)', () => {
            const lowState = createMockLowState({
                reasons: ['LOW_MOOD']
            })

            // Second intervention: consecutiveOccurrences = 2
            // Third time: consecutiveCount = 2 + 1 = 3 → SILENT
            const previous = createMockIntervention({
                primaryReason: 'LOW_MOOD',
                consecutiveOccurrences: 2
            })

            const mode = calculateInterventionMode(lowState, previous)

            expect(mode).toBe('SILENT')
        })

        it('should remain SILENT for further occurrences', () => {
            const lowState = createMockLowState({
                reasons: ['LOW_MOOD']
            })
            const previous = createMockIntervention({
                primaryReason: 'LOW_MOOD',
                consecutiveOccurrences: 5
            })

            const mode = calculateInterventionMode(lowState, previous)

            expect(mode).toBe('SILENT')
        })
    })

    describe('Reason Change Resets Sequence', () => {
        it('should reset to FULL when primary reason changes', () => {
            // Current: HIGH_PAIN
            // Previous: LOW_MOOD (consecutiveOccurrences=2, would normally be SILENT)
            // But reason changed → FULL
            const lowState = createMockLowState({
                reasons: ['HIGH_PAIN']
            })
            const previous = createMockIntervention({
                primaryReason: 'LOW_MOOD',
                consecutiveOccurrences: 2
            })

            const mode = calculateInterventionMode(lowState, previous)

            expect(mode).toBe('FULL')
        })
    })

    describe('Edge Cases', () => {
        it('should handle null metadata gracefully', () => {
            const lowState = createMockLowState()
            const previous: AIInsightType = {
                id: 'insight-1',
                userId: 'user-1',
                checkInId: 'check-in-1',
                type: 'BAD_DAY_SUPPORT',
                classification: 'intervention',
                priority: 'high',
                title: 'Support',
                content: 'Message',
                metadata: null,
                createdAt: new Date()
            }

            const mode = calculateInterventionMode(lowState, previous)

            expect(mode).toBe('FULL')
        })

        it(
            'should handle missing consecutiveOccurrences (defaults to 0, results in FULL)',
            () => {
                const lowState = createMockLowState()
                const previous = createMockIntervention({
                    consecutiveOccurrences: undefined as any
                })

                const mode = calculateInterventionMode(lowState, previous)

                // undefined || 0 = 0, so consecutiveCount = 0 + 1 = 1 → FULL
                expect(mode).toBe('FULL')
            })

        it('should return FULL when intervention is undefined', () => {
            const lowState = createMockLowState()

            const mode = calculateInterventionMode(lowState, undefined)

            expect(mode).toBe('FULL')
        })
    })
})
