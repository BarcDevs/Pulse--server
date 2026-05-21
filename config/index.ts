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
    ServerConfig
} from '../src/types/configType'

const env: EnvConfig = config.get<EnvConfig>('env')
const isDev = (env as string) === 'development'

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

const databaseConfig: DatabaseConfig = {
    url: config.get<string>('database.url')
}

const emailConfig: EmailConfig = {
    host: config.get<string>('email.host'),
    port: config.get<number>('email.port'),
    secure: config.get<boolean>('email.secure'),
    emailUser: config.get<string>('email.emailUser'),
    emailPass: config.get<string>('email.emailPass')
}

const googleOAuthConfig: GoogleOAuthConfig = {
    clientId: config.get<string>(
        'googleOAuth.clientId'
    ),
    clientSecret: config.get<string>(
        'googleOAuth.clientSecret'
    ),
    redirectUri: config.get<string>(
        'googleOAuth.redirectUri'
    ),
    clientUrl: config.get<string>(
        'googleOAuth.clientUrl'
    )
}

const aiConfig: AIConfig = {
    provider: config.get<string>(
        'ai.provider'
    ),
    anthropicModel: config.get<string>(
        'ai.anthropicModel'
    ),
    googleModel: config.get<string>(
        'ai.googleModel'
    ),
    openaiModel: config.get<string>(
        'ai.openaiModel'
    ),
    openaiApiKey: config.get<string>(
        'ai.openaiApiKey'
    ),
    anthropicApiKey: config.get<string>(
        'ai.anthropicApiKey'
    ),
    googleApiKey: config.get<string>(
        'ai.googleApiKey'
    )
}

const aiGenerationConfig: AIGenerationConfig = {
    maxOutputTokens: config.get<number>(
        'aiGeneration.maxOutputTokens'
    ),
    temperature: config.get<number>(
        'aiGeneration.temperature'
    )
}

export {
    aiConfig,
    aiGenerationConfig,
    appConfig,
    authConfig,
    databaseConfig,
    emailConfig,
    env,
    googleOAuthConfig,
    isDev,
    serverConfig
}
