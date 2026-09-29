import fs from 'fs'
import path from 'path'

// Reads winston JSON error-log lines (one per line, from pull-prod-logs.sh),
// splits them into the 404-pattern bucket vs. real-error bucket, updates
// docs/PROD-ERRORS.md's `## 404 Patterns` and `## Known Fixes` occurrence
// counts, and prints the list of real errors with NO matching Known Fixes
// entry — those are what the monitor routine (.claude/routines/
// prod-error-monitor.md) diagnoses/fixes/PRs.
//
// Usage: tsx scripts/monitor/processLogs.ts < logs.jsonl

const DOC_PATH = path.resolve(
    __dirname,
    '../../docs/PROD-ERRORS.md'
)

type LogEntry = {
    level: string
    message: string
    timestamp: string
    metadata?: {
        message?: string
        stack?: string
        name?: string
        method?: string
        route?: string
    }
}

type NewError = {
    signature: string
    name: string
    message: string
    stack?: string
    route?: string
    method?: string
    timestamp: string
}

const is404 = (entry: LogEntry): boolean =>
    entry.metadata?.name === 'NotFoundError'

// Normalized signature used to match against recorded Known Fixes entries:
// error type + message shape (strip anything that looks like an id/number
// so "Post abc123 not found" and "Post xyz789 not found" still match).
const normalizeSignature = (entry: LogEntry): string => {
    const name = entry.metadata?.name ?? 'Error'
    const message = (entry.metadata?.message ?? entry.message)
        .replace(/[0-9a-f]{8,}/gi, '<id>')
        .replace(/\d+/g, '<n>')
    return `${name}: ${message}`
}

const readStdin = (): Promise<string> =>
    new Promise((resolve, reject) => {
        let data = ''
        process.stdin.on('data', chunk => { data += chunk })
        process.stdin.on('end', () => resolve(data))
        process.stdin.on('error', reject)
    })

const parseEntries = (raw: string): LogEntry[] =>
    raw
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
            try {
                return JSON.parse(line) as LogEntry
            } catch {
                return null
            }
        })
        .filter((entry): entry is LogEntry => entry !== null)

const updateDoc = (
    doc: string,
    entries: LogEntry[]
): { doc: string, newErrors: NewError[] } => {
    const today = new Date().toISOString().slice(
        0,
        10
    )

    // --- 404 Patterns ---
    const routeCounts = new Map<string, number>()
    for (const entry of entries.filter(is404)) {
        const key = `${entry.metadata?.method ?? '?'} ${entry.metadata?.route ?? 'unknown'}`
        routeCounts.set(
            key,
            (routeCounts.get(key) ?? 0) + 1
        )
    }

    let updatedDoc = doc
    if (routeCounts.size > 0) {
        const section = extractSection(
            updatedDoc,
            '## 404 Patterns'
        )
        const lines = new Map<string, string>()
        for (const line of section.matchAll(/^- `(.+?)` — (\d+) hits, first seen (\S+), last seen \S+/gm)) {
            lines.set(
                line[1],
                `- \`${line[1]}\` — ${Number(line[2])} hits, first seen ${line[3]}, last seen ${today}`
            )
        }
        for (const [route, count] of routeCounts) {
            const existing = section.match(
                new RegExp(`^- \`${escapeRegex(route)}\` — (\\d+) hits, first seen (\\S+), last seen \\S+`, 'm')
            )
            if (existing) {
                const total = Number(existing[1]) + count
                lines.set(
                    route,
                    `- \`${route}\` — ${total} hits, first seen ${existing[2]}, last seen ${today}`
                )
            } else {
                lines.set(
                    route,
                    `- \`${route}\` — ${count} hits, first seen ${today}, last seen ${today}`
                )
            }
        }
        updatedDoc = replaceSection(
            updatedDoc,
            '## 404 Patterns',
            [...lines.values()].sort().join('\n')
        )
    }

    // --- Known Fixes matching ---
    const knownFixesSection = extractSection(
        updatedDoc,
        '## Known Fixes'
    )
    const newErrors: NewError[] = []
    for (const entry of entries.filter(e => !is404(e))) {
        const signature = normalizeSignature(entry)
        const escaped = escapeRegex(signature)
        const matchRegex = new RegExp(
            `(- \\*\\*Signature:\\*\\* \`${escaped}\`[\\s\\S]*?- \\*\\*Last seen:\\*\\* )(\\S+)([\\s\\S]*?- \\*\\*Occurrences:\\*\\* )(\\d+)`
        )
        if (matchRegex.test(updatedDoc)) {
            updatedDoc = updatedDoc.replace(
                matchRegex,
                (_m, pre, _last, mid, count) =>
                    `${pre}${today}${mid}${Number(count) + 1}`
            )
        } else {
            newErrors.push({
                signature,
                name: entry.metadata?.name ?? 'Error',
                message: entry.metadata?.message ?? entry.message,
                stack: entry.metadata?.stack,
                route: entry.metadata?.route,
                method: entry.metadata?.method,
                timestamp: entry.timestamp
            })
        }
    }
    void knownFixesSection

    return { doc: updatedDoc, newErrors }
}

const extractSection = (doc: string, heading: string): string => {
    const start = doc.indexOf(heading)
    if (start === -1) return ''
    const rest = doc.slice(start + heading.length)
    const nextHeading = rest.search(/\n## /)
    return nextHeading === -1 ? rest : rest.slice(
        0,
        nextHeading
    )
}

const replaceSection = (
    doc: string,
    heading: string,
    body: string
): string => {
    const start = doc.indexOf(heading)
    if (start === -1) return doc
    const afterHeading = start + heading.length
    const rest = doc.slice(afterHeading)
    const nextHeading = rest.search(/\n## /)
    const before = doc.slice(
        0,
        afterHeading
    )
    const after = nextHeading === -1 ? '' : rest.slice(nextHeading)
    const placeholder = body.trim() || '_(none recorded yet)_'
    return `${before}\n\n${placeholder}\n${after}`
}

const escapeRegex = (str: string): string =>
    str.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
    )

const main = async () => {
    const raw = await readStdin()
    const entries = parseEntries(raw)
    const doc = fs.readFileSync(
        DOC_PATH,
        'utf8'
    )
    const { doc: updatedDoc, newErrors } = updateDoc(
        doc,
        entries
    )
    fs.writeFileSync(
        DOC_PATH,
        updatedDoc
    )
    process.stdout.write(JSON.stringify(
        newErrors,
        null,
        2
    ))
}

if (require.main === module) {
    main().catch(err => {
        console.error(err)
        process.exit(1)
    })
}

export { normalizeSignature, is404 }
