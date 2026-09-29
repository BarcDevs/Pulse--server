export default {
    env: 'APP_ENV',
    server: {
        port: 'PORT',
        origin: 'ORIGIN',
        apiVersion: 'SERVER_API_VERSION'
    },
    database: {
        url: 'DATABASE_URL'
    },
    auth: {
        jwtSecret: 'JWT_SECRET'
    },
    email: {
        emailPass: 'EMAIL_PASSWORD',
        supportEmail: 'SUPPORT_EMAIL'
    },
    googleOAuth: {
        clientId: 'GOOGLE_CLIENT_ID',
        clientSecret: 'GOOGLE_CLIENT_SECRET',
        redirectUri: 'GOOGLE_REDIRECT_URI',
        clientUrl: 'ORIGIN'
    },
    ai: {
        provider: 'AI_PROVIDER',
        anthropicModel: 'ANTHROPIC_MODEL',
        googleFreeModel: 'GOOGLE_FREE_MODEL',
        googleModel: 'GOOGLE_MODEL',
        openaiModel: 'OPENAI_MODEL',
        openaiApiKey: 'OPENAI_API_KEY',
        anthropicApiKey: 'ANTHROPIC_API_KEY',
        googleApiKey: 'GOOGLE_AI_API_KEY',
        googleFreeApiKey: 'GOOGLE_FREE_AI_API_KEY',
        fallbackOrder: 'AI_FALLBACK_ORDER'
    },
    aiGeneration: {
        maxOutputTokens: 'AI_MAX_OUTPUT_TOKENS',
        temperature: 'AI_TEMPERATURE'
    },
    logging: {
        dir: 'LOG_DIR'
    }
}