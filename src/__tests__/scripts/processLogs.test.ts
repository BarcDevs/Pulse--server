import { updateDoc } from '../../../scripts/monitor/processLogs'

const today = new Date().toISOString().slice(
    0,
    10
)

const doc = [
    '<!-- checkpoint: 1970-01-01T00:00:00.000Z -->',
    '',
    '## Known Fixes',
    '',
    '| Signature | Occurrences | First seen | Last seen | Record |',
    '|-----------|-------------|------------|-----------|--------|',
    '| `TypeError: Cannot read x` | 2 | 2026-09-01 | 2026-09-02 | [x](x.md) |',
    '| `Error: a \\| b` | 1 | 2026-09-01 | 2026-09-01 | [ab](ab.md) |',
    '',
    '## 404 Patterns',
    '',
    '_(none recorded yet)_',
    ''
].join('\n')

const errorLine = (name: string, message: string) => ({
    level: 'error',
    message,
    timestamp: '2026-09-30T10:00:00.000Z',
    metadata: { name, message }
})

describe('processLogs updateDoc', () => {
    it('bumps the matching Known Fixes row instead of reporting it', () => {
        const result = updateDoc(
            doc,
            [errorLine('TypeError', 'Cannot read x')]
        )

        expect(result.newErrors).toEqual([])
        expect(result.doc).toContain(
            `| \`TypeError: Cannot read x\` | 3 | 2026-09-01 | ${today} | [x](x.md) |`
        )
    })

    it('matches a signature containing a pipe', () => {
        const result = updateDoc(
            doc,
            [errorLine('Error', 'a | b')]
        )

        expect(result.newErrors).toEqual([])
        expect(result.doc).toContain(`| \`Error: a \\| b\` | 2 | 2026-09-01 | ${today} |`)
    })

    it('reports each unknown signature once, with its count', () => {
        const result = updateDoc(
            doc,
            [
                errorLine('RangeError', 'Invalid time value 123'),
                errorLine('RangeError', 'Invalid time value 456')
            ]
        )

        expect(result.newErrors).toHaveLength(1)
        expect(result.newErrors[0]).toMatchObject({
            signature: 'RangeError: Invalid time value <n>',
            count: 2
        })
        expect(result.doc).toBe(doc)
    })

    it('tallies 404s by route', () => {
        const result = updateDoc(
            doc,
            [
                {
                    ...errorLine('NotFoundError', 'Route not found'),
                    metadata: {
                        name: 'NotFoundError',
                        method: 'GET',
                        route: '/api/v2/nope'
                    }
                }
            ]
        )

        expect(result.newErrors).toEqual([])
        expect(result.doc).toContain(
            `- \`GET /api/v2/nope\` — 1 hits, first seen ${today}, last seen ${today}`
        )
    })
})
