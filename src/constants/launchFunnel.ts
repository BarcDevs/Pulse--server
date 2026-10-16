import { dayInMs } from './time'

export const launchFunnelCookieName = 'launch_token'

export const launchFunnelCookieMaxAgeMs = 90 * dayInMs

// Opaque random id from the launch email link, never an email
export const launchTokenPattern = /^[A-Za-z0-9_-]{16,128}$/

export const launchFunnelSecretMinLength = 16
