import type {CookieOptions} from 'express'

import {isDev} from '../../../config'
import {
    hourInMs, 
    minuteInMs,
    dayInMs
} from '../time'

const COOKIE_NAMES = {
    ACCESS_TOKEN: 'accessToken',
    CSRF_SECRET: '_csrf',
    OAUTH_STATE: 'oauth_state'
}

const buildAccessTokenCookieOptions = (
    remember: boolean
): CookieOptions => ({
    httpOnly: true,
    sameSite: !isDev ? 'none' : 'lax',
    secure: !isDev,
    maxAge: remember ? 30 * dayInMs : dayInMs
})

const buildCSRFCookieOptions = (): CookieOptions => ({
    httpOnly: true,
    sameSite: !isDev ? 'none' : 'lax',
    secure: !isDev,
    maxAge: hourInMs
})

const buildOAuthStateCookieOptions = (): CookieOptions => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: !isDev,
    maxAge: 10 * minuteInMs
})

export {
    buildAccessTokenCookieOptions,
    buildCSRFCookieOptions,
    buildOAuthStateCookieOptions,
    COOKIE_NAMES
}