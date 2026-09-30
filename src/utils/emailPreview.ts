import fs from 'fs'

import {
    EMAIL_LOGO_CID,
    EMAIL_LOGO_PATH
} from '../constants/emailLogo'

// Browsers can't resolve cid: (a mail attachment), so previews inline the logo
export const inlineEmailLogo = (html: string): string => {
    const logo = fs.readFileSync(EMAIL_LOGO_PATH).toString('base64')
    return html.replaceAll(
        `cid:${EMAIL_LOGO_CID}`,
        `data:image/png;base64,${logo}`
    )
}
