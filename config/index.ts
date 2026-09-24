import config from 'config'

import type {
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
} from '../src/types/configType'

const env: EnvConfig = config.get<EnvConfig>('env')
const isDev = (env as string) === 'development'
const isProd = (env as string) === 'production'

const serverConfig: ServerConfig = {
    url: config.get<string>('server.url'),
    port: config.get<number>('server.port'),
    host: config.get<string>('server.host'),
    origin: config.get<string>('server.origin'),
    protocol: config.get<string>('server.protocol'),
    apiVersion: config.get<string>('server.apiVersion')
}

const appConfig: AppConfig = {
    start: config.get<string>('app.start')
}

const authConfig: AuthConfig = {
    jwtSecret: config.get<string>('auth.jwtSecret'),
    expiresIn: config.get<number>('auth.expiresIn'),
    otp_expiration: config.get<number>('auth.otp_expiration')
}

if (authConfig.jwtSecret.length < 32) {
    throw new Error(
        'JWT_SECRET is missing or too short (min 32 chars) — refusing to start'
    )
}

const databaseConfig: DatabaseConfig = {
    url: config.get<string>('database.url')
}

const emailConfig: EmailConfig = {
    host: config.get<string>('email.host'),
    port: config.get<number>('email.port'),
    secure: config.get<boolean>('email.secure'),
    emailUser: config.get<string>('email.emailUser'),
    emailPass: config.get<string>('email.emailPass'),
    supportEmail: config.get<string>('email.supportEmail')
}

const googleOAuthConfig: GoogleOAuthConfig = {
    clientId: config.get<string>(
        'googleOAuth.clientId'
    ),
    clientSecret: config.get<string>(
        'googleOAuth.clientSecret'
    ),
    redirectUri: config.get<string>('googleOAuth.redirectUri')
        .replace(/\{protocol}/g, serverConfig.protocol)
        .replace(/\{host}/g, serverConfig.host)
        .replace(/\{port}/g, serverConfig.port.toString())
        .replace(/\{apiVersion}/g, serverConfig.apiVersion),
    clientUrl: config.get<string>(
        'googleOAuth.clientUrl'
    )
}

const aiConfig: AIConfig = {
    provider: config.get<string>('ai.provider'),
    anthropicModel: config.get<string>('ai.anthropicModel'),
    googleFreeModel: config.get<string>('ai.googleFreeModel'),
    googleModel: config.get<string>('ai.googleModel'),
    openaiModel: config.get<string>('ai.openaiModel'),
    openaiApiKey: config.get<string>('ai.openaiApiKey'),
    anthropicApiKey: config.get<string>('ai.anthropicApiKey'),
    googleApiKey: config.get<string>('ai.googleApiKey'),
    googleFreeApiKey: config.get<string>('ai.googleFreeApiKey'),
    fallbackOrder: config.get<string>('ai.fallbackOrder')
}

const aiFallbackOrder: string[] = aiConfig.fallbackOrder
    ? aiConfig.fallbackOrder
        .split(',')
        .map(id => id.trim())
        .filter(Boolean)
    : []

const aiGenerationConfig: AIGenerationConfig = {
    maxOutputTokens: config.get<number>(
        'aiGeneration.maxOutputTokens'
    ),
    temperature: config.get<number>(
        'aiGeneration.temperature'
    )
}

const loggingConfig: LoggingConfig = {
    dir: config.get<string>('logging.dir')
}

export {
    aiConfig,
    aiFallbackOrder,
    aiGenerationConfig,
    appConfig,
    authConfig,
    databaseConfig,
    emailConfig,
    env,
    googleOAuthConfig,
    isDev,
    isProd,
    loggingConfig,
    serverConfig
}
