import nodemailer from 'nodemailer'

import {emailConfig} from '../../config'

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

const sendEmail = (
    email: string,
    subject: string,
    text: string
) => {
    const mailOptions = {
        from: emailConfig.emailUser!,
        to: email,
        subject,
        text
    }

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            throw new Error(error.message)
        } else {
            console.info(`Email sent: ${info.response}`)
        }
    })
}

export {sendEmail}
