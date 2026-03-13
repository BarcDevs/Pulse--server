import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

import {authConfig} from '../../config'
import type {ServerUserType} from '../types/data/UserType'

const hashPassword = (
    password: string
): string =>
    bcrypt.hashSync(password, 10)

const comparePassword = (
    password: string,
    hashedPassword: string
): boolean =>
    bcrypt.compareSync(
        password,
        hashedPassword
    )

const createToken = (
    user: ServerUserType
): string => {
    const payload = {
        id: user.id,
        email: user.email
    }
    const options: jwt.SignOptions = {
        expiresIn: authConfig
            .expiresIn as
            jwt.SignOptions['expiresIn']
    }

    return jwt.sign(
        payload,
        authConfig.jwtSecret!,
        options
    )
}

export {
    comparePassword,
    createToken,
    hashPassword
}