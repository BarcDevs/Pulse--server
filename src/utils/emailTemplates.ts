import fs from 'fs'
import path from 'path'

let LOGO_URL = ''
try {
    const logoBase64 = fs.readFileSync(
        path.join(__dirname, '../../public/logos/HealEaseLogoNoCaption.webp')
    ).toString('base64')
    LOGO_URL = `data:image/webp;base64,${logoBase64}`
} catch {
    // logo missing — img will render with alt text only
}

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
    lang: string
    otpLabel: string
    heading: string
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
  <title>Your HealEase verification code</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Blue header -->
          <tr>
            <td style="background-color:#1A3E9F;border-radius:12px 12px 0 0;padding:32px 36px 28px;">

              <!-- Logo row -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="vertical-align:middle;padding-${s.dir === 'rtl' ? 'left' : 'right'}:10px;">
                    <img src="${LOGO_URL}" alt="HealEase" width="36" height="36"
                      style="display:block;border-radius:8px;width:36px;height:36px;">
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">HealEase</span>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#93B4F0;">${s.otpLabel}</p>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">${s.heading}</h1>
            </td>
          </tr>

          <!-- White card body -->
          <tr>
            <td style="background-color:#FFFFFF;border-radius:0 0 12px 12px;padding:36px 36px 32px;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

              <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.65;">${s.intro}</p>

              <!-- Digit boxes -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  ${buildDigitCells(otp)}
                </tr>
              </table>

              <!-- Expiry warning -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#FEF3C7;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0;font-size:13px;font-weight:600;color:#92400E;line-height:1.5;">
                      ${s.expiry}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#94A3B8;line-height:1.6;">${s.disclaimer}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:20px;">
              <p style="margin:0;font-size:12px;color:#94A3B8;">${s.footer}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

// ── English ──────────────────────────────────────────────────────────────────

export const resetPasswordTemplate = (otp: number): string =>
    baseTemplate({
        dir: 'ltr',
        lang: 'en',
        otpLabel: 'One-Time Password',
        heading: `Here's your code.`,
        intro: 'Use the code below to reset your HealEase password. It works just once and only on the device that asked for it.',
        expiry: 'This code expires in 15 minutes. Do not share it with anyone.',
        disclaimer: `Didn't request this? Ignore this email. Your account is safe and no changes have been made.`,
        footer: `© 2026 HealEase · You're receiving this because someone used your email address.`
    }, otp)

export const confirmEmailTemplate = (otp: number): string =>
    baseTemplate({
        dir: 'ltr',
        lang: 'en',
        otpLabel: 'One-Time Password',
        heading: `Here's your code.`,
        intro: 'Use the code below to verify your HealEase account. It works just once and only on the device that asked for it.',
        expiry: 'This code expires in 15 minutes. Do not share it with anyone.',
        disclaimer: `Didn't create a HealEase account? Ignore this email. Your account will remain inactive until verified.`,
        footer: `© 2026 HealEase · You're receiving this because someone used your email address.`
    }, otp)

export const changeEmailTemplate = (otp: number): string =>
    baseTemplate({
        dir: 'ltr',
        lang: 'en',
        otpLabel: 'One-Time Password',
        heading: `Here's your code.`,
        intro: 'Use the code below to confirm your new email address. It works just once and only on the device that asked for it.',
        expiry: 'This code expires in 15 minutes. Do not share it with anyone.',
        disclaimer: `Didn't request this change? Secure your account immediately by resetting your password.`,
        footer: `© 2026 HealEase · You're receiving this because someone used your email address.`
    }, otp)

// ── Hebrew ────────────────────────────────────────────────────────────────────

export const resetPasswordTemplateHe = (otp: number): string =>
    baseTemplate({
        dir: 'rtl',
        lang: 'he',
        otpLabel: 'סיסמה חד-פעמית',
        heading: 'הנה הקוד שלך.',
        intro: 'השתמש בקוד הבא כדי לאפס את סיסמת ה-HealEase שלך. הקוד תקף פעם אחת בלבד ורק במכשיר שממנו ביקשת.',
        expiry: 'קוד זה יפוג בעוד 15 דקות. אל תשתף אותו עם אף אחד.',
        disclaimer: 'לא ביקשת זאת? התעלם מאימייל זה. החשבון שלך בטוח ולא בוצעו שינויים.',
        footer: '© 2026 HealEase · קיבלת אימייל זה כי מישהו השתמש בכתובת האימייל שלך.'
    }, otp)

export const confirmEmailTemplateHe = (otp: number): string =>
    baseTemplate({
        dir: 'rtl',
        lang: 'he',
        otpLabel: 'סיסמה חד-פעמית',
        heading: 'הנה הקוד שלך.',
        intro: 'השתמש בקוד הבא כדי לאמת את חשבון ה-HealEase שלך. הקוד תקף פעם אחת בלבד ורק במכשיר שממנו ביקשת.',
        expiry: 'קוד זה יפוג בעוד 15 דקות. אל תשתף אותו עם אף אחד.',
        disclaimer: 'לא יצרת חשבון HealEase? התעלם מאימייל זה. החשבון יישאר לא פעיל עד לאימות.',
        footer: '© 2026 HealEase · קיבלת אימייל זה כי מישהו השתמש בכתובת האימייל שלך.'
    }, otp)

export const changeEmailTemplateHe = (otp: number): string =>
    baseTemplate({
        dir: 'rtl',
        lang: 'he',
        otpLabel: 'סיסמה חד-פעמית',
        heading: 'הנה הקוד שלך.',
        intro: 'השתמש בקוד הבא כדי לאמת את כתובת האימייל החדשה שלך. הקוד תקף פעם אחת בלבד ורק במכשיר שממנו ביקשת.',
        expiry: 'קוד זה יפוג בעוד 15 דקות. אל תשתף אותו עם אף אחד.',
        disclaimer: 'לא ביקשת שינוי זה? אבטח את חשבונך מיידית על ידי איפוס הסיסמה.',
        footer: '© 2026 HealEase · קיבלת אימייל זה כי מישהו השתמש בכתובת האימייל שלך.'
    }, otp)
