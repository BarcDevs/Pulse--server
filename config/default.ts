export default {
    env: 'development',
    app: {
        start: 'Server is running on {0}'
    },
    server: {
        port: 3000,
        host: 'localhost',
        protocol: 'http',
        url: '{protocol}://{host}:{port}',
        origin: 'http://localhost:5173',
        apiVersion: 'v1'
    },
    auth: {
        jwtSecret: '',
        expiresIn: '1d',
        otp_expiration: '10m'
    },
    database: {
        url: 'DEV_DATABASE_URL'
    },
    email: {
        host: 'sandbox.smtp.mailtrap.io',
        port: 2525,
        secure: false,
        emailUser: 'EMAIL_USER',
        emailPass: 'EMAIL_PASSWORD'
    },
    googleOAuth: {
        clientId: '',
        clientSecret: '',
        redirectUri: 'http://localhost:4000/api/v2/auth/google/callback',
        clientUrl: 'http://localhost:5173'
    },
    ai: {
        provider: 'google',
        anthropicModel: 'claude-sonnet-5',
        googleFreeModel: 'gemini-3.1-flash-lite',
        googleModel: 'gemini-3.1-pro-preview',
        openaiModel: 'gpt-5.6-sol',
        openaiApiKey: '',
        anthropicApiKey: '',
        googleApiKey: '',
        googleFreeApiKey: '',
        fallbackOrder: ''
    },
    aiGeneration: {
        maxOutputTokens: 1000,
        temperature: 0.7
    },
    logging: {
        dir: 'logs'
    }
}

