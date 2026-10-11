import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'

// The monitor's "last processed" timestamp. Its working value lives in an
// untracked file inside the records worktree's git dir, so a quiet run moves
// it without touching a tracked file (no dirty tree, no amend). `flush` copies
// it into the `<!-- checkpoint: <ISO8601> -->` marker at the top of
// docs/prod-errors/index.md, which a run does only when it has record
// changes to commit anyway.
//
// Usage:
//   tsx scripts/monitor/checkpoint.ts get        -> prints the current checkpoint
//   tsx scripts/monitor/checkpoint.ts set <ts>   -> updates the untracked value
//   tsx scripts/monitor/checkpoint.ts flush      -> writes it into index.md

const DOC_PATH = path.resolve(
    __dirname,
    '../../docs/prod-errors/index.md'
)
const STATE_FILE_NAME = 'monitor-checkpoint'
const CHECKPOINT_REGEX = /<!-- checkpoint: (.+?) -->/
const MISSING_MARKER_MESSAGE = 'docs/prod-errors/index.md is missing its checkpoint comment'

const getStatePath = (): string =>
    path.join(
        execFileSync(
            'git',
            ['rev-parse', '--absolute-git-dir'],
            { cwd: __dirname, encoding: 'utf8' }
        ).trim(),
        STATE_FILE_NAME
    )

const assertValidTimestamp = (timestamp: string): void => {
    if (Number.isNaN(new Date(timestamp).getTime())) {
        throw new Error(`invalid checkpoint timestamp: ${timestamp}`)
    }
}

const getCommittedCheckpoint = (docPath: string): string => {
    const match = fs.readFileSync(
        docPath,
        'utf8'
    ).match(CHECKPOINT_REGEX)
    if (!match) {
        throw new Error(MISSING_MARKER_MESSAGE)
    }
    return match[1]
}

const getCheckpoint = (
    docPath: string = DOC_PATH,
    statePath: string = getStatePath()
): string => {
    if (!fs.existsSync(statePath)) {
        return getCommittedCheckpoint(docPath)
    }
    const stored = fs.readFileSync(
        statePath,
        'utf8'
    ).trim()
    assertValidTimestamp(stored)
    return stored
}

const setCheckpoint = (
    timestamp: string,
    statePath: string = getStatePath()
): void => {
    assertValidTimestamp(timestamp)
    fs.writeFileSync(
        statePath,
        timestamp
    )
}

const flushCheckpoint = (
    docPath: string = DOC_PATH,
    statePath: string = getStatePath()
): void => {
    if (!fs.existsSync(statePath)) {
        return
    }
    const doc = fs.readFileSync(
        docPath,
        'utf8'
    )
    if (!CHECKPOINT_REGEX.test(doc)) {
        throw new Error(MISSING_MARKER_MESSAGE)
    }
    fs.writeFileSync(
        docPath,
        doc.replace(
            CHECKPOINT_REGEX,
            `<!-- checkpoint: ${getCheckpoint(
                docPath,
                statePath
            )} -->`
        )
    )
}

const main = () => {
    const [command, arg] = process.argv.slice(2)
    if (command === 'get') {
        process.stdout.write(getCheckpoint())
    } else if (command === 'set' && arg) {
        setCheckpoint(arg)
    } else if (command === 'flush') {
        flushCheckpoint()
    } else {
        console.error('Usage: checkpoint.ts get | set <ISO8601 timestamp> | flush')
        process.exitCode = 1
    }
}

if (require.main === module) {
    main()
}

export { flushCheckpoint, getCheckpoint, setCheckpoint }
