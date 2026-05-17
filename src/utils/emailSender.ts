import nodemailer from 'nodemailer'

import { emailConfig } from '../../config'

import logger from './logger'

const transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: {
        user: emailConfig.emailUser!,
        pass: emailConfig.emailPass!
    }
})

export const sendEmail = async (
    email: string,
    subject: string,
    text: string,
    html?: string
): Promise<void> => {
    const mailOptions = {
        from: emailConfig.emailUser!,
        to: email,
        subject,
        text,
        ...(html && { html })
    }

    try {
        const info =
            await transporter.sendMail(mailOptions)
        logger.info(`Email sent: ${info.response}`)
    } catch (error) {
        const user = emailConfig.emailUser ?? ''
        logger.error('Failed to send email', {
            to: email,
            subject,
            smtpUser: `${user.slice(0, 4)}****`,
            smtpHost: emailConfig.host,
            smtpPort: emailConfig.port,
            error: error instanceof Error
                ? {
                    ...error,
                    message: error.message,
                    name: error.name
                }
                : String(error)
        })
        throw new Error(
            'Failed to send email. Please try again later.',
            { cause: error }
        )
    }
}