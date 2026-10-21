import { monthInMs } from '../time'

export const supportTicketListDefaultLimit = 20

export const supportTicketExcerptMaxLength = 120

export const supportReaderSecretMinLength = 16

export const supportTicketClosedRetentionMs = 6 * monthInMs

export const supportTicketOpenRetentionMs = 24 * monthInMs

export const supportReplyEmailSubjectPrefix = 'Re: [Pulse support]'
