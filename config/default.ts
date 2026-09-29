export default {
    env: 'development',
    app: {
        start: 'Server is running on {0}'
    },
    server: {
        port: 3000,
        host: '127.0.0.1',
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
    // Resend SMTP: user is always "resend", the password is the API key
    // (EMAIL_PASSWORD, the only env-provided email value)
    email: {
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        emailUser: 'resend',
        emailPass: 'EMAIL_PASSWORD',
        emailFrom: 'Pulse <noreply@pulserehab.app>',
        supportEmail: 'support@pulserehab.app'
    },
    googleOAuth: {
        clientId: '',
        clientSecret: '',
        redirectUri: '{protocol}://{host}:{port}/api/{apiVersion}/auth/google/callback',
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
        temperature: 0.7,
        timeoutMs: 15000
    },
    logging: {
        dir: 'logs'
    }
}

