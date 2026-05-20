export default {
    env: 'production',
    database: {
        url: process.env.DATABASE_URL || '',
        connectionTimeoutMillis: 0  // 0 = queue forever; safer under load than failing fast
    },
    server: {
        port: process.env.PORT || 8080,
        protocol: 'https',
        origin:
            process.env.ORIGIN
            || 'https://healease-client.onrender.com',
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