import { monthInMs } from '../time'

export const supportTicketListDefaultLimit = 20

export const supportTicketExcerptMaxLength = 120

export const supportReaderSecretMinLength = 16

export const supportReaderRateLimitKey = 'support-reader'

export const supportTicketClosedRetentionMs = 6 * monthInMs

export const supportTicketOpenRetentionMs = 24 * monthInMs

export const supportReplyEmailSubjectPrefix = 'Re: [Pulse support]'

export const redactedEmailPlaceholder = '[email]'

export const redactedNumberPlaceholder = '[number]'

export const redactedLinkPlaceholder = '[link]'

// a link with any scheme, a www. link, or a bare domain or IPv4 (optional port) followed by a path, query or fragment;
// not preceded by an @, so an email is left to the email rule
export const linkRedactionPattern = /(?:[a-z][a-z0-9+.-]*:\/\/|www\.|(?<![\p{L}\p{N}@.-])(?:(?:[\p{L}\p{N}-]+\.)+\p{L}{2,}|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?(?=[/?#]))\S+/giu

export const emailRedactionPattern = /[^\s@]+@[^\s@]+\.[^\s@]+/g

// 9 or more digits, allowing up to 3 separators (space . - parentheses) between digits: phones and long ids
export const numberRedactionPattern = /\+?\(?\d(?:[\s().-]{0,3}\d){8,}/g

// authority (may still hold credentials) and first path segment of a link, dropping the rest of the path, query and fragment
export const linkShortenPattern = /^(?:[a-z][a-z0-9+.-]*:\/\/)?([^/?#\\]*)(?:\/([^/?#\\]*))?/i

// a first path segment that reads as a page name (goals, reset-password), not a handle, token or id
export const linkPageNameSegmentPattern = /^[a-z]+(?:-[a-z]+)*$/

export const linkPageNameSegmentMaxLength = 30

export const linkTrailingPunctuationPattern = /[.,;:!?)\]'"]+$/
