import fs from 'fs'
import ms, { type StringValue } from 'ms'

import { authConfig } from '../../../config'
import { EMAIL_LOGO_PATH } from '../../constants/emailLogo'
import { minuteInMs } from '../../constants/time'
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

    it('states the real OTP lifetime from config in both languages', () => {
        const minutes = Math.round(
            ms(authConfig.otp_expiration as unknown as StringValue) / minuteInMs
        )

        expect(resetPasswordTemplate(123456, 'en'))
            .toContain(`expires in ${minutes} minutes`)
        expect(resetPasswordTemplate(123456, 'he'))
            .toContain(`יפוג בעוד ${minutes} דקות`)
        expect(resetPasswordTemplate(123456, 'en')).not.toContain('{{minutes}}')
    })

    it('lays English mail out left-to-right', () => {
        const html = resetPasswordTemplate(123456, 'en')

        expect(html).toContain('<body dir="ltr"')
        expect(html).toContain('text-align:left')
        expect(html).not.toContain('text-align:right')
        expect(digitOrder(html)).toBe('123456')
    })
})
