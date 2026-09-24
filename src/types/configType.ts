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
}

type DatabaseConfig = {
    url: string
}

type EmailConfig = {
    host: string
    port: number
    secure: boolean
    emailUser: string
    emailPass: string
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
}

type LoggingConfig = {
    dir: string
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
    LoggingConfig,
    ServerConfig
}
