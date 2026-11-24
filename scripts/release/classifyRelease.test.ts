import { classifyRelease, type ReleaseInput,runtimeDepsDiffer } from './classifyRelease'

const base: ReleaseInput = {
    files: [],
    commitMessages: ['fix(forum): trim post title'],
    prBody: 'Client impact: none',
    runtimeDepsChanged: false
}

const ruleIds = (input: Partial<ReleaseInput>) =>
    classifyRelease({ ...base, ...input }).matches.map((match) => match.rule)

describe('classifyRelease', () => {
    it('ships an additive service change automatically', () => {
        const result = classifyRelease({ ...base, files: ['src/services/forumService.ts', 'src/models/forumModel.ts'] })
        expect(result).toEqual({ held: false, matches: [] })
    })

    it.each([
        ['prisma/migrations/2026_x/migration.sql', 'migrations'],
        ['prisma/schema.prisma', 'migrations'],
        ['prisma.config.ts', 'migrations'],
        ['.github/workflows/deploy.yml', 'deploy-path'],
        ['Dockerfile', 'deploy-path'],
        ['scripts/deploy/ec2-redeploy.sh', 'deploy-path'],
        ['certs/rds-global-bundle.pem', 'deploy-path'],
        ['src/services/guestRetentionService.ts', 'data-deleting-jobs'],
        ['src/services/authService.ts', 'auth-security'],
        ['src/middlewares/rateLimiting.ts', 'auth-security'],
        ['src/app.ts', 'auth-security'],
        ['src/constants/excludedUserFields.ts', 'auth-security'],
        ['config/custom-environment-variables.ts', 'config'],
        ['src/services/aiProviders/OpenAIProvider.ts', 'ai'],
        ['src/lib/prompts/insight.ts', 'ai'],
        ['package-lock.json', 'dependencies'],
        ['src/routes/forumRoute.ts', 'api-surface'],
        ['src/schemas/forumSchema.ts', 'api-surface'],
        ['src/responses/forumResponse.ts', 'api-surface']
    ])('holds a change to %s (%s)', (file, rule) => {
        expect(ruleIds({ files: [file] })).toEqual([rule])
    })

    it('holds a runtime dependency change even without a lockfile change', () => {
        expect(ruleIds({ files: ['package.json'], runtimeDepsChanged: true })).toEqual(['dependencies'])
    })

    it('ships a package.json change that leaves runtime dependencies alone', () => {
        expect(ruleIds({ files: ['package.json'] })).toEqual([])
    })

    it('holds a BREAKING CHANGE footer and a bang commit', () => {
        expect(ruleIds({ commitMessages: ['feat: x\n\nBREAKING CHANGE: y'] })).toEqual(['breaking-change'])
        expect(ruleIds({ commitMessages: ['feat(api)!: x'] })).toEqual(['breaking-change'])
    })

    it('holds when client impact is not none and ships when it is none', () => {
        expect(ruleIds({ prBody: 'Client impact: the posts endpoint drops a field' })).toEqual(['client-impact'])
        expect(ruleIds({ prBody: 'Client impact: none' })).toEqual([])
        expect(ruleIds({ prBody: '' })).toEqual([])
    })

    it('reports every matching rule with its evidence', () => {
        const result = classifyRelease({
            ...base,
            files: ['prisma/schema.prisma', 'src/routes/forumRoute.ts']
        })
        expect(result.held).toBe(true)
        expect(result.matches.map((match) => match.rule)).toEqual(['migrations', 'api-surface'])
        expect(result.matches[0].evidence).toEqual(['prisma/schema.prisma'])
    })
})

describe('runtimeDepsDiffer', () => {
    it('ignores devDependencies and detects runtime changes', () => {
        expect(runtimeDepsDiffer({ devDependencies: { a: '1' } }, { devDependencies: { a: '2' } })).toBe(false)
        expect(runtimeDepsDiffer({ dependencies: { a: '1' } }, { dependencies: { a: '2' } })).toBe(true)
        expect(runtimeDepsDiffer({}, { optionalDependencies: { a: '1' } })).toBe(true)
    })
})
