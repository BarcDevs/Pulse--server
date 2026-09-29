import { googleOAuthConfig } from '../../config'
import { TRUSTED_IMAGE_HOSTS } from '../constants/forum/trustedImageHosts'

/** Resolves relative and protocol-relative URLs the way a browser would,
 * then allows only our own origin or an https trusted host. */
export const isTrustedImageUrl = (src?: string | null): boolean => {
    if (!src) return false

    try {
        const ownOrigin = new URL(googleOAuthConfig.clientUrl).origin
        const url = new URL(src, ownOrigin)

        if (url.origin === ownOrigin) return true

        return url.protocol === 'https:'
            && TRUSTED_IMAGE_HOSTS.includes(url.hostname)
    } catch {
        return false
    }
}
