import {
    extractRecentActivities,
    getTopActivities
} from '../../../lib/aiInsight/prompts/insightsPromptHelpers'
import type { CheckInType } from '../../../types/data/CheckInType'

const checkIn = (day: number, activities: string[]): CheckInType => ({
    id: `check-in-${day}`,
    profileId: 'profile-id',
    checkInDate: new Date(Date.UTC(2026, 9, day)),
    moodScore: 7,
    painLevel: 3,
    activities,
    notes: null,
    createdAt: new Date(),
    updatedAt: null,
    insights: []
})

describe('prompt activity names', () => {
    const checkIns = [
        checkIn(3, ['walking', 'pottery class']),
        checkIn(2, ['walking']),
        checkIn(1, ['rest'])
    ]

    it('lists recent activities in the user language, custom ones unchanged', () => {
        expect(extractRecentActivities(checkIns, 6, 'he-IL'))
            .toBe('מנוחה, הליכה, הליכה, pottery class')
    })

    it('lists the most common activities in the user language', () => {
        expect(getTopActivities(checkIns, 2, 'he-IL'))
            .toBe('הליכה, pottery class')
    })

    it('uses the English labels for an English user', () => {
        expect(getTopActivities(checkIns, 1, 'en-US')).toBe('walking')
    })
})
