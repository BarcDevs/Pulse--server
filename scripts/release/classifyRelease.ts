export type HoldRule = {
    id: string
    label: string
    patterns: RegExp[]
}

export type ReleaseInput = {
    files: string[]
    commitMessages: string[]
    prBody: string
    runtimeDepsChanged: boolean
}

export type RuleMatch = {
    rule: string
    label: string
    evidence: string[]
}

export type Classification = {
    held: boolean
    matches: RuleMatch[]
}

export const HOLD_RULES: HoldRule[] = [
    {
        id: 'migrations',
        label: 'Database migrations and schema',
        patterns: [
            /^prisma\/migrations\//,
            /^prisma\/schema\.prisma$/,
            /^prisma\/migration_lock\.toml$/,
            /^prisma\.config\.ts$/
        ]
    },
    {
        id: 'deploy-path',
        label: 'Deploy path',
        patterns: [
            /^\.github\//,
            /^Dockerfile$/,
            /^scripts\/deploy\//,
            /^certs\//
        ]
    },
    {
        id: 'data-deleting-jobs',
        label: 'Startup and scheduled jobs that delete data',
        patterns: [
            /^src\/lib\/backgroundWorkers\.ts$/,
            /^src\/utils\/scheduleDailyJob\.ts$/,
            /^src\/services\/(guestRetention|supportTicketRetention|accountDeletion)Service\.ts$/
        ]
    },
    {
        id: 'auth-security',
        label: 'Auth and security',
        patterns: [
            /^src\/services\/(authService|googleOAuthService)\.ts$/,
            /^src\/lib\/auth[A-Za-z]*\.ts$/,
            /^src\/middlewares\/(csrf|isAdmin|isAuthenticated|launchFunnelAuth|optionalAuthentication|supportReaderAuth|rateLimiting|sanitaization|exposeProductionApp)\.ts$/,
            /^src\/app\.ts$/,
            /^src\/constants\/excludedUserFields\.ts$/
        ]
    },
    {
        id: 'config',
        label: 'Config and env mapping',
        patterns: [/^config\//]
    },
    {
        id: 'ai',
        label: 'AI config, providers and prompts',
        patterns: [
            /^src\/services\/aiProviders\//,
            /^src\/lib\/prompts\//,
            /^src\/lib\/aiInsight\//,
            /^src\/config\/(progressInsights|recoveryGoals)\.ts$/
        ]
    },
    {
        id: 'dependencies',
        label: 'Runtime dependencies and lockfile',
        patterns: [/^package-lock\.json$/]
    },
    {
        id: 'api-surface',
        label: 'Routes, schemas and responses',
        patterns: [
            /^src\/routes\//,
            /^src\/schemas\//,
            /^src\/responses\//
        ]
    }
]

const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:/m
const BREAKING_BANG = /^[a-z]+(\([^)]*\))?!:/
const CLIENT_IMPACT = /^Client impact:\s*(.+)$/im

const matchFiles = (files: string[], patterns: RegExp[]): string[] =>
    files.filter((file) => patterns.some((pattern) => pattern.test(file)))

const hasClientImpact = (prBody: string): string | null => {
    const found = CLIENT_IMPACT.exec(prBody)
    if (!found) return null
    const value = found[1].trim()
    return /^none\b/i.test(value) ? null : value
}

export const classifyRelease = (input: ReleaseInput): Classification => {
    const matches: RuleMatch[] = []

    HOLD_RULES.forEach((rule) => {
        const evidence = matchFiles(input.files, rule.patterns)
        if (rule.id === 'dependencies' && input.runtimeDepsChanged) evidence.push('package.json (runtime dependencies)')
        if (evidence.length) {
            matches.push({
                rule: rule.id,
                label: rule.label,
                evidence
            })
        }
    })

    const breaking = input.commitMessages.filter(
        (message) => BREAKING_FOOTER.test(message) || BREAKING_BANG.test(message.split('\n')[0])
    )
    if (breaking.length) {
        matches.push({
            rule: 'breaking-change',
            label: 'BREAKING CHANGE commit',
            evidence: breaking.map((message) => message.split('\n')[0])
        })
    }

    const impact = hasClientImpact(input.prBody)
    if (impact) {
        matches.push({
            rule: 'client-impact',
            label: 'Client impact is not none',
            evidence: [impact]
        })
    }

    return {
        held: matches.length > 0,
        matches
    }
}

export const runtimeDepsDiffer = (
    before: Record<string, unknown>,
    after: Record<string, unknown>
): boolean =>
    ['dependencies', 'optionalDependencies'].some(
        (key) => JSON.stringify(before[key] ?? {}) !== JSON.stringify(after[key] ?? {})
    )
