import { execFileSync } from 'node:child_process'

import { type LabelEvent } from './clearance'
import { heldCheck } from './heldCheck'

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

// Fails closed: any error fails the check, so an API problem cannot let a held PR merge.
try {
    const repo = requireEnv('GITHUB_REPOSITORY')
    const number = requireEnv('PR_NUMBER')
    const [pull] = (gh(`repos/${repo}/pulls/${number}`) as {
        labels: { name: string }[]
        head: { sha: string }
    }[])
    const [commit] = gh(`repos/${repo}/commits/${pull.head.sha}`) as { commit: { committer: { date: string } } }[]
    const events = (gh(`repos/${repo}/issues/${number}/events`) as LabelEvent[][]).flat()
    const result = heldCheck({
        labels: pull.labels.map(({ name }) => name),
        events,
        owner: requireEnv('OWNER_LOGIN'),
        headCommittedAt: commit.commit.committer.date
    })
    console.info(result.reason)
    process.exitCode = result.pass ? 0 : 1
} catch (error) {
    console.error(`held release check failed closed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
}
