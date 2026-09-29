import fs from 'fs'

import { EMAIL_LOGO_PATH } from '../../constants/emailLogo'
import { resetPasswordTemplate } from '../../utils/emailTemplates'

const digitOrder = (html: string) =>
    [...html.matchAll(/font-family:monospace;">\s*(\d)<\/span>/g)]
        .map(([, digit]) => digit)
        .join('')

describe('emailTemplates', () => {
    it('lays Hebrew mail out right-to-left on the tables themselves', () => {
        const html = resetPasswordTemplate(123456, 'he')

        expect(html).toContain('<body dir="rtl"')
        expect(html).toContain('<table dir="rtl"')
        expect(html).toContain('text-align:right')
        expect(html).not.toContain('text-align:left')
    })

    it('keeps the code left-to-right in Hebrew mail', () => {
        const html = resetPasswordTemplate(123456, 'he')

        expect(html).toContain('<table dir="ltr"')
        expect(digitOrder(html)).toBe('123456')
    })

    it('references the logo as an inline attachment that exists on disk', () => {
        const html = resetPasswordTemplate(123456, 'en')

        expect(html).toContain('src="cid:pulse-logo"')
        expect(fs.existsSync(EMAIL_LOGO_PATH)).toBe(true)
    })

    it('lays English mail out left-to-right', () => {
        const html = resetPasswordTemplate(123456, 'en')

        expect(html).toContain('<body dir="ltr"')
        expect(html).toContain('text-align:left')
        expect(html).not.toContain('text-align:right')
        expect(digitOrder(html)).toBe('123456')
    })
})
