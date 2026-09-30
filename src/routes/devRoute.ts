import { Router } from 'express'

import { inlineEmailLogo } from '../utils/emailPreview'
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
    res.setHeader('Content-Type', 'text/html')
    res.send(inlineEmailLogo(render(otp, lang)))
})

export default router
