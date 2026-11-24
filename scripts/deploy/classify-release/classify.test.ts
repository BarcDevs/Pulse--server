import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'

import { classify, classifySafely } from './classify'
import { AUTO_FIXTURES, HELD_FIXTURES } from './fixtures'
import { HOLD_CATEGORIES } from './rules'
import guards from './ship-guards.json'

const root = join(__dirname, '..', '..', '..')

const run = (changedFiles: string[], extra: { commitMessages?: string[], prTexts?: string[] } = {}) => classify({
    changedFiles,
    commitMessages: extra.commitMessages ?? ['fix: x'],
    prTexts: extra.prTexts ?? ['Client impact: none']
})

const trackedFiles = (): string[] => execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
}).split('\0').filter(Boolean)

describe('golden fixtures', () => {
    Object.entries(HELD_FIXTURES).forEach(([category, files]) => {
        it.each(files)(`holds %s (${category})`, (file) => {
            const result = run([file])
            expect(result.hold).toBe(true)
            expect(result.reasons.some((reason) => reason.startsWith(`${category}:`))).toBe(true)
        })
    })

    it.each(AUTO_FIXTURES)('auto-ships %s', (file) => {
        expect(run([file])).toEqual({
            hold: false,
            reasons: []
        })
    })

    it('holds a rename out of a held dir and a deleted held file (both appear as paths)', () => {
        expect(run(['src/middlewares/csrf.ts', 'src/utils/csrf.ts']).hold).toBe(true)
        expect(run(['src/services/forumService.ts', 'prisma/migrations/x/migration.sql']).hold).toBe(true)
    })
})

describe('text rules', () => {
    it('holds a Client impact that is not none, in a commit, the PR body or a comment', () => {
        expect(run(['src/utils/capitalizeText.ts'], { prTexts: ['Client impact: drops a field'] }).hold).toBe(true)
        expect(run(['src/utils/capitalizeText.ts'], { commitMessages: ['fix: x\n\nClient impact: renamed'] }).hold).toBe(true)
        expect(run(['src/utils/capitalizeText.ts'], { prTexts: ['Client impact: none', 'Client impact: breaks login'] }).hold).toBe(true)
        expect(run(['src/utils/capitalizeText.ts'], { prTexts: ['Client impact: none'] }).hold).toBe(false)
    })

    it('holds BREAKING CHANGE footers and bang commits', () => {
        expect(run(['src/utils/capitalizeText.ts'], { commitMessages: ['feat: x\n\nBREAKING CHANGE: y'] }).hold).toBe(true)
        expect(run(['src/utils/capitalizeText.ts'], { commitMessages: ['feat(api)!: x'] }).hold).toBe(true)
        expect(run(['src/utils/capitalizeText.ts'], { prTexts: ['BREAKING CHANGE: y'] }).hold).toBe(true)
    })
})

describe('required-guards manifest', () => {
    it('lists every rule category and nothing else', () => {
        expect([...guards.categories].sort()).toEqual(HOLD_CATEGORIES.map(({ id }) => id).sort())
    })

    it('has golden fixtures for every listed category', () => {
        guards.categories.forEach((id) => {
            expect(HELD_FIXTURES[id]?.length).toBeGreaterThan(0)
        })
    })

    it('has a text rule for every listed text rule', () => {
        expect(guards.textRules).toEqual(['client-impact', 'breaking-change'])
        expect(run(['src/utils/capitalizeText.ts'], { prTexts: ['Client impact: x'] }).reasons[0]).toMatch(/^client-impact:/)
        expect(run(['src/utils/capitalizeText.ts'], { prTexts: ['BREAKING CHANGE: x'] }).reasons[0]).toMatch(/^breaking-change:/)
    })
})

describe('against the real repository', () => {
    const tracked = trackedFiles()

    it('matches at least one tracked file with every pattern', () => {
        HOLD_CATEGORIES.forEach(({ id, patterns }) => {
            patterns.forEach((pattern) => {
                expect({
                    id,
                    pattern: String(pattern),
                    count: tracked.filter((file) => pattern.test(file)).length > 0
                }).toEqual({
                    id,
                    pattern: String(pattern),
                    count: true
                })
            })
        })
    })

    it('holds the rule files themselves', () => {
        const ruleFiles = tracked.filter((file) => file.startsWith('scripts/deploy/classify-release/'))
        expect(ruleFiles.length).toBeGreaterThan(0)
        expect(run(ruleFiles).hold).toBe(true)
        ruleFiles.forEach((file) => expect(run([file]).hold).toBe(true))
        expect(run(['.github/workflows/deploy.yml']).hold).toBe(true)
    })

    const importTree = (entry: string): string[] => {
        const seen = new Set<string>()
        const visit = (file: string) => {
            if (seen.has(file) || !existsSync(join(root, file))) return
            seen.add(file)
            const source = readFileSync(join(root, file), 'utf8')
            for (const [, spec] of source.matchAll(/from\s+'(\.[^']+)'/g)) {
                const base = normalize(join(dirname(file), spec)).split('\\').join('/')
                const candidate = [`${base}.ts`, `${base}/index.ts`].find((path) => existsSync(join(root, path)))
                if (candidate) visit(candidate)
            }
        }
        visit(entry)
        return [...seen]
    }

    it('holds the whole import tree of the startup purge jobs', () => {
        const entries = [
            'src/lib/backgroundWorkers.ts',
            'src/services/guestRetentionService.ts',
            'src/services/supportTicketRetentionService.ts',
            'src/services/accountDeletionService.ts'
        ]
        const purgeFiles = entries.flatMap(importTree).filter(
            (file) => /(Model|time|scheduleDailyJob|Retention|accountDeletion|backgroundWorkers)/.test(file)
        )
        const open = purgeFiles.filter((file) => !run([file]).hold)
        expect(open).toEqual([])
    })

    it('holds every file that imports an AI provider or the insight generator', () => {
        const importers = tracked.filter((file) => file.startsWith('src/') && file.endsWith('.ts') && !file.includes('__tests__'))
            .filter((file) => /aiProviders|aiInsightGeneratorService/.test(readFileSync(join(root, file), 'utf8')))
        expect(importers.filter((file) => !run([file]).hold)).toEqual([])
    })
})

describe('fail closed', () => {
    it('holds an empty diff', () => {
        expect(run([]).hold).toBe(true)
    })

    it('holds when the reader throws', () => {
        const result = classifySafely(() => {
            throw new Error('unknown revision')
        })
        expect(result.hold).toBe(true)
        expect(result.reasons[0]).toContain('unknown revision')
    })

    it('holds on a non-Error throw', () => {
        expect(classifySafely(() => {
            throw 'boom'
        }).hold).toBe(true)
    })
})
