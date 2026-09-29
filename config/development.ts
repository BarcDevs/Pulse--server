export default {
    env: 'development',
    server: {
        port: 4001,
        host: '127.0.0.1',
        protocol: 'http',
        origin: 'http://localhost:5173',
        apiVersion: 'v1'
    },
    database: {
        url: process.env.DEV_DATABASE_URL || ''
    }
}
