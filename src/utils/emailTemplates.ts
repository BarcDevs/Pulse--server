import ms, { type StringValue } from 'ms'

import { authConfig } from '../../config'
import { brandConfig } from '../config/app'
import { EMAIL_LOGO_CID } from '../constants/emailLogo'
import { minuteInMs } from '../constants/time'
import { getMessages, resolveLanguage } from '../locales'

const esc = (s: string): string =>
    s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')

const buildDigitCells = (otp: number): string =>
    String(otp)
        .padStart(6, '0')
        .split('')
        .map(d => `<td style="padding:0 5px;">
            <span style="
                display:inline-block;
                width:42px;
                height:50px;
                line-height:50px;
                text-align:center;
                border:1.5px solid #CBD5E1;
                border-radius:8px;
                font-size:26px;
                font-weight:700;
                color:#1A3E9F;
                font-family:monospace;">
            ${d}</span></td>`)
        .join('')

type TemplateStrings = {
    dir: 'ltr' | 'rtl'
    align: 'left' | 'right'
    lang: string
    title: string
    otpLabel: string
    heading: string
    headingFont: string
    intro: string
    expiry: string
    disclaimer: string
    footer: string
}

const baseTemplate = (s: TemplateStrings, otp: number): string => `<!DOCTYPE html>
<html lang="${s.lang}" dir="${s.dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(s.title)}</title>
  ${s.dir === 'rtl' ? '<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@800&display=swap" rel="stylesheet">' : ''}
</head>
<!-- Mail clients (Gmail etc.) drop the html/body dir, so direction is repeated on the tables and text -->
<body dir="${s.dir}" style="margin:0;padding:0;direction:${s.dir};background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table dir="${s.dir}" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table dir="${s.dir}" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;direction:${s.dir};">

          <!-- Blue header -->
          <tr>
            <td style="background-color:#1A3E9F;border-radius:12px 12px 0 0;padding:32px 36px 28px;">

              <!-- Logo row -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="vertical-align:middle;padding-${s.dir === 'rtl' ? 'left' : 'right'}:10px;">
                    <img src="cid:${EMAIL_LOGO_CID}" alt="${esc(brandConfig.brandName)}" width="36" height="36"
                      style="display:block;border-radius:8px;width:36px;height:36px;">
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">${esc(brandConfig.brandName)}</span>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;text-align:${s.align};font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#93B4F0;">${esc(s.otpLabel)}</p>
              <h1 style="margin:0;text-align:${s.align};font-size:28px;font-weight:800;color:#FFFFFF;letter-spacing:${s.dir === 'rtl' ? '0' : '-0.5px'};font-family:${s.headingFont};">${esc(s.heading)}</h1>
            </td>
          </tr>

          <!-- White card body -->
          <tr>
            <td style="background-color:#FFFFFF;border-radius:0 0 12px 12px;padding:36px 36px 32px;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

              <p style="margin:0 0 28px;text-align:${s.align};font-size:15px;color:#475569;line-height:1.65;">${esc(s.intro)}</p>

              <!-- Digit boxes: always LTR, or an RTL layout reverses the code -->
              <table dir="ltr" align="${s.align}" cellpadding="0" cellspacing="0" style="margin-bottom:28px;direction:ltr;">
                <tr>
                  ${buildDigitCells(otp)}
                </tr>
              </table>

              <!-- Expiry warning -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#FEF3C7;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0;text-align:${s.align};font-size:13px;font-weight:600;color:#92400E;line-height:1.5;">
                      ${esc(s.expiry)}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;text-align:${s.align};font-size:13px;color:#94A3B8;line-height:1.6;">${esc(s.disclaimer)}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:20px;">
              <p style="margin:0;font-size:12px;color:#94A3B8;">${esc(s.footer)}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

const buildStrings = (
    lang: string | null | undefined,
    type: 'resetPassword' | 'confirmEmail' | 'changeEmail'
): TemplateStrings => {
    const resolved = resolveLanguage(lang)
    const msgs = getMessages(resolved)
    const isRtl = resolved === 'he'
    const brandName = brandConfig.brandName
    return {
        dir: isRtl ? 'rtl' : 'ltr',
        align: isRtl ? 'right' : 'left',
        lang: resolved,
        headingFont: isRtl
            ? "Heebo, 'Arial Hebrew', Arial, sans-serif"
            : 'inherit',
        title: msgs.emails.shared.title.replaceAll('{{brandName}}', brandName),
        otpLabel: msgs.emails.shared.otpLabel,
        heading: msgs.emails.shared.heading,
        // From the real OTP TTL, so the email can't drift from config
        expiry: msgs.emails.shared.expiry.replaceAll(
            '{{minutes}}',
            String(Math.round(
                ms(authConfig.otp_expiration as unknown as StringValue)
                / minuteInMs
            ))
        ),
        footer: msgs.emails.shared.footer.replaceAll('{{brandName}}', brandName),
        intro: msgs.emails[type].html.intro.replaceAll('{{brandName}}', brandName),
        disclaimer: msgs.emails[type].html.disclaimer
    }
}

export const resetPasswordTemplate = (
    otp: number,
    lang?: string | null
): string => baseTemplate(buildStrings(lang, 'resetPassword'), otp)

export const confirmEmailTemplate = (
    otp: number,
    lang?: string | null
): string => baseTemplate(buildStrings(lang, 'confirmEmail'), otp)

export const changeEmailTemplate = (
    otp: number,
    lang?: string | null
): string => baseTemplate(buildStrings(lang, 'changeEmail'), otp)
