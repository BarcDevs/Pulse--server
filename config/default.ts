export default {
    env: 'NODE_ENV',
    app: {
        start: `Server is running on {0}`
    },
    server: {
        port: 3000,
        host: `localhost`,
        protocol: `http`,
        url: '{protocol}://{host}:{port}',
        origin: 'http://localhost:5173',
        apiVersion: 'v1'
    },
    auth: {
        jwtSecret: 'JWT_SECRET',
        expiresIn: '1d',
        otp_expiration: '10m'
    },
    database: {
        url: 'DATABASE_URL'
    },
    email: {
        host: 'sandbox.smtp.mailtrap.io',
        service: 'Mailtrap',
        port: 465,
        secure: false,
        emailUser: 'EMAIL_USER',
        emailPass: 'EMAIL_PASS'
    }
}

