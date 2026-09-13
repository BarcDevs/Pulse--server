import { buildInterventionContext } from '../../../services/feedback/contextBuilder'
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

describe('buildInterventionContext - gap detection', () => {
    it('reports gapDays 1 for consecutive daily check-ins', () => {
        const current = createMockCheckIn({
            checkInDate: new Date('2026-04-10'),
            moodScore: 2
        })
        const history = [
            createMockCheckIn({ checkInDate: new Date('2026-04-09'), moodScore: 4 }),
            createMockCheckIn({ checkInDate: new Date('2026-04-08'), moodScore: 4 })
        ]

        const context = buildInterventionContext(current, history, 2)

        expect(context.trend.gapDays).toBe(1)
    })

    it('reports the largest gap between consecutive check-ins in the window', () => {
        const current = createMockCheckIn({
            checkInDate: new Date('2026-04-20'),
            moodScore: 2
        })
        const history = [
            createMockCheckIn({ checkInDate: new Date('2026-04-19'), moodScore: 4 }),
            createMockCheckIn({ checkInDate: new Date('2026-03-25'), moodScore: 5 })
        ]

        const context = buildInterventionContext(current, history, 2)

        expect(context.trend.gapDays).toBe(25)
    })

    it('forces trend direction to stable when the gap meets the threshold, even with a real delta', () => {
        const current = createMockCheckIn({
            checkInDate: new Date('2026-04-30'),
            moodScore: 8,
            painLevel: 1
        })
        const history = [
            createMockCheckIn({
                checkInDate: new Date('2026-04-01'),
                moodScore: 2,
                painLevel: 8
            })
        ]

        const context = buildInterventionContext(current, history, 29)

        expect(context.trend.gapDays).toBeGreaterThanOrEqual(10)
        expect(context.trend.direction).toBe('stable')
    })

    it('computes a real trend direction when the gap is under the threshold', () => {
        const current = createMockCheckIn({
            checkInDate: new Date('2026-04-10'),
            moodScore: 8,
            painLevel: 1
        })
        const history = [
            createMockCheckIn({
                checkInDate: new Date('2026-04-09'),
                moodScore: 3,
                painLevel: 6
            }),
            createMockCheckIn({
                checkInDate: new Date('2026-04-08'),
                moodScore: 3,
                painLevel: 6
            })
        ]

        const context = buildInterventionContext(current, history, 2)

        expect(context.trend.gapDays).toBe(1)
        expect(context.trend.direction).toBe('up')
    })

    it('reports gapDays 0 when there is no history', () => {
        const current = createMockCheckIn({ checkInDate: new Date('2026-04-10') })

        const context = buildInterventionContext(current, [], 0)

        expect(context.trend.gapDays).toBe(0)
        expect(context.trend.direction).toBe('stable')
    })
})
