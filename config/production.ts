export default {
    env: 'production',
    database: {
        url: process.env.DATABASE_URL || ''
    },
    server: {
        port: process.env.PORT || 8080,
        protocol: 'https',
        origin:
            process.env.ORIGIN
            || 'https://pulse-client.vercel.app',
        host: '0.0.0.0'
    },
    auth: {
        expiresIn: '7d'
    },
    email: {
        port: 587,
        secure: true
    }
}