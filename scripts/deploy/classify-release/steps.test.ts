import { isCleared, type LabelEvent } from './clearance'
import { pickLastDeployed } from './lastDeployed'

describe('pickLastDeployed', () => {
    it('takes the newest deployment whose status is success', () => {
        expect(pickLastDeployed([
            {
                sha: 'c',
                state: 'failure'
            },
            {
                sha: 'b',
                state: 'success'
            },
            {
                sha: 'a',
                state: 'success'
            }
        ])).toBe('b')
    })

    it('returns null when nothing succeeded or there is no deployment', () => {
        expect(pickLastDeployed([])).toBeNull()
        expect(pickLastDeployed([{
            sha: 'a',
            state: null
        }])).toBeNull()
    })
})

describe('isCleared', () => {
    const base = {
        owner: 'BarcDevs',
        headCommittedAt: '2026-11-24T10:00:00Z',
        prHeadTree: 'tree1',
        deployTree: 'tree1'
    }
    const event = (name: string, type: string, login: string, at: string): LabelEvent => ({
        event: type,
        label: { name },
        actor: { login },
        created_at: at
    })

    it('clears when the owner removes needs-review after the head commit', () => {
        expect(isCleared({
            ...base,
            events: [
                event('needs-review', 'labeled', 'github-actions[bot]', '2026-11-24T10:05:00Z'),
                event('needs-review', 'unlabeled', 'BarcDevs', '2026-11-24T11:00:00Z')
            ]
        })).toBe(true)
    })

    it('clears with an owner ship-ok', () => {
        expect(isCleared({
            ...base,
            events: [event('ship-ok', 'labeled', 'BarcDevs', '2026-11-24T11:00:00Z')]
        })).toBe(true)
    })

    it('never counts a bot removal', () => {
        expect(isCleared({
            ...base,
            events: [event('needs-review', 'unlabeled', 'github-actions[bot]', '2026-11-24T11:00:00Z')]
        })).toBe(false)
    })

    it('ignores a clearance given before the head commit', () => {
        expect(isCleared({
            ...base,
            events: [event('needs-review', 'unlabeled', 'BarcDevs', '2026-11-24T09:00:00Z')]
        })).toBe(false)
    })

    it('is cancelled by a later needs-review or a removed ship-ok', () => {
        expect(isCleared({
            ...base,
            events: [
                event('needs-review', 'unlabeled', 'BarcDevs', '2026-11-24T11:00:00Z'),
                event('needs-review', 'labeled', 'github-actions[bot]', '2026-11-24T12:00:00Z')
            ]
        })).toBe(false)
        expect(isCleared({
            ...base,
            events: [
                event('ship-ok', 'labeled', 'BarcDevs', '2026-11-24T11:00:00Z'),
                event('ship-ok', 'unlabeled', 'BarcDevs', '2026-11-24T12:00:00Z')
            ]
        })).toBe(false)
    })

    it('does not clear when the tree differs, is missing, or the date is bad', () => {
        const events = [event('ship-ok', 'labeled', 'BarcDevs', '2026-11-24T11:00:00Z')]
        expect(isCleared({
            ...base,
            events,
            deployTree: 'other'
        })).toBe(false)
        expect(isCleared({
            ...base,
            events,
            prHeadTree: '',
            deployTree: ''
        })).toBe(false)
        expect(isCleared({
            ...base,
            events,
            headCommittedAt: 'nope'
        })).toBe(false)
    })

    it('does not clear without any event', () => {
        expect(isCleared({
            ...base,
            events: []
        })).toBe(false)
    })
})
