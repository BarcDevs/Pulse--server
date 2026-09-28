import jwt from 'jsonwebtoken'
import ms from 'ms'

import { authConfig } from '../../../config'
import { SESSION_EXPIRES_IN } from '../../constants/auth/authRules'
import { secondInMs } from '../../constants/time'
import { createToken } from '../../lib/authCrypto'
import { createMockUser } from '../setup/testSetup'

const lifetimeInMs = (token: string) => {
    const { iat, exp } = jwt.decode(token) as jwt.JwtPayload

    return (exp! - iat!) * secondInMs
}

describe('createToken', () => {
    it('should match the session cookie lifetime by default', () => {
        expect(lifetimeInMs(createToken(createMockUser())))
            .toBe(ms(SESSION_EXPIRES_IN))
    })

    it('should use the remember-me lifetime when remember is set', () => {
        expect(lifetimeInMs(createToken(createMockUser(), true)))
            .toBe(ms(authConfig.expiresIn))
    })
})
