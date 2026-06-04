// @ts-nocheck
import { getObservationTemplate } from '../../../lib/dailyObservation/observationTemplates'

describe('getObservationTemplate', () => {
    it('returns template for activity_consistency', () => {
        const template = getObservationTemplate('activity_consistency')
        expect(template.icon).toBe('Activity')
        expect(template.observation).toBeDefined()
        expect(template.supportiveDescription).toBeDefined()
    })

    it('returns template for pain_improvement', () => {
        const template = getObservationTemplate('pain_improvement')
        expect(template.icon).toBe('TrendingDown')
    })

    it('returns template for better_days_pattern', () => {
        const template = getObservationTemplate('better_days_pattern')
        expect(template.icon).toBe('Zap')
    })

    it('returns template for mood_stability', () => {
        const template = getObservationTemplate('mood_stability')
        expect(template.icon).toBe('Heart')
    })

    it('returns template for streak_consistency', () => {
        const template = getObservationTemplate('streak_consistency')
        expect(template.icon).toBe('Flame')
    })

    it('returns template for checkin_consistency', () => {
        const template = getObservationTemplate('checkin_consistency')
        expect(template.icon).toBe('CalendarCheck')
    })

    it('uses custom observation when activity_consistency has topActivity', () => {
        const template = getObservationTemplate('activity_consistency', {
            topActivity: 'Walking'
        })
        expect(template.observation).toContain('Walking')
    })

    it('preserves base observation for activity_consistency without topActivity', () => {
        const base = getObservationTemplate('activity_consistency')
        const withUndefined = getObservationTemplate('activity_consistency', {})
        expect(withUndefined.observation).toBe(base.observation)
    })

    it('does not modify observation for other types when metadata provided', () => {
        const base = getObservationTemplate('pain_improvement')
        const withMeta = getObservationTemplate('pain_improvement', {
            topActivity: 'Running'
        })
        expect(withMeta.observation).toBe(base.observation)
    })
})
