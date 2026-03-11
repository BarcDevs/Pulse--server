import config from 'config'

import type {
    AppConfig,
    AuthConfig,
    DatabaseConfig,
    EmailConfig,
    EnvConfig,
    ServerConfig
} from '../src/types/ConfigType'

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
    service: config.get<string>('email.service'),
    port: config.get<number>('email.port'),
    secure: config.get<boolean>('email.secure'),
    emailUser: config.get<string>('email.emailUser'),
    emailPass: config.get<string>('email.emailPass')
}

export {
    appConfig,
    authConfig,
    databaseConfig,
    emailConfig,
    env,
    isDev,
    serverConfig
}
