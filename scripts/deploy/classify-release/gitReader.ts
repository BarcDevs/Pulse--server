import { execFileSync } from 'node:child_process'

import { isExemptWorkflowChange } from './exemptions'

export const makeGit = (repoDir: string) => (...args: string[]): string => execFileSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
})

export type RangeRead = {
    changedFiles: string[]
    commitMessages: string[]
}

// Reads LAST..SHA. Workflow files changed only by Dependabot `uses:` bumps are left out of the
// changed files, so they never reach the path rules; anything else in the diff is classified.
export const readRange = (
    repoDir: string,
    last: string,
    sha: string
): RangeRead => {
    const git = makeGit(repoDir)
    const range = `${last}..${sha}`
    const allFiles = git(
        'diff',
        '--no-renames',
        '--name-only',
        '-z',
        range
    ).split('\0').filter(Boolean)
    const changedFiles = allFiles.filter((file) => {
        if (!file.startsWith('.github/workflows/')) return true
        const authors = git(
            'log',
            '--format=%an <%ae>',
            range,
            '--',
            file
        ).split('\n').filter(Boolean)
        const diff = git(
            'diff',
            '--no-renames',
            '-U0',
            range,
            '--',
            file
        )
        return !isExemptWorkflowChange(file, authors, diff)
    })
    const commitMessages = git(
        'log',
        '--format=%B%x00',
        range
    ).split('\0').map((text) => text.trim()).filter(Boolean)
    return {
        changedFiles: allFiles.length && !changedFiles.length ? ['(dependabot uses-only bump)'] : changedFiles,
        commitMessages
    }
}
