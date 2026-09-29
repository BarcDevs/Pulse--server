// Hosts whose images render inline. Any other image URL is shown as a link,
// so a post can't make every reader's browser call an outside server.
// Our own origin is always allowed on top of these
export const TRUSTED_IMAGE_HOSTS = [
    // Google account avatars (Google sign-in profile pictures)
    'lh3.googleusercontent.com'
]
