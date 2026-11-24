import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'

import { isCleared, type LabelEvent } from './clearance'

const requireEnv = (name: string): string => {
    const value = process.env[name]
    if (!value) throw new Error(`${name} is not set`)
    return value
}

const gh = (path: string): unknown => JSON.parse(execFileSync('gh', [
    'api',
    '--paginate',
    '--slurp',
    path
], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
}))

const git = (...args: string[]): string => execFileSync('git', args, {
    cwd: requireEnv('REPO_DIR'),
    encoding: 'utf8'
}).trim()

// Any failure (no PR, API error, missing data) means not cleared.
const cleared = (() => {
    try {
        const repo = requireEnv('GITHUB_REPOSITORY')
        const sha = requireEnv('DEPLOY_SHA')
        const pulls = (gh(`repos/${repo}/commits/${sha}/pulls`) as unknown[][]).flat() as {
            number: number
            head: { sha: string }
        }[]
        if (pulls.length !== 1) return false
        const [pull] = pulls
        const events = (gh(`repos/${repo}/issues/${pull.number}/events`) as LabelEvent[][]).flat()
        return isCleared({
            events,
            owner: requireEnv('OWNER_LOGIN'),
            headCommittedAt: git(
                'log',
                '-1',
                '--format=%cI',
                pull.head.sha
            ),
            prHeadTree: git('rev-parse', `${pull.head.sha}^{tree}`),
            deployTree: git('rev-parse', `${sha}^{tree}`)
        })
    } catch {
        return false
    }
})()

const output = `cleared=${cleared ? 'true' : 'false'}\n`
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output)
console.info(output.trim())
