import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

import { authConfig } from '../../config'
import { SESSION_EXPIRES_IN } from '../constants/auth/authRules'
import type { ServerUserType } from '../types/data/UserType'

export const hashPassword = (
    password: string
): Promise<string> =>
    bcrypt.hash(password, 12)

export const comparePassword = (
    password: string,
    hashedPassword: string
): Promise<boolean> =>
    bcrypt.compare(
        password,
        hashedPassword
    )

export const createToken = (
    user: ServerUserType,
    remember = false
): string => {
    // Id only: the payload is readable by anyone holding the token, and
    // nothing reads the email from it
    const payload = {
        id: user.id
    }
    const options: jwt.SignOptions = {
        expiresIn: (remember
            ? authConfig.expiresIn
            : SESSION_EXPIRES_IN) as
            jwt.SignOptions['expiresIn']
    }

    return jwt.sign(
        payload,
        authConfig.jwtSecret,
        options
    )
}

export const verifyToken = (
    token: string
): jwt.JwtPayload & { id?: string } =>
    jwt.verify(
        token,
        authConfig.jwtSecret,
        { algorithms: ['HS256'] }
    ) as jwt.JwtPayload & { id?: string }