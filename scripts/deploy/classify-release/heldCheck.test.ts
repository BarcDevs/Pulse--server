import { type LabelEvent } from './clearance'
import { heldCheck } from './heldCheck'

const owner = 'BarcDevs'
const headCommittedAt = '2026-11-24T10:00:00Z'

const event = (name: string, type: string, login: string, at: string): LabelEvent => ({
    event: type,
    label: { name },
    actor: { login },
    created_at: at
})

const run = (labels: string[], events: LabelEvent[]) => heldCheck({
    labels,
    events,
    owner,
    headCommittedAt
})

describe('heldCheck', () => {
    it('passes a PR that is not held', () => {
        expect(run([], []).pass).toBe(true)
        expect(run(['enhancement'], []).pass).toBe(true)
    })

    it('blocks a held PR with no clearance', () => {
        const result = run(['needs-review'], [event('needs-review', 'labeled', 'BarcDevs', '2026-11-24T10:05:00Z')])
        expect(result.pass).toBe(false)
        expect(result.reason).toContain('needs-review')
    })

    it('passes once the owner added ship-ok after the head commit', () => {
        expect(run(['needs-review', 'ship-ok'], [
            event('needs-review', 'labeled', 'github-actions[bot]', '2026-11-24T10:05:00Z'),
            event('ship-ok', 'labeled', 'BarcDevs', '2026-11-24T11:00:00Z')
        ]).pass).toBe(true)
    })

    it('blocks a ship-ok from anyone but the owner', () => {
        expect(run(['needs-review', 'ship-ok'], [
            event('ship-ok', 'labeled', 'Claude-watcher-agent', '2026-11-24T11:00:00Z')
        ]).pass).toBe(false)
    })

    it('blocks a ship-ok given before the head commit, and one cancelled by a later hold', () => {
        expect(run(['needs-review', 'ship-ok'], [
            event('ship-ok', 'labeled', 'BarcDevs', '2026-11-24T09:00:00Z')
        ]).pass).toBe(false)
        expect(run(['needs-review', 'ship-ok'], [
            event('ship-ok', 'labeled', 'BarcDevs', '2026-11-24T11:00:00Z'),
            event('needs-review', 'labeled', 'github-actions[bot]', '2026-11-24T12:00:00Z')
        ]).pass).toBe(false)
    })
})
