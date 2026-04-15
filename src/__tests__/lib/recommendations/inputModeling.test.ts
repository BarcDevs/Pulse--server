import { buildCheckInState } from '../../../lib/recommendations/inputModeling'
import type { CheckInType } from '../../../types/data/CheckInType'

const createMockCheckIn = (
    overrides?: Partial<CheckInType>
): CheckInType => ({
    id: 'test-id',
    profileId: 'profile-id',
    checkInDate: new Date('2026-04-14'),
    moodScore: 7,
    painLevel: 3,
    activities: ['walking', 'meditation'],
    notes: 'Feeling good today',
    createdAt: new Date(),
    updatedAt: null,
    insights: [],
    ...overrides
})

describe('inputModeling', () => {
    describe('buildCheckInState', () => {
        it('should build state from current check-in only', () => {
            const checkIn = createMockCheckIn()

            const state = buildCheckInState(
                checkIn,
                undefined,
                [checkIn],
                30
            )

            expect(state.physicalState).toBe('good')
            expect(state.emotionalState).toBe('positive')
            expect(state.recoveryStage).toBe('mid')
            expect(state.keyIssueTags).toContain('walking')
            expect(state.keyIssueTags).toContain('meditation')
            expect(state.trend).toBe('stable')
        })

        it('should detect improving trend', () => {
            const current = createMockCheckIn({
                moodScore: 8,
                painLevel: 2
            })
            const previous = createMockCheckIn({
                moodScore: 5,
                painLevel: 5
            })

            const state = buildCheckInState(current, previous)

            expect(state.trend).toBe('improving')
        })

        it('should detect declining trend', () => {
            const current = createMockCheckIn({
                moodScore: 4,
                painLevel: 7
            })
            const previous = createMockCheckIn({
                moodScore: 8,
                painLevel: 2
            })

            const state = buildCheckInState(current, previous)

            expect(state.trend).toBe('declining')
        })

        it('should map pain level to physical state', () => {
            const good = buildCheckInState(
                createMockCheckIn({ painLevel: 2 })
            )
            const moderate = buildCheckInState(
                createMockCheckIn({ painLevel: 5 })
            )
            const poor = buildCheckInState(
                createMockCheckIn({ painLevel: 9 })
            )

            expect(good.physicalState).toBe('good')
            expect(moderate.physicalState).toBe('moderate')
            expect(poor.physicalState).toBe('poor')
        })

        it('should map mood score to emotional state', () => {
            const positive = buildCheckInState(
                createMockCheckIn({ moodScore: 8 })
            )
            const neutral = buildCheckInState(
                createMockCheckIn({ moodScore: 5 })
            )
            const negative = buildCheckInState(
                createMockCheckIn({ moodScore: 2 })
            )

            expect(positive.emotionalState).toBe('positive')
            expect(neutral.emotionalState).toBe('neutral')
            expect(negative.emotionalState).toBe('negative')
        })

        it('should extract keywords from notes', () => {
            const state = buildCheckInState(
                createMockCheckIn({
                    notes: 'Really struggled with anxiety today'
                })
            )

            expect(state.keyIssueTags).toContain('struggled')
            expect(state.keyIssueTags).toContain('anxiety')
        })

        it('should mark early recovery stage', () => {
            const state = buildCheckInState(
                createMockCheckIn(),
                undefined,
                [createMockCheckIn()],
                5
            )

            expect(state.recoveryStage).toBe('early')
        })
    })
})
