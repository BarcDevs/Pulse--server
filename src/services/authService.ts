import { randomUUID } from 'crypto'

import { Prisma } from '../../prisma/generated/prisma/client'
import {
    ALREADY_SIGNED_IN_MESSAGE,
    DUMMY_PASSWORD_HASH,
    EMAIL_TAKEN_MESSAGE,
    GUEST_EMAIL_DOMAIN,
    GUEST_ID_LENGTH,
    GUEST_ONLY_UPGRADE_MESSAGE,
    GUEST_PASSWORD_HASH,
    GUEST_PLACEHOLDER_NAME,
    GUEST_USERNAME_PREFIX,
    USERNAME_TAKEN_MESSAGE
} from '../constants/auth/authRules'
import {
    PRISMA_RECORD_NOT_FOUND,
    PRISMA_UNIQUE_VIOLATION
} from '../constants/prismaErrorCodes'
import { secondInMs } from '../constants/time'
import { errorFactory } from '../errors/factory/ErrorFactory'
import {
    comparePassword,
    createToken,
    hashPassword,
    verifyToken
} from '../lib/authCrypto'
import { generateRandomUsername } from '../lib/authHelpers'
import { getTimezoneFromIp } from '../lib/geoLocation'
import * as authModel from '../models/authModel'
import * as profileModel from '../models/profileModel'
import { getSessionState } from '../models/sessionModel'
import type { UpgradeGuestType } from '../schemas/auth/upgradeGuestSchema'
import type { ResolvedGuestType } from '../types/data/ResolvedGuestType'
import type { SessionType } from '../types/data/SessionType'
import type {
    NewUserType,
    ServerUserType
} from '../types/data/UserType'

export const getUser = async (
    by: 'email' | 'id',
    value: string
) => {
    let user: ServerUserType | null
    switch (by) {
        case 'email':
            user = await authModel.getUserByEmail(value)
            break
        case 'id':
            user = await authModel.getUserById(value)
            break
        default:
            user = null
            break
    }

    return user
}

// A session dies when the user is deactivated or the password changes after
// the token was issued (iat is in whole seconds). DB errors propagate so an
// outage is a 500, not a forced logout.
export const getSession = async (
    token?: string
): Promise<SessionType | null> => {
    if (!token) return null

    let payload: ReturnType<typeof verifyToken>
    try {
        payload = verifyToken(token)
    } catch {
        return null
    }

    const { id, iat } = payload
    if (!id || !iat) return null

    const session = await getSessionState(id)
    if (!session?.active) return null

    const passwordUpdatedAt = Math.floor(
        session.passwordUpdatedAt.getTime() / secondInMs
    )

    return passwordUpdatedAt <= iat
        ? {
            userId: id,
            isGuest: !!session.isGuest
        }
        : null
}

// Guests count as anonymous here, so routes that personalise for a logged-in
// user never treat a guest as one
export const getSessionUserId = async (
    token?: string
): Promise<string | null> => {
    const session = await getSession(token)

    return session && !session.isGuest
        ? session.userId
        : null
}

// Deactivated accounts keep their email until the purge
export const isEmailTaken = async (
    email: string
): Promise<boolean> =>
    !!await authModel.getUserByEmailAnyStatus(email)

// Signing back in during the deletion grace period cancels the deletion
export const restoreIfPendingDeletion = async (
    user: ServerUserType
): Promise<void> => {
    if (!user.active)
        await authModel.restoreUser(user.id)
}

export const applyDetectedTimezone = async (
    userId: string,
    currentTimezone?: string,
    ip?: string
): Promise<void> => {
    const detectedTimezone = ip
        ? getTimezoneFromIp(ip)
        : null

    if (
        detectedTimezone
        && detectedTimezone !== currentTimezone
    ) {
        await profileModel.updateProfile(
            userId,
            { timezone: detectedTimezone }
        )
    }
}

export const login = async (
    email: string,
    password: string,
    remember: boolean,
    ip?: string
): Promise<string> => {
    const user: ServerUserType | null =
        await authModel.getUserByEmailAnyStatus(email)

    const passwordMatches = await comparePassword(
        password,
        user?.password ?? DUMMY_PASSWORD_HASH
    )

    // Guests have no password; the shared placeholder hash is a second
    // barrier, this is the first
    if (
        !user
        || user.isGuest
        || !passwordMatches
    ) {
        throw errorFactory.auth.credentials()
    }

    await restoreIfPendingDeletion(user)

    await applyDetectedTimezone(
        user.id,
        user.profile?.timezone,
        ip
    )

    return createToken(user, remember)
}

const assertEmailAndUsernameFree = async (
    email: string,
    username?: string
): Promise<void> => {
    if (await isEmailTaken(email))
        throw errorFactory.auth.conflict(
            EMAIL_TAKEN_MESSAGE
        )

    if (
        username
        && await authModel.getUserByUsername(username)
    )
        throw errorFactory.auth.conflict(
            USERNAME_TAKEN_MESSAGE
        )
}

export const signup = async (
    newUser: NewUserType
): Promise<ServerUserType> => {
    await assertEmailAndUsernameFree(
        newUser.email,
        newUser.username
    )

    const passwordHash =
        await hashPassword(newUser.password)

    const userWithHashedPassword = {
        ...newUser,
        password: passwordHash
    }

    return authModel.createUser(
        userWithHashedPassword
    )
}

// Placeholders satisfy the unique/non-null columns; the .invalid email and the
// password nobody knows mean nobody can log in as a guest. Guests never log
// in, so the timezone is detected from the IP here or their days would run on
// the profile default
export const createGuest = async (
    ip?: string
): Promise<ServerUserType> => {
    // The login email keeps the whole UUID: the short id is only for the
    // username, which other users can see
    const guestId = randomUUID().replaceAll('-', '')
    const timezone = ip
        ? getTimezoneFromIp(ip)
        : null

    const guest = await authModel.createUser(
        {
            firstName: GUEST_PLACEHOLDER_NAME,
            lastName: GUEST_PLACEHOLDER_NAME,
            username: `${GUEST_USERNAME_PREFIX}${guestId.slice(0, GUEST_ID_LENGTH)}`,
            email: `${guestId}@${GUEST_EMAIL_DOMAIN}`,
            password: GUEST_PASSWORD_HASH,
            isGuest: true
        },
        timezone ?? undefined
    )

    return await authModel.getUserById(guest.id) ?? guest
}

// Idempotent per cookie: a valid guest session is reused, and a session that
// belongs to a real account is never replaced
export const resolveGuest = async (
    token?: string,
    ip?: string
): Promise<ResolvedGuestType> => {
    const session = await getSession(token)

    if (
        session
        && !session.isGuest
    )
        throw errorFactory.auth.conflict(
            ALREADY_SIGNED_IN_MESSAGE
        )

    const existing = session
        ? await authModel.getUserById(session.userId)
        : null

    if (existing)
        return {
            user: existing,
            created: false
        }

    return {
        user: await createGuest(ip),
        created: true
    }
}

// Two requests racing the same upgrade or the same email end at the unique
// index or at the isGuest filter, and both are client errors, not 500s
// The violated column is read back from the data, not from the error: the
// pg adapter does not report it under meta.target
const toUpgradeConflict = async (
    error: unknown,
    email: string
) => {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError))
        return error

    if (error.code === PRISMA_UNIQUE_VIOLATION)
        return errorFactory.auth.conflict(
            await isEmailTaken(email)
                ? EMAIL_TAKEN_MESSAGE
                : USERNAME_TAKEN_MESSAGE
        )

    if (error.code === PRISMA_RECORD_NOT_FOUND)
        return errorFactory.auth.forbidden(
            GUEST_ONLY_UPGRADE_MESSAGE
        )

    return error
}

export const upgradeGuest = async (
    userId: string,
    upgrade: UpgradeGuestType
): Promise<ServerUserType> => {
    await assertEmailAndUsernameFree(
        upgrade.email,
        upgrade.username
    )

    try {
        return await authModel.convertGuest(
            userId,
            {
                ...upgrade,
                username: upgrade.username ?? generateRandomUsername(),
                password: await hashPassword(upgrade.password)
            }
        )
    } catch (error: unknown) {
        throw await toUpgradeConflict(
            error,
            upgrade.email
        )
    }
}

export const resetPassword = async (
    userId: string,
    newPassword: string
): Promise<ServerUserType> => {
    await authModel.updatePassword(
        userId,
        await hashPassword(newPassword)
    )

    return authModel.markEmailVerified(userId)
}

export const updateEmail = (
    userId: string,
    newEmail: string
): Promise<ServerUserType> =>
    authModel.updateEmail(userId, newEmail)

export const deactivateUser = async (
    userId: string
): Promise<void> => {
    const user = await authModel.getUserById(userId)

    if (!user)
        throw errorFactory.generic.notFound('User')

    await authModel.disableUser(userId)
}