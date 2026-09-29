import fs from 'fs'
import path from 'path'

// Reads/writes the `<!-- checkpoint: <ISO8601> -->` marker at the top of
// docs/PROD-ERRORS.md, so each monitor run only processes log lines newer
// than the last run.
//
// Usage:
//   tsx scripts/monitor/checkpoint.ts get     -> prints the current checkpoint
//   tsx scripts/monitor/checkpoint.ts set <ts> -> updates it

const DOC_PATH = path.resolve(
    __dirname,
    '../../docs/PROD-ERRORS.md'
)
const CHECKPOINT_REGEX = /<!-- checkpoint: (.+?) -->/

const getCheckpoint = (): string => {
    const doc = fs.readFileSync(
        DOC_PATH,
        'utf8'
    )
    const match = doc.match(CHECKPOINT_REGEX)
    if (!match) {
        throw new Error('docs/PROD-ERRORS.md is missing its checkpoint comment')
    }
    return match[1]
}

const setCheckpoint = (timestamp: string): void => {
    if (Number.isNaN(new Date(timestamp).getTime())) {
        throw new Error(`invalid checkpoint timestamp: ${timestamp}`)
    }
    const doc = fs.readFileSync(
        DOC_PATH,
        'utf8'
    )
    if (!CHECKPOINT_REGEX.test(doc)) {
        throw new Error('docs/PROD-ERRORS.md is missing its checkpoint comment')
    }
    fs.writeFileSync(
        DOC_PATH,
        doc.replace(
            CHECKPOINT_REGEX,
            `<!-- checkpoint: ${timestamp} -->`
        )
    )
}

const main = () => {
    const [command, arg] = process.argv.slice(2)
    if (command === 'get') {
        process.stdout.write(getCheckpoint())
    } else if (command === 'set' && arg) {
        setCheckpoint(arg)
    } else {
        console.error('Usage: checkpoint.ts get | set <ISO8601 timestamp>')
        process.exit(1)
    }
}

if (require.main === module) {
    main()
}

export { getCheckpoint, setCheckpoint }
