import { Router } from 'express'

import {
    changeEmailTemplate,
    changeEmailTemplateHe,
    confirmEmailTemplate,
    confirmEmailTemplateHe,
    resetPasswordTemplate,
    resetPasswordTemplateHe
} from '../utils/emailTemplates'

const router = Router()

const templates: Record<string, Record<string, (otp: number) => string>> = {
    en: {
        'reset-password': resetPasswordTemplate,
        'confirm-email': confirmEmailTemplate,
        'change-email': changeEmailTemplate
    },
    he: {
        'reset-password': resetPasswordTemplateHe,
        'confirm-email': confirmEmailTemplateHe,
        'change-email': changeEmailTemplateHe
    }
}

router.get('/email-preview', (req, res) => {
    const type = (req.query.type as string) ?? 'reset-password'
    const lang = (req.query.lang as string) ?? 'en'
    const otp = parseInt(req.query.otp as string, 10) || 847392
    const render = (templates[lang] ?? templates.en)[type] ?? resetPasswordTemplate
    res.setHeader('Content-Type', 'text/html')
    res.send(render(otp))
})

export default router
