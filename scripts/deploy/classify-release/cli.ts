import { appendFileSync, readFileSync } from 'node:fs'

import { classifySafely } from './classify'
import { makeGit, readRange } from './gitReader'

// Runs from a checkout of the LAST DEPLOYED sha (so a release cannot weaken its own rules),
// against the release checkout in REPO_DIR.
const repoDir = process.env.REPO_DIR ?? process.cwd()

const requireEnv = (name: string): string => {
    const value = process.env[name]
    if (!value) throw new Error(`${name} is not set`)
    return value
}

const assertShippable = (last: string, sha: string) => {
    if (requireEnv('EVENT_NAME') === 'workflow_dispatch' && requireEnv('REF') !== 'refs/heads/main') {
        throw new Error('workflow_dispatch from a ref other than main is always held')
    }
    if (sha !== requireEnv('MAIN_SHA')) throw new Error('the release is not the head of main')
    try {
        makeGit(repoDir)(
            'merge-base',
            '--is-ancestor',
            last,
            sha
        )
    } catch {
        throw new Error('the last deployed sha is not an ancestor of the release (rollback or unrelated history)')
    }
}

const result = classifySafely(() => {
    const last = requireEnv('LAST_DEPLOYED_SHA')
    const sha = requireEnv('DEPLOY_SHA')
    assertShippable(last, sha)
    return {
        ...readRange(repoDir, last, sha),
        prTexts: [readFileSync(requireEnv('PR_TEXT_FILE'), 'utf8')]
    }
})

// The deploy job runs only when this output is exactly the string 'false'.
const output = `hold=${result.hold ? 'true' : 'false'}\n`
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output)
console.info(output.trim())
result.reasons.forEach((reason) => console.info(`  ${reason}`))
