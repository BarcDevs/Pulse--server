export default {
    // Fail closed: an unrecognized NODE_ENV (no config file of its own) runs
    // as production, so dev-only behavior (OTPs in responses, swagger, /dev)
    // needs development.ts to opt in
    env: 'production',
    app: {
        start: 'Server is running on {0}',
        workersEnabled: true
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
        url: 'DEV_DATABASE_URL',
        poolMax: 10,
        connectionTimeoutMs: 5000,
        idleTimeoutMs: 30000,
        statementTimeoutMs: 15000,
        slowQueryMs: 200
    },
    // Redis cache and rate-limit counters. An empty host means Redis is off and
    // the server keeps its in-process counters and caches (the default, so a box
    // without the broker profile runs as before). The container caps its memory
    // at 100 MiB with allkeys-lru, so every key must be able to be lost.
    redis: {
        host: '',
        port: 6379,
        password: '',
        connectTimeoutMs: 1000,
        commandTimeoutMs: 300,
        keyPrefix: 'pulse:'
    },
    // RabbitMQ job queue. An empty host means no broker: jobs run on the Postgres
    // polling worker. Messages carry job ids only, never health content.
    rabbitmq: {
        host: '',
        port: 5672,
        vhost: '/pulse',
        user: 'pulse_node',
        password: '',
        publishTimeoutMs: 2000,
        reconnectDelayMs: 2000
    },
    // postgres: the polling worker (today's behaviour). rabbitmq: jobs are
    // published to the broker and consumed from it; the table stays the record.
    jobs: {
        backend: 'postgres',
        // Set from the H4 load test: 12 jobs at once kept up with 2.4 check-ins a second
        consumerConcurrency: 12
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
        openaiModel: 'gpt-6.1-sol',
        openaiApiKey: '',
        // Chat completions endpoint. Only the load test changes it, to point at the fake model server
        openaiBaseUrl: 'https://api.openai.com/v1',
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
        dir: 'logs',
        cloudWatchErrorLogGroup: '',
        cloudWatchRegion: 'eu-central-1'
    },
    launchFunnel: {
        secret: ''
    },
    supportReader: {
        secret: ''
    }
}

