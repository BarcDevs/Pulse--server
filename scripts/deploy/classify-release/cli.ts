import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'

import { classifySafely } from './classify'

const git = (...args: string[]): string => execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
})

const requireEnv = (name: string): string => {
    const value = process.env[name]
    if (!value) throw new Error(`${name} is not set`)
    return value
}

const result = classifySafely(() => {
    const last = requireEnv('LAST_DEPLOYED_SHA')
    const sha = requireEnv('DEPLOY_SHA')
    const prTextFile = requireEnv('PR_TEXT_FILE')
    const range = `${last}..${sha}`
    return {
        changedFiles: git(
            'diff',
            '--no-renames',
            '--name-only',
            '-z',
            range
        ).split('\0').filter(Boolean),
        commitMessages: git(
            'log',
            '--format=%B%x00',
            range
        ).split('\0').map((text) => text.trim()).filter(Boolean),
        prTexts: [readFileSync(prTextFile, 'utf8')]
    }
})

// The deploy job runs only when this output is exactly the string 'false'.
const output = `hold=${result.hold ? 'true' : 'false'}\n`
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output)
console.info(output.trim())
result.reasons.forEach((reason) => console.info(`  ${reason}`))
