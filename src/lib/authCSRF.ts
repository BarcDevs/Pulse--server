import Csrf from 'csrf'

const csrfProtection = new Csrf()

export const generateCSRFToken = () => {
    const csrfSecret = csrfProtection
        .secretSync()
    const csrfToken = csrfProtection
        .create(csrfSecret)

    return {
        csrfSecret,
        csrfToken
    }
}