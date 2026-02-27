// @ts-nocheck
import {confirmEmailSchema} from '../../schemas/auth/confirmEmailSchema'
import {forgetPasswordSchema} from '../../schemas/auth/forgetPasswordSchema'
import {loginSchema} from '../../schemas/auth/loginSchema'
import {resetPasswordSchema} from '../../schemas/auth/resetPasswordSchema'
import {signupSchema} from '../../schemas/auth/signupSchema'

describe('Auth Schemas', () => {
    // ==================== LOGIN SCHEMA ====================
    describe('loginSchema', () => {
        it('should validate correct login data', () => {
            const result = loginSchema.validate({
                email: 'test@test.com',
                password: 'Password123!'
            })

            expect(result.error).toBeUndefined()
            expect(result.value).toEqual({
                email: 'test@test.com',
                password: 'Password123!'
            })
        })

        it('should validate with optional remember field', () => {
            const result = loginSchema.validate({
                email: 'test@test.com',
                password: 'Password123!',
                remember: true
            })

            expect(result.error).toBeUndefined()
            expect(result.value.remember).toBe(true)
        })

        it('should reject invalid email format', () => {
            const result = loginSchema.validate({
                email: 'invalid-email',
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('email')
        })

        it('should reject email with invalid TLD', () => {
            const result = loginSchema.validate({
                email: 'test@test.org',
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('email')
        })

        it('should accept email with .com TLD', () => {
            const result = loginSchema.validate({
                email: 'test@example.com',
                password: 'Password123!'
            })

            expect(result.error).toBeUndefined()
        })

        it('should accept email with .net TLD', () => {
            const result = loginSchema.validate({
                email: 'test@example.net',
                password: 'Password123!'
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject missing email', () => {
            const result = loginSchema.validate({
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('email')
        })

        it('should reject missing password', () => {
            const result = loginSchema.validate({
                email: 'test@test.com'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('password')
        })

        it('should reject password shorter than 8 characters', () => {
            const result = loginSchema.validate({
                email: 'test@test.com',
                password: 'Pass1!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('password')
        })

        it('should reject password without required pattern', () => {
            const result = loginSchema.validate({
                email: 'test@test.com',
                password: 'password'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('password')
        })
    })

    // ==================== SIGNUP SCHEMA ====================
    describe('signupSchema', () => {
        it('should validate correct signup data', () => {
            const result = signupSchema.validate({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@test.com',
                password: 'Password123!'
            })

            expect(result.error).toBeUndefined()
        })

        it('should validate with optional username', () => {
            const result = signupSchema.validate({
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                email: 'john@test.com',
                password: 'Password123!'
            })

            expect(result.error).toBeUndefined()
            expect(result.value.username).toBe('johndoe')
        })

        it('should reject missing firstName', () => {
            const result = signupSchema.validate({
                lastName: 'Doe',
                email: 'john@test.com',
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('firstName')
        })

        it('should reject missing lastName', () => {
            const result = signupSchema.validate({
                firstName: 'John',
                email: 'john@test.com',
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('lastName')
        })

        it('should reject non-alphanumeric firstName', () => {
            const result = signupSchema.validate({
                firstName: 'John@123',
                lastName: 'Doe',
                email: 'john@test.com',
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('firstName')
        })

        it('should reject non-alphanumeric lastName', () => {
            const result = signupSchema.validate({
                firstName: 'John',
                lastName: 'Doe@123',
                email: 'john@test.com',
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('lastName')
        })

        it('should reject missing email', () => {
            const result = signupSchema.validate({
                firstName: 'John',
                lastName: 'Doe',
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('email')
        })

        it('should reject invalid email', () => {
            const result = signupSchema.validate({
                firstName: 'John',
                lastName: 'Doe',
                email: 'invalid-email',
                password: 'Password123!'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('email')
        })

        it('should reject missing password', () => {
            const result = signupSchema.validate({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@test.com'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('password')
        })
    })

    // ==================== FORGOT PASSWORD SCHEMA ====================
    describe('forgetPasswordSchema', () => {
        it('should validate correct email', () => {
            const result = forgetPasswordSchema.validate({
                email: 'test@test.com'
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject missing email', () => {
            const result = forgetPasswordSchema.validate({})

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('email')
        })

        it('should reject invalid email format', () => {
            const result = forgetPasswordSchema.validate({
                email: 'invalid-email'
            })

            expect(result.error).toBeDefined()
        })

        it('should reject email with invalid TLD', () => {
            const result = forgetPasswordSchema.validate({
                email: 'test@test.org'
            })

            expect(result.error).toBeDefined()
        })
    })

    // ==================== CONFIRM EMAIL SCHEMA ====================
    describe('confirmEmailSchema', () => {
        it('should validate correct data', () => {
            const result = confirmEmailSchema.validate({
                email: 'test@test.com',
                OTP: 123456
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject missing email', () => {
            const result = confirmEmailSchema.validate({
                OTP: 123456
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('email')
        })

        it('should reject missing OTP', () => {
            const result = confirmEmailSchema.validate({
                email: 'test@test.com'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('OTP')
        })

        it('should reject invalid email', () => {
            const result = confirmEmailSchema.validate({
                email: 'invalid-email',
                OTP: 123456
            })

            expect(result.error).toBeDefined()
        })

        it('should accept numeric OTP', () => {
            const result = confirmEmailSchema.validate({
                email: 'test@test.com',
                OTP: 999999
            })

            expect(result.error).toBeUndefined()
        })
    })

    // ==================== RESET PASSWORD SCHEMA ====================
    describe('resetPasswordSchema', () => {
        it('should validate correct data', () => {
            const result = resetPasswordSchema.validate({
                email: 'test@test.com',
                newPassword: 'NewPassword1',
                userOTP: 123456
            })

            expect(result.error).toBeUndefined()
        })

        it('should reject missing email', () => {
            const result = resetPasswordSchema.validate({
                newPassword: 'NewPassword1',
                userOTP: 123456
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('email')
        })

        it('should reject missing newPassword', () => {
            const result = resetPasswordSchema.validate({
                email: 'test@test.com',
                userOTP: 123456
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('newPassword')
        })

        it('should reject missing userOTP', () => {
            const result = resetPasswordSchema.validate({
                email: 'test@test.com',
                newPassword: 'NewPassword1'
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('userOTP')
        })

        it('should reject newPassword shorter than 8 characters', () => {
            const result = resetPasswordSchema.validate({
                email: 'test@test.com',
                newPassword: 'Short1',
                userOTP: 123456
            })

            expect(result.error).toBeDefined()
            expect(result.error?.details[0].path).toContain('newPassword')
        })

        it('should reject invalid email', () => {
            const result = resetPasswordSchema.validate({
                email: 'invalid-email',
                newPassword: 'NewPassword1',
                userOTP: 123456
            })

            expect(result.error).toBeDefined()
        })
    })
})
