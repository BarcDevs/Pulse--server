export type HoldCategory = {
    id: string
    patterns: RegExp[]
}

// Whole directories, never single names: a new file in a held area is held without editing this list.
export const HOLD_CATEGORIES: HoldCategory[] = [
    {
        id: 'migrations',
        patterns: [
            /^prisma\/migrations\//,
            /^prisma\/schema\.prisma$/,
            /^prisma\.config\.ts$/
        ]
    },
    {
        id: 'deploy-path',
        patterns: [
            /^\.github\//,
            /^Dockerfile$/,
            /^scripts\/deploy\//,
            /^certs\//
        ]
    },
    {
        id: 'startup-deletes',
        patterns: [
            /^src\/lib\/backgroundWorkers\.ts$/,
            /^src\/utils\/scheduleDailyJob\.ts$/,
            /^src\/services\/(guestRetention|supportTicketRetention|accountDeletion)Service\.ts$/,
            /^src\/models\/(authModel|supportTicketModel|accountDeletionModel|checkInAiJobModel|aiInsightModel|checkInModel|profileModel|forumModel|recommendationsModel)\.ts$/,
            /^src\/constants\/time\.ts$/
        ]
    },
    {
        id: 'auth-security',
        patterns: [
            /^src\/middlewares\//,
            /^src\/lib\/auth[A-Za-z]*\.ts$/,
            /^src\/constants\/auth\//,
            /^src\/services\/(authService|googleOAuthService)\.ts$/,
            /^src\/models\/authModel\.ts$/,
            /^src\/controllers\/authController\.ts$/,
            /^src\/app\.ts$/,
            /^src\/constants\/excludedUserFields\.ts$/
        ]
    },
    {
        id: 'config-env',
        patterns: [
            /^config\//,
            /^src\/config\//
        ]
    },
    {
        id: 'ai',
        patterns: [
            /^src\/services\/aiProviders\//,
            /^src\/services\/aiInsightGeneratorService\.ts$/,
            /^src\/services\/feedback\//,
            /^src\/services\/(insightGeneration|dailyObservation|progressInsights|recommendations|checkInAiQueue|checkInAiWorker)Service\.ts$/,
            /^src\/lib\/(prompts|aiInsight|dailyObservation|progressInsights|recommendations|queue)\//
        ]
    },
    {
        id: 'runtime-deps',
        patterns: [/^package-lock\.json$/]
    },
    {
        id: 'routes-schemas-responses',
        patterns: [
            /^src\/routes\//,
            /^src\/schemas\//,
            /^src\/responses\//
        ]
    },
    {
        id: 'response-contract',
        patterns: [
            /^src\/types\/responseType\.ts$/,
            /^src\/types\/data\//,
            /^src\/errors\//,
            /DTOConverter\.ts$/
        ]
    },
    {
        id: 'build-inputs',
        patterns: [
            /^package\.json$/,
            /^\.npmrc$/,
            /^\.dockerignore$/,
            /^public\//,
            /^tsconfig[^/]*\.json$/,
            /^jest[^/]*\.config\.ts$/,
            /^\.claude\/routines\//
        ]
    }
]
