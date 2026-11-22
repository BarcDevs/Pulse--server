type EnvConfig = string

type ServerConfig = {
    url: string
    port: number
    host: string
    origin: string
    protocol: string
    apiVersion: string
}

type AppConfig = {
    start: string
    workersEnabled: boolean
}

type DatabaseConfig = {
    url: string
    poolMax: number
    connectionTimeoutMs: number
    idleTimeoutMs: number
    statementTimeoutMs: number
    slowQueryMs: number
}

type RedisConfig = {
    host: string
    port: number
    password: string
    connectTimeoutMs: number
    commandTimeoutMs: number
    keyPrefix: string
}

type RabbitMqConfig = {
    host: string
    port: number
    vhost: string
    user: string
    password: string
    publishTimeoutMs: number
    reconnectDelayMs: number
}

type JobsConfig = {
    backend: string
    consumerConcurrency: number
}

type EmailConfig = {
    host: string
    port: number
    secure: boolean
    emailUser: string
    emailPass: string
    emailFrom: string
    supportEmail: string
}

type AuthConfig = {
    jwtSecret: string
    expiresIn: number
    otp_expiration: number
}

type GoogleOAuthConfig = {
    clientId: string
    clientSecret: string
    redirectUri: string
    clientUrl: string
}

type AIConfig = {
    provider: string
    anthropicModel: string
    googleFreeModel: string
    googleModel: string
    openaiModel: string
    openaiApiKey: string
    anthropicApiKey: string
    googleApiKey: string
    googleFreeApiKey: string
    fallbackOrder: string
}

type AIGenerationConfig = {
    maxOutputTokens: number
    temperature: number
    timeoutMs: number
}

type LaunchFunnelConfig = {
    secret: string
}

type SupportReaderConfig = {
    secret: string
}

type LoggingConfig = {
    dir: string
    cloudWatchErrorLogGroup: string
    cloudWatchRegion: string
}

export type {
    AIConfig,
    AIGenerationConfig,
    AppConfig,
    AuthConfig,
    DatabaseConfig,
    EmailConfig,
    EnvConfig,
    GoogleOAuthConfig,
    JobsConfig,
    LaunchFunnelConfig,
    LoggingConfig,
    RabbitMqConfig,
    RedisConfig,
    ServerConfig,
    SupportReaderConfig
}
