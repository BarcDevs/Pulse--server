import fs from 'fs'
import os from 'os'
import path from 'path'

import {
    flushCheckpoint,
    getCheckpoint,
    setCheckpoint
} from '../../../scripts/monitor/checkpoint'

const COMMITTED = '2026-10-01T00:00:00.000Z'
const LIVE = '2026-10-02T12:00:00.000Z'

describe('monitor checkpoint', () => {
    let dir: string
    let docPath: string
    let statePath: string

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(
            os.tmpdir(),
            'monitor-checkpoint-'
        ))
        docPath = path.join(
            dir,
            'index.md'
        )
        statePath = path.join(
            dir,
            'monitor-checkpoint'
        )
        fs.writeFileSync(
            docPath,
            `<!-- checkpoint: ${COMMITTED} -->\n\n# Production Errors\n`
        )
    })

    afterEach(() => {
        fs.rmSync(
            dir,
            { recursive: true, force: true }
        )
    })

    it('falls back to the committed checkpoint when nothing was set yet', () => {
        expect(getCheckpoint(
            docPath,
            statePath
        )).toBe(COMMITTED)
    })

    it('set moves the checkpoint without touching the tracked doc', () => {
        const before = fs.readFileSync(
            docPath,
            'utf8'
        )

        setCheckpoint(
            LIVE,
            statePath
        )

        expect(getCheckpoint(
            docPath,
            statePath
        )).toBe(LIVE)
        expect(fs.readFileSync(
            docPath,
            'utf8'
        )).toBe(before)
    })

    it('rejects an invalid timestamp', () => {
        expect(() => setCheckpoint(
            'not-a-date',
            statePath
        )).toThrow('invalid checkpoint timestamp')
        expect(fs.existsSync(statePath)).toBe(false)
    })

    it('flush writes the live checkpoint into the doc', () => {
        setCheckpoint(
            LIVE,
            statePath
        )

        flushCheckpoint(
            docPath,
            statePath
        )

        expect(fs.readFileSync(
            docPath,
            'utf8'
        )).toBe(`<!-- checkpoint: ${LIVE} -->\n\n# Production Errors\n`)
    })

    it('flush leaves the doc alone when no checkpoint was set', () => {
        const before = fs.readFileSync(
            docPath,
            'utf8'
        )

        flushCheckpoint(
            docPath,
            statePath
        )

        expect(fs.readFileSync(
            docPath,
            'utf8'
        )).toBe(before)
    })

    it('fails loudly when the stored checkpoint is corrupted', () => {
        fs.writeFileSync(
            statePath,
            'garbage'
        )

        expect(() => getCheckpoint(
            docPath,
            statePath
        )).toThrow('invalid checkpoint timestamp')
    })
})
