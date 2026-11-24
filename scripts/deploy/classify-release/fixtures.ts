// Golden fixtures: every category lists paths that MUST be held. Narrowing or dropping a pattern fails a test.
export const HELD_FIXTURES: Record<string, string[]> = {
    migrations: [
        'prisma/migrations/20260101_x/migration.sql',
        'prisma/schema.prisma',
        'prisma.config.ts'
    ],
    'deploy-path': [
        '.github/workflows/deploy.yml',
        'Dockerfile',
        'scripts/deploy/ec2-redeploy.sh',
        'certs/rds-global-bundle.pem'
    ],
    'startup-deletes': [
        'src/lib/backgroundWorkers.ts',
        'src/utils/scheduleDailyJob.ts',
        'src/services/guestRetentionService.ts',
        'src/services/supportTicketRetentionService.ts',
        'src/services/accountDeletionService.ts',
        'src/constants/time.ts'
    ],
    'auth-security': [
        'src/middlewares/csrf.ts',
        'src/middlewares/sanitaization.ts',
        'src/middlewares/rateLimiting.ts',
        'src/lib/authCSRF.ts',
        'src/services/googleOAuthService.ts',
        'src/constants/auth/cookieNames.ts',
        'src/app.ts',
        'src/constants/excludedUserFields.ts'
    ],
    'config-env': [
        'config/custom-environment-variables.ts',
        'config/production.ts',
        'src/config/app.ts'
    ],
    ai: [
        'src/services/aiProviders/OpenAIProvider.ts',
        'src/services/aiInsightGeneratorService.ts',
        'src/lib/prompts/anything.ts',
        'src/lib/dailyObservation/observationAiGenerator.ts',
        'src/lib/progressInsights/summaryResolver.ts',
        'src/services/feedback/aiRenderer.ts'
    ],
    'runtime-deps': ['package-lock.json'],
    'routes-schemas-responses': [
        'src/routes/forumRoute.ts',
        'src/schemas/anything.ts',
        'src/responses/anything.ts'
    ],
    'response-contract': [
        'src/types/responseType.ts',
        'src/types/data/PostType.ts',
        'src/errors/CustomError.ts',
        'src/utils/recoveryGoalDTOConverter.ts'
    ],
    'build-inputs': [
        'package.json',
        '.npmrc',
        '.dockerignore',
        'public/logo.png',
        'tsconfig.json',
        'jest.config.ts',
        '.claude/routines/prod-error-fixer.md'
    ]
}

// Paths that must auto-ship (compose files and .env.example are not used in production).
export const AUTO_FIXTURES = [
    'src/services/forumService.ts',
    'src/controllers/forumController.ts',
    'src/utils/capitalizeText.ts',
    'src/__tests__/unit/forumService.test.ts',
    'README.md',
    'decisions/index.md',
    'compose.yaml',
    'docker-compose.dev.yml',
    '.env.example'
]
