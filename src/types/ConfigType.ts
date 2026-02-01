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
    service: string
    port: number
    secure: boolean
    emailUser: string
    emailPass: string
}

type AuthConfig = {
    jwtSecret: string
    expiresIn: number
    otp_expiration: number
}

export type {
    AppConfig,
    AuthConfig,
    DatabaseConfig,
    EmailConfig,
    EnvConfig,
    ServerConfig}
