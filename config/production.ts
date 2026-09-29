export default {
    env: 'production',
    server: {
        port: process.env.PORT || 8080,
        protocol: 'https',
        // origin comes from ORIGIN (custom-environment-variables); no
        // hardcoded fallback, so prod never trusts a leftover Vercel origin
        host: '0.0.0.0'
    },
    auth: {
        expiresIn: '7d'
    },
    ai: {
        provider: 'anthropic',
        fallbackOrder: 'anthropic,google-pro,openai'
    }
}