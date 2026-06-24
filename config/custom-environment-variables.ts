export default {
    server: {
        port: 'PORT',
        origin: 'ORIGIN',
        apiVersion: 'SERVER_API_VERSION'
    },
    database: {
        url: 'DEV_DATABASE_URL'
    },
    auth: {
        jwtSecret: 'JWT_SECRET'
    },
    email: {
        emailUser: 'EMAIL_USER',
        emailPass: 'EMAIL_PASSWORD'
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
        googleModel: 'GOOGLE_MODEL',
        openaiModel: 'OPENAI_MODEL',
        openaiApiKey: 'OPENAI_API_KEY',
        anthropicApiKey: 'ANTHROPIC_API_KEY',
        googleApiKey: 'GOOGLE_AI_API_KEY'
    },
    aiGeneration: {
        maxOutputTokens: 'AI_MAX_OUTPUT_TOKENS',
        temperature: 'AI_TEMPERATURE'
    }
}