import { emailConfig } from '../../config'
import { ValidationError } from '../errors/ValidationError'
import type { SupportContactType } from '../schemas/support/supportContactSchema'
import { sendEmail } from '../utils/emailSender'

import { getUser } from './authService'

type SendSupportMessageParams = SupportContactType & {
    userId?: string
}

export const sendSupportMessage = async ({
    topic,
    message,
    email,
    userId
}: SendSupportMessageParams): Promise<void> => {
    const user = userId
        ? await getUser('id', userId)
        : null
    const senderEmail = user?.email ?? email

    if (!senderEmail)
        throw new ValidationError('Email is required', 'email')

    const text = [
        `Topic: ${topic}`,
        `From: ${senderEmail}`,
        `Signed in: ${user ? `yes (user id: ${user.id})` : 'no'}`,
        '',
        message
    ].join('\n')

    await sendEmail(
        emailConfig.supportEmail,
        `[Pulse support] ${topic}`,
        text,
        undefined,
        senderEmail
    )
}
