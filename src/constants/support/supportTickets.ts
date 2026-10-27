import { monthInMs } from '../time'

export const supportTicketListDefaultLimit = 20

export const supportTicketExcerptMaxLength = 120

export const supportReaderSecretMinLength = 16

export const supportTicketClosedRetentionMs = 6 * monthInMs

export const supportTicketOpenRetentionMs = 24 * monthInMs

export const supportReplyEmailSubjectPrefix = 'Re: [Pulse support]'

export const redactedEmailPlaceholder = '[email]'

export const redactedNumberPlaceholder = '[number]'

export const redactedLinkPlaceholder = '[link]'

export const linkRedactionPattern = /(?:https?:\/\/|www\.)\S+/gi

export const emailRedactionPattern = /[^\s@]+@[^\s@]+\.[^\s@]+/g

// 9 or more digits, allowing one separator (space . - parentheses) between digits: phones and long ids
export const numberRedactionPattern = /\+?\d(?:[\s().-]?\d){8,}/g
