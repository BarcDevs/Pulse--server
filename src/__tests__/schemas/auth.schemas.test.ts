// @ts-nocheck
import { confirmEmailSchema } from '../../schemas/auth/confirmEmailSchema'
import { forgotPasswordSchema } from '../../schemas/auth/forgotPasswordSchema'
import { loginSchema } from '../../schemas/auth/loginSchema'
import { resetPasswordSchema } from '../../schemas/auth/resetPasswordSchema'
import { signupSchema } from '../../schemas/auth/signupSchema'

describe('Auth Schemas', () => {
    // ==================== LOGIN SCHEMA ====================
    describe('loginSchema', () => {
        it('should validate correct login data', () => {
            const result = loginSchema.safeParse({
                email: 'test@test.com',
                password: 'Password123!'
            })

            expect(result.error).toBeUndefined()
            expect(result.data).toEqual({
                email: 'test@test.com',
                password: 'Password123!',
                remember: false
            })
        })

        it(
            'should validate with optional remember field',
            () => {
                const result = loginSchema.safeParse({
                    email: 'test@test.com',
                    password: 'Password123!',
                    remember: true
                })

                expect(result.error).toBeUndefined()
                expect(result.data.remember).toBe(true)
            }
        )

        it('should reject invalid email format', () => {
            const result = loginSchema.safeParse({
                email: 'invalid-email',
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('email')
        })


        it('should accept email with .com TLD', () => {
            const result = loginSchema.safeParse({
                email: 'test@example.com',
                password: 'Password123!'
            })

            expect(result.error).toBeUndefined()
        })

        it('should accept email with .net TLD', () => {
            const result = loginSchema.safeParse({
                email: 'test@example.net',
                password: 'Password123!'
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject missing email', () => {
            const result = loginSchema.safeParse({
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('email')
        })

        it('should reject missing password', () => {
            const result = loginSchema.safeParse({
                email: 'test@test.com'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('password')
        })

        it(
            'should reject password shorter than 8 characters',
            () => {
                const result = loginSchema.safeParse({
                    email: 'test@test.com',
                    password: 'Pass1!'
                })

                expect(result.error).toBeDefined()
                expect(result.error?.issues[0].path)
                    .toContain('password')
            }
        )

        it(
            'should reject password without required pattern',
            () => {
                const result = loginSchema.safeParse({
                    email: 'test@test.com',
                    password: 'password'
                })

                expect(result.error).toBeDefined()
                expect(result.error?.issues[0].path)
                    .toContain('password')
            }
        )
    })

    // ==================== SIGNUP SCHEMA ====================
    describe('signupSchema', () => {
        it('should validate correct signup data', () => {
            const result = signupSchema.safeParse({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@test.com',
                password: 'Password123!'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with optional username', () => {
            const result = signupSchema.safeParse({
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                email: 'john@test.com',
                password: 'Password123!'
            })

            expect(result.error).toBeUndefined()
            expect(result.data.username).toBe('johndoe')
        })

        it('should allow underscore in username', () => {
            const result = signupSchema.safeParse({
                firstName: 'John',
                lastName: 'Doe',
                username: 'john_doe',
                email: 'john@test.com',
                password: 'Password123!'
            })

            expect(result.error).toBeUndefined()
            expect(result.data.username).toBe('john_doe')
        })

        it('should reject username with special characters', () => {
            const result = signupSchema.safeParse({
                firstName: 'John',
                lastName: 'Doe',
                username: 'john@doe',
                email: 'john@test.com',
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path).toContain('username')
        })

        it('should reject username shorter than 3 characters', () => {
            const result = signupSchema.safeParse({
                firstName: 'John',
                lastName: 'Doe',
                username: 'ab',
                email: 'john@test.com',
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path).toContain('username')
        })

        it('should reject username longer than 30 characters', () => {
            const result = signupSchema.safeParse({
                firstName: 'John',
                lastName: 'Doe',
                username: 'a'.repeat(31),
                email: 'john@test.com',
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path).toContain('username')
        })

        it('should reject missing firstName', () => {
            const result = signupSchema.safeParse({
                lastName: 'Doe',
                email: 'john@test.com',
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('firstName')
        })

        it('should reject missing lastName', () => {
            const result = signupSchema.safeParse({
                firstName: 'John',
                email: 'john@test.com',
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('lastName')
        })

        it(
            'should reject non-alphanumeric firstName',
            () => {
                const result = signupSchema.safeParse({
                    firstName: 'John@123',
                    lastName: 'Doe',
                    email: 'john@test.com',
                    password: 'Password123!'
                })

                expect(result.error).toBeDefined()
                expect(result.error?.issues[0].path)
                    .toContain('firstName')
            }
        )

        it(
            'should reject non-alphanumeric lastName',
            () => {
                const result = signupSchema.safeParse({
                    firstName: 'John',
                    lastName: 'Doe@123',
                    email: 'john@test.com',
                    password: 'Password123!'
                })

                expect(result.error).toBeDefined()
                expect(result.error?.issues[0].path)
                    .toContain('lastName')
            }
        )

        it('should reject missing email', () => {
            const result = signupSchema.safeParse({
                firstName: 'John',
                lastName: 'Doe',
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('email')
        })

        it('should reject invalid email', () => {
            const result = signupSchema.safeParse({
                firstName: 'John',
                lastName: 'Doe',
                email: 'invalid-email',
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('email')
        })

        it('should reject missing password', () => {
            const result = signupSchema.safeParse({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@test.com'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('password')
        })
    })

    // ==================== FORGOT PASSWORD SCHEMA ====================
    describe('forgotPasswordSchema', () => {
        it('should validate correct email', () => {
            const result = forgotPasswordSchema.safeParse({
                email: 'test@test.com'
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject missing email', () => {
            const result = forgotPasswordSchema.safeParse({})

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('email')
        })

        it('should reject invalid email format', () => {
            const result = forgotPasswordSchema.safeParse({
                email: 'invalid-email'
            })

            expect(result.error).toBeDefined()
        })

    })

    // ==================== CONFIRM EMAIL SCHEMA ====================
    describe('confirmEmailSchema', () => {
        it('should validate correct data', () => {
            const result = confirmEmailSchema.safeParse({
                email: 'test@test.com',
                OTP: 123456
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject missing email', () => {
            const result = confirmEmailSchema.safeParse({
                OTP: 123456
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('email')
        })

        it('should reject missing OTP', () => {
            const result = confirmEmailSchema.safeParse({
                email: 'test@test.com'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('OTP')
        })

        it('should reject invalid email', () => {
            const result = confirmEmailSchema.safeParse({
                email: 'invalid-email',
                OTP: 123456
            })

            expect(result.error).toBeDefined()
        })

        it('should accept numeric OTP', () => {
            const result = confirmEmailSchema.safeParse({
                email: 'test@test.com',
                OTP: 999999
            })

            expect(result.error).toBeUndefined()
        })
    })

    // ==================== RESET PASSWORD SCHEMA ====================
    describe('resetPasswordSchema', () => {
        it('should validate correct data', () => {
            const result = resetPasswordSchema.safeParse({
                email: 'test@test.com',
                newPassword: 'NewPassword1',
                userOTP: 123456
            })

            expect(result.error).toBeUndefined()
        })

        it(
            'should validate password with special characters',
            () => {
                const result = resetPasswordSchema.safeParse({
                    email: 'test@test.com',
                    newPassword: 'P@ssword123!',
                    userOTP: 123456
                })

                expect(result.error).toBeUndefined()
            }
        )

        it('should reject missing email', () => {
            const result = resetPasswordSchema.safeParse({
                newPassword: 'NewPassword1',
                userOTP: 123456
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('email')
        })

        it('should reject missing newPassword', () => {
            const result = resetPasswordSchema.safeParse({
                email: 'test@test.com',
                userOTP: 123456
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('newPassword')
        })

        it('should reject missing userOTP', () => {
            const result = resetPasswordSchema.safeParse({
                email: 'test@test.com',
                newPassword: 'NewPassword1'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.issues[0].path)
                .toContain('userOTP')
        })

        it(
            'should reject newPassword shorter than 8 characters',
            () => {
                const result = resetPasswordSchema.safeParse({
                    email: 'test@test.com',
                    newPassword: 'Short1',
                    userOTP: 123456
                })

                expect(result.error).toBeDefined()
                expect(result.error?.issues[0].path)
                    .toContain('newPassword')
            }
        )

        it(
            'should reject password with no digits',
            () => {
                const result = resetPasswordSchema.safeParse({
                    email: 'test@test.com',
                    newPassword: 'NoDigitsHere',
                    userOTP: 123456
                })

                expect(result.error).toBeDefined()
            }
        )

        it(
            'should reject password with no letters',
            () => {
                const result = resetPasswordSchema.safeParse({
                    email: 'test@test.com',
                    newPassword: '12345678',
                    userOTP: 123456
                })

                expect(result.error).toBeDefined()
            }
        )

        it('should reject invalid email', () => {
            const result = resetPasswordSchema.safeParse({
                email: 'invalid-email',
                newPassword: 'NewPassword1',
                userOTP: 123456
            })

            expect(result.error).toBeDefined()
        })
    })
})
