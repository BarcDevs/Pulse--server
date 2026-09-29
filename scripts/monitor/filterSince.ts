// Reads winston JSON log lines from stdin, prints only lines whose
// `timestamp` field is >= the ISO8601 cutoff given as argv[2].
// Usage: tsx scripts/monitor/filterSince.ts <since-iso8601>

const since = new Date(process.argv[2])
if (Number.isNaN(since.getTime()))
    throw new Error('filterSince.ts: invalid since timestamp')

let buffer = ''
process.stdin.on(
    'data',
    chunk => { buffer += chunk }
)
process.stdin.on(
    'end',
    () => {
        for (const line of buffer.split('\n')) {
            if (!line.trim()) continue
            try {
                const entry = JSON.parse(line)
                if (entry.timestamp && new Date(entry.timestamp) >= since) {
                    process.stdout.write(line + '\n')
                }
            } catch {
                // Non-JSON line (e.g. a stray console line) — skip.
            }
        }
    }
)
