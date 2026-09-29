import { loginSchema } from '../../schemas/auth/loginSchema'
import {
    hasSimpleRun,
    newPasswordField
} from '../../schemas/auth/passwordFormat'
import { resetPasswordSchema } from '../../schemas/auth/resetPasswordSchema'
import { signupSchema } from '../../schemas/auth/signupSchema'
import { updatePasswordSchema } from '../../schemas/user/updatePasswordSchema'

describe('password rules', () => {
    describe('hasSimpleRun', () => {
        it.each([
            'xx1234yy',
            'xx4321yy',
            'xxabcdyy',
            'xxDCBAyy',
            'xxaaaayy',
            'xx!!!!yy',
            'xx0000yy'
        ])('flags %s', (password) => {
            expect(hasSimpleRun(password)).toBe(true)
        })

        it.each([
            'Password123!',
            'xx123yy',
            'xxabcyy',
            'xxaaayy',
            'a1b2c3d4',
            'xx9012yy',
            'xxyz01ab'
        ])('allows %s', (password) => {
            expect(hasSimpleRun(password)).toBe(false)
        })
    })

    describe('newPasswordField', () => {
        const field = newPasswordField('required')

        it('accepts a strong password', () => {
            expect(field.safeParse('Recovery7Go').success).toBe(true)
        })

        it.each([
            ['no uppercase', 'recovery7go'],
            ['no lowercase', 'RECOVERY7GO'],
            ['no digit', 'RecoveryGo'],
            ['too short', 'Rec7go'],
            ['sequential digits', 'Recovery1234'],
            ['repeated letters', 'Recoveryyyy7']
        ])('rejects %s', (_label, password) => {
            expect(field.safeParse(password).success).toBe(false)
        })
    })

    describe('schemas', () => {
        const weakButLegacy = 'password1'

        it('applies the strong rule to signup, reset and change', () => {
            expect(signupSchema.safeParse({
                firstName: 'Test',
                lastName: 'User',
                email: 'test@test.com',
                password: weakButLegacy
            }).success).toBe(false)
            expect(resetPasswordSchema.safeParse({
                email: 'test@test.com',
                newPassword: weakButLegacy,
                userOTP: 123456
            }).success).toBe(false)
            expect(updatePasswordSchema.safeParse({
                currentPassword: 'anything',
                newPassword: weakButLegacy
            }).success).toBe(false)
        })

        it('keeps login on the old rule so existing users can sign in', () => {
            expect(loginSchema.safeParse({
                email: 'test@test.com',
                password: weakButLegacy
            }).success).toBe(true)
        })
    })
})
