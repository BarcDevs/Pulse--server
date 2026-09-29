import path from 'path'

// Sent as an inline attachment and referenced as cid:, which Gmail and
// Outlook render; data: URIs are blocked by Gmail and WebP by Outlook.
export const EMAIL_LOGO_CID = 'pulse-logo'

export const EMAIL_LOGO_PATH = path.join(
    __dirname,
    '../../public/logos/PulseLogoNoCaption.png'
)
