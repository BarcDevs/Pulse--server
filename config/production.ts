export default {
    env: 'production',
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
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        emailUser: 'resend',
        emailFrom: 'Pulse <noreply@pulserehab.app>'
    },
    ai: {
        provider: 'anthropic',
        fallbackOrder: 'anthropic,google-pro,openai'
    }
}