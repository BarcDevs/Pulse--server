import { Router } from 'express'
import fs from 'fs'

import {
    EMAIL_LOGO_CID,
    EMAIL_LOGO_PATH
} from '../constants/emailLogo'
import {
    changeEmailTemplate,
    confirmEmailTemplate,
    deleteAccountTemplate,
    resetPasswordTemplate
} from '../utils/emailTemplates'

const router = Router()

type TemplateMap = Record<
    string,
    (otp: number, lang?: string | null) => string
>

const templates: TemplateMap = {
    'reset-password': resetPasswordTemplate,
    'confirm-email': confirmEmailTemplate,
    'change-email': changeEmailTemplate,
    'delete-account': deleteAccountTemplate
}

router.get('/email-preview', (req, res) => {
    const rawType = req.query.type
    const rawLang = req.query.lang
    const type = (
        typeof rawType === 'string'
            ? rawType
            : undefined
    ) ?? 'reset-password'
    const lang = (
        typeof rawLang === 'string'
            ? rawLang
            : undefined
    ) ?? 'en'
    const otp = (
        parseInt(
            req.query.otp as string,
            10
        ) || 847392
    )
    const render = templates[type]
        ?? resetPasswordTemplate
    // Browsers can't resolve cid: (a mail attachment), so inline the logo
    const logo = fs.readFileSync(EMAIL_LOGO_PATH).toString('base64')
    res.setHeader('Content-Type', 'text/html')
    res.send(render(otp, lang).replaceAll(
        `cid:${EMAIL_LOGO_CID}`,
        `data:image/png;base64,${logo}`
    ))
})

export default router
