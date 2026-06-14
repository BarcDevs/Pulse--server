import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'

import { googleOAuthConfig } from '../../config'
import { HttpStatusCodes } from '../constants/httpStatusCodes'
import { AuthError } from '../errors/AuthError'
import * as authModel from '../models/authModel'
import * as profileModel from '../models/profileModel'
import type { ServerUserType } from '../types/data/UserType'
import logger from '../utils/logger'
import Prisma from '../utils/prismaClient'

import { applyDetectedTimezone } from './authService'

const oAuth2Client = new OAuth2Client(
    googleOAuthConfig.clientId,
    googleOAuthConfig.clientSecret,
    googleOAuthConfig.redirectUri
)

export type GoogleProfile = {
    googleId: string
    email: string
    firstName: string
    lastName: string
    picture: string | null
}

export const generateState = (): string =>
    crypto.randomBytes(32).toString('hex')

export const validateState = (
    cookieState: string | undefined,
    queryState: string | undefined
): boolean =>
    !!cookieState
    && !!queryState
    && cookieState === queryState

export const buildAuthUrl = (state: string): string =>
    oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'openid',
            'email',
            'profile'
        ],
        state,
        prompt: 'consent'
    })

export const exchangeCodeForTokens = async (
    code: string
) => {
    try {
        const { tokens } =
            await oAuth2Client.getToken(code)
        return tokens
    } catch (error) {
        logger.error(`[GoogleOAuth] Token exchange failed: ${error}`)
        throw new AuthError(
            'Failed to authenticate with Google',
            undefined,
            'OAuth Error',
            HttpStatusCodes.UNAUTHORIZED
        )
    }
}

export const fetchGoogleProfile = async (
    idToken: string
): Promise<GoogleProfile> => {
    try {
        const ticket = await oAuth2Client.verifyIdToken({
            idToken,
            audience: googleOAuthConfig.clientId
        })

        const payload = ticket.getPayload()

        if (!payload)
            throw new AuthError(
                'Failed to retrieve Google profile',
                undefined,
                'OAuth Error',
                HttpStatusCodes.UNAUTHORIZED
            )

        if (!payload.email)
            throw new AuthError(
                'Email not provided by Google',
                undefined,
                'OAuth Error',
                HttpStatusCodes.UNAUTHORIZED
            )

        if (!payload.email_verified)
            throw new AuthError(
                'Email not verified by Google',
                undefined,
                'OAuth Error',
                HttpStatusCodes.UNAUTHORIZED
            )

        return {
            googleId: payload.sub,
            email: payload.email,
            firstName: payload.given_name ?? '',
            lastName: payload.family_name ?? '',
            picture: payload.picture ?? null
        }
    } catch (error) {
        if (error instanceof AuthError) throw error

        logger.error(`[GoogleOAuth] Profile fetch failed: ${error}`)
        throw new AuthError(
            'Failed to retrieve Google profile',
            undefined,
            'OAuth Error',
            HttpStatusCodes.UNAUTHORIZED
        )
    }
}

const findUserByGoogleId = async (
    googleId: string
): Promise<ServerUserType | null> => {
    const user = await Prisma.user.findUnique({
        where: {
            googleId,
            active: true
        }
    })

    return user as ServerUserType | null
}

const slugifyUsername = (raw: string): string =>
    raw
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 20)

const generateUniqueUsername = async (
    profile: GoogleProfile
): Promise<string> => {
    const baseName = profile.firstName && profile.lastName
        ? `${profile.firstName}-${profile.lastName}`
        : profile.email.split('@')[0]

    const slug = slugifyUsername(baseName)
    const base = slug || 'user'

    const existing =
        await authModel.getUserByUsername(base)
    if (!existing) return base

    const maxAttempts = 10
    for (let i = 1; i <= maxAttempts; i++) {
        const candidate = `${base}-${crypto
            .randomBytes(3)
            .toString('hex')}`
        const taken =
            await authModel.getUserByUsername(candidate)
        if (!taken) return candidate
    }

    throw new AuthError(
        'Failed to create user account',
        undefined,
        'OAuth Error',
        HttpStatusCodes.INTERNAL_SERVER_ERROR
    )
}

const createGoogleUser = async (
    profile: GoogleProfile
): Promise<ServerUserType> => {
    const username =
        await generateUniqueUsername(profile)

    const randomPassword = crypto
        .randomBytes(32)
        .toString('hex')

    const user = await Prisma.$transaction(
        async (tx: typeof Prisma) => {
            const createdUser = await tx.user.create({
                data: {
                    firstName: profile.firstName || 'Google',
                    lastName: profile.lastName || 'User',
                    username,
                    email: profile.email,
                    password: randomPassword,
                    googleId: profile.googleId
                }
            })

            await tx.profile.create({
                data: {
                    userId: createdUser.id,
                    image: profile.picture
                }
            })

            return createdUser
        }
    )

    return user as ServerUserType
}

const linkGoogleId = async (
    userId: string,
    googleId: string,
    picture: string | null
): Promise<ServerUserType> => {
    const user = await Prisma.$transaction(
        async (tx: typeof Prisma) => {
            const updatedUser = await tx.user.update({
                where: {
                    id: userId,
                    active: true
                },
                data: {
                    googleId
                }
            })

            if (picture) {
                const profile =
                    await tx.profile.findUnique({
                        where: { userId },
                        select: { image: true }
                    })

                if (!profile?.image) {
                    await tx.profile.update({
                        where: { userId },
                        data: { image: picture }
                    })
                }
            }

            return updatedUser
        }
    )

    return user as ServerUserType
}

export const findOrCreateUser = async (
    profile: GoogleProfile
): Promise<ServerUserType> => {
    const existingByGoogleId =
        await findUserByGoogleId(profile.googleId)
    if (existingByGoogleId) return existingByGoogleId

    const existingByEmail =
        await authModel.getUserByEmail(profile.email)
    if (existingByEmail)
        return linkGoogleId(
            existingByEmail.id,
            profile.googleId,
            profile.picture
        )

    return createGoogleUser(profile)
}

export const handleCallback = async (
    code: string,
    ip?: string
): Promise<ServerUserType> => {
    const tokens =
        await exchangeCodeForTokens(code)

    if (!tokens.id_token)
        throw new AuthError(
            'Failed to authenticate with Google',
            undefined,
            'OAuth Error',
            HttpStatusCodes.UNAUTHORIZED
        )

    const profile =
        await fetchGoogleProfile(tokens.id_token)

    const user = await findOrCreateUser(profile)

    const userProfile =
        await profileModel.getProfileByUserId(user.id)

    await applyDetectedTimezone(
        user.id,
        userProfile?.timezone,
        ip
    )

    return user
}
