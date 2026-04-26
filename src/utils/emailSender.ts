import nodemailer from 'nodemailer'

import { emailConfig } from '../../config'

const transporter = nodemailer.createTransport({
    host: emailConfig.host,
    service: emailConfig.service,
    secure: emailConfig.secure,
    port: emailConfig.port,
    auth: {
        user: emailConfig.emailUser!,
        pass: emailConfig.emailPass!
    }
})

export const sendEmail = async (
    email: string,
    subject: string,
    text: string
): Promise<void> => {
    const mailOptions = {
        from: emailConfig.emailUser!,
        to: email,
        subject,
        text
    }

    try {
        const info =
            await transporter.sendMail(mailOptions)
        console.info(`Email sent: ${info.response}`)
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : 'Unknown error'
        console.error('Error sending email:', message)
        throw error
    }
}